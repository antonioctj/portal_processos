import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError } from "../../utils/errors";
import { resolveOrgProvider } from "../../ai/aiProviderFactory";
import { recordAiUsage } from "../../ai/aiUsage.service";
import { recordAudit } from "../../audit/audit.service";
import { getOrCreateCurrentVersion, loadBpmnDraft, replaceVersionBpmn } from "../../bpmn/bpmn.service";

const router = Router();
router.use(requireAuth);

async function getOrCreateConversation(processId: string, userId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { processId, userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.conversation.create({ data: { processId, userId } });
}

router.get(
  "/:processId",
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.processId, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const conversation = await getOrCreateConversation(process.id, req.auth!.userId);
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ conversation, messages });
  })
);

const sendMessageSchema = z.object({ content: z.string().min(1) });

router.post(
  "/:processId/messages",
  asyncHandler(async (req, res) => {
    const { content } = sendMessageSchema.parse(req.body);
    const process = await prisma.process.findFirst({
      where: { id: req.params.processId, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const conversation = await getOrCreateConversation(process.id, req.auth!.userId);

    const userMessage = await prisma.message.create({
      data: { conversationId: conversation.id, userId: req.auth!.userId, role: "USER", content },
    });

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const version = await getOrCreateCurrentVersion(process.id, req.auth!.userId);
    const currentDraft = await loadBpmnDraft(version.id);

    const { provider, record } = await resolveOrgProvider(req.auth!.organizationId);
    const reply = await provider.refineBPMN(
      currentDraft,
      content,
      history
        .filter((m) => m.role !== "SYSTEM")
        .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }))
    );

    await recordAiUsage({
      organizationId: req.auth!.organizationId,
      providerId: record?.id,
      userId: req.auth!.userId,
      processId: process.id,
      purpose: "chat",
      model: record?.generationModel ?? undefined,
      inputTokens: reply.usage.inputTokens,
      outputTokens: reply.usage.outputTokens,
    });

    let appliedBpmn = false;
    if (reply.data.updatedBpmn && reply.data.actions.some((a) => a.type !== "NONE")) {
      await replaceVersionBpmn(version.id, reply.data.updatedBpmn, "CHAT");
      appliedBpmn = true;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: reply.data.question ? reply.data.question.text : reply.data.message,
        actions: {
          actions: reply.data.actions,
          question: reply.data.question ?? null,
          appliedBpmn,
        } as never,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: appliedBpmn ? "REFINE_BPMN" : "OTHER",
      entity: "conversation",
      entityId: conversation.id,
      processId: process.id,
      changes: { actions: reply.data.actions } as never,
    });

    res.status(201).json({
      userMessage,
      assistantMessage,
      actions: reply.data.actions,
      question: reply.data.question ?? null,
      appliedBpmn,
    });
  })
);

export default router;
