import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAudit } from "../../audit/audit.service";
import { NotFoundError } from "../../utils/errors";

const router = Router();
router.use(requireAuth);

async function findProcessOrThrow(processId: string, organizationId: string) {
  const process = await prisma.process.findFirst({ where: { id: processId, organizationId } });
  if (!process) throw new NotFoundError("Processo não encontrado");
  return process;
}

router.get(
  "/processes/:processId/rules",
  asyncHandler(async (req, res) => {
    await findProcessOrThrow(req.params.processId, req.auth!.organizationId);
    const rules = await prisma.processRule.findMany({
      where: { processId: req.params.processId },
      orderBy: { createdAt: "asc" },
    });
    res.json(rules);
  })
);

const upsertSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

router.post(
  "/processes/:processId/rules",
  asyncHandler(async (req, res) => {
    await findProcessOrThrow(req.params.processId, req.auth!.organizationId);
    const input = upsertSchema.parse(req.body);

    const rule = await prisma.processRule.create({
      data: {
        processId: req.params.processId,
        title: input.title,
        description: input.description,
        createdById: req.auth!.userId,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "process_rule",
      entityId: rule.id,
      processId: req.params.processId,
    });

    res.status(201).json(rule);
  })
);

router.patch(
  "/rules/:id",
  asyncHandler(async (req, res) => {
    const input = upsertSchema.partial().parse(req.body);
    const existing = await prisma.processRule.findFirst({
      where: { id: req.params.id, process: { organizationId: req.auth!.organizationId } },
    });
    if (!existing) throw new NotFoundError("Regra não encontrada");

    const rule = await prisma.processRule.update({
      where: { id: existing.id },
      data: { title: input.title, description: input.description },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "process_rule",
      entityId: rule.id,
      processId: existing.processId,
    });

    res.json(rule);
  })
);

router.delete(
  "/rules/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.processRule.findFirst({
      where: { id: req.params.id, process: { organizationId: req.auth!.organizationId } },
    });
    if (!existing) throw new NotFoundError("Regra não encontrada");
    await prisma.processRule.delete({ where: { id: existing.id } });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "DELETE",
      entity: "process_rule",
      entityId: existing.id,
      processId: existing.processId,
    });

    res.status(204).send();
  })
);

export default router;
