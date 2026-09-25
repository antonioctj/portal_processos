import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { requireAuth, type AuthPayload } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError, NotFoundError } from "../../utils/errors";
import { recordAudit } from "../../audit/audit.service";
import { runProcessAnalysis } from "../../ai/analysis.service";
import { resolveOrgProvider } from "../../ai/aiProviderFactory";
import { recordAiUsage } from "../../ai/aiUsage.service";
import {
  getOrCreateCurrentVersion,
  loadBpmnDraft,
  regenerateXml,
  replaceVersionBpmn,
} from "../../bpmn/bpmn.service";
import type { BpmnDraft } from "../../ai/types";

const router = Router();

const createProcessSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  description: z.string().optional(),
  area: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  department: z.string().optional(),
  objective: z.string().optional(),
  scope: z.string().optional(),
  parentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  category: z.string().optional(),
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, search } = req.query as { status?: string; search?: string };
    const processes = await prisma.process.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        status: status ? (status as never) : undefined,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { gaps: true, opportunities: true } },
      },
    });
    res.json(processes);
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createProcessSchema.parse(req.body);
    const process = await prisma.process.create({
      data: {
        organizationId: req.auth!.organizationId,
        createdById: req.auth!.userId,
        ...input,
      },
    });
    await getOrCreateCurrentVersion(process.id, req.auth!.userId);

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "process",
      entityId: process.id,
      processId: process.id,
    });

    res.status(201).json(process);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: {
        owner: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        documents: { include: { document: true } },
        gaps: true,
        opportunities: true,
      },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const currentVersionDetail = await prisma.processVersion.findFirst({
      where: { processId: process.id, isCurrent: true },
      include: { bpmnVersion: true, elements: true, connections: true },
    });

    res.json({ ...process, currentVersionDetail });
  })
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createProcessSchema.partial().extend({ status: z.string().optional() }).parse(req.body);
    const existing = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Processo não encontrado");

    const process = await prisma.process.update({
      where: { id: existing.id },
      data: { ...input, status: (input.status as never) ?? undefined },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "process",
      entityId: process.id,
      processId: process.id,
      changes: input as never,
    });

    res.json(process);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Processo não encontrado");
    await prisma.process.delete({ where: { id: existing.id } });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "DELETE",
      entity: "process",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

// ── Análise de documento via IA, com progresso em tempo real (Server-Sent Events) ──
router.get(
  "/:id/analyze/stream",
  asyncHandler(async (req, res) => {
    const token = req.query.token as string | undefined;
    if (!token) throw new AppError("Token ausente", 401);
    let auth: AuthPayload;
    try {
      auth = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    } catch {
      throw new AppError("Token inválido", 401);
    }

    const documentId = req.query.documentId as string | undefined;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await runProcessAnalysis({
        organizationId: auth.organizationId,
        userId: auth.userId,
        processId: req.params.id,
        documentId,
        onProgress: async (step, status) => {
          send("progress", { step, status });
        },
      });

      await recordAudit({
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: "ANALYZE",
        entity: "process",
        entityId: req.params.id,
        processId: req.params.id,
        documentId: documentId ?? null,
      });

      send("done", result);
    } catch (err) {
      send("error", { message: err instanceof Error ? err.message : "Erro na análise" });
    } finally {
      res.end();
    }
  })
);

// Fallback sem SSE (execução síncrona) — útil para chamadas programáticas/testes.
router.post(
  "/:id/analyze",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { documentId } = z.object({ documentId: z.string().uuid().optional() }).parse(req.body);
    const result = await runProcessAnalysis({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      processId: req.params.id,
      documentId,
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "ANALYZE",
      entity: "process",
      entityId: req.params.id,
      processId: req.params.id,
      documentId: documentId ?? null,
    });

    res.json(result);
  })
);

router.get(
  "/:id/analysis-results",
  requireAuth,
  asyncHandler(async (req, res) => {
    const results = await prisma.analysisResult.findMany({
      where: { processId: req.params.id },
      orderBy: { startedAt: "desc" },
    });
    res.json(results);
  })
);

// ── Geração automática de processo a partir de descrição textual (seção 13) ──
router.post(
  "/generate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { description } = z.object({ description: z.string().min(4) }).parse(req.body);
    const { provider, record } = await resolveOrgProvider(req.auth!.organizationId);

    const generated = await provider.generateProcess(description);
    await recordAiUsage({
      organizationId: req.auth!.organizationId,
      providerId: record?.id,
      userId: req.auth!.userId,
      purpose: "process_generation",
      model: record?.generationModel ?? undefined,
      inputTokens: generated.usage.inputTokens,
      outputTokens: generated.usage.outputTokens,
    });

    const process = await prisma.process.create({
      data: {
        organizationId: req.auth!.organizationId,
        createdById: req.auth!.userId,
        name: generated.data.overview.name || description.slice(0, 120),
        objective: generated.data.overview.objective,
        scope: generated.data.overview.scope,
        area: generated.data.overview.area,
        status: "DRAFT",
      },
    });
    const version = await getOrCreateCurrentVersion(process.id, req.auth!.userId);

    const bpmn = await provider.generateBPMN(generated.data);
    await recordAiUsage({
      organizationId: req.auth!.organizationId,
      providerId: record?.id,
      userId: req.auth!.userId,
      processId: process.id,
      purpose: "bpmn_generation",
      model: record?.generationModel ?? undefined,
      inputTokens: bpmn.usage.inputTokens,
      outputTokens: bpmn.usage.outputTokens,
    });
    await replaceVersionBpmn(version.id, bpmn.data as BpmnDraft, "AI_SUGGESTION");

    const analysisResult = await prisma.analysisResult.create({
      data: {
        processId: process.id,
        status: "COMPLETED",
        structured: generated.data as never,
        finishedAt: new Date(),
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "GENERATE_BPMN",
      entity: "process",
      entityId: process.id,
      processId: process.id,
    });

    res.status(201).json({ process, analysisResultId: analysisResult.id });
  })
);

// ── Gera/regera o BPMN a partir da última análise estruturada disponível ──
router.post(
  "/:id/generate-bpmn",
  requireAuth,
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const lastAnalysis = await prisma.analysisResult.findFirst({
      where: { processId: process.id, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
    });
    if (!lastAnalysis?.structured) {
      throw new AppError(
        "Nenhuma análise estruturada disponível. Analise um documento ou converse com a IA antes de gerar o BPMN.",
        400
      );
    }

    const { provider, record } = await resolveOrgProvider(req.auth!.organizationId);
    const bpmn = await provider.generateBPMN(lastAnalysis.structured as never);
    await recordAiUsage({
      organizationId: req.auth!.organizationId,
      providerId: record?.id,
      userId: req.auth!.userId,
      processId: process.id,
      purpose: "bpmn_generation",
      model: record?.generationModel ?? undefined,
      inputTokens: bpmn.usage.inputTokens,
      outputTokens: bpmn.usage.outputTokens,
    });

    const version = await getOrCreateCurrentVersion(process.id, req.auth!.userId);
    const bpmnVersion = await replaceVersionBpmn(version.id, bpmn.data as BpmnDraft, "AI_SUGGESTION");

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "GENERATE_BPMN",
      entity: "process",
      entityId: process.id,
      processId: process.id,
    });

    res.json({ bpmnVersion, draft: bpmn.data });
  })
);

// ── Salvar BPMN editado manualmente no modelador visual ──
const draftSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      laneId: z.string().nullable().optional(),
      responsible: z.string().nullable().optional(),
      system: z.string().nullable().optional(),
    })
  ),
  connections: z.array(
    z.object({
      id: z.string(),
      sourceId: z.string(),
      targetId: z.string(),
      label: z.string().nullable().optional(),
      condition: z.string().nullable().optional(),
    })
  ),
});

router.put(
  "/:id/bpmn",
  requireAuth,
  asyncHandler(async (req, res) => {
    const draft = draftSchema.parse(req.body) as BpmnDraft;
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const version = await getOrCreateCurrentVersion(process.id, req.auth!.userId);
    const bpmnVersion = await replaceVersionBpmn(version.id, draft, "MANUAL");

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "bpmn",
      entityId: version.id,
      processId: process.id,
    });

    res.json(bpmnVersion);
  })
);

router.get(
  "/:id/bpmn",
  requireAuth,
  asyncHandler(async (req, res) => {
    const version = await prisma.processVersion.findFirst({
      where: { processId: req.params.id, isCurrent: true },
      include: { bpmnVersion: true },
    });
    if (!version) throw new NotFoundError("Versão do processo não encontrada");
    const draft = await loadBpmnDraft(version.id);
    res.json({ xml: version.bpmnVersion?.xml ?? null, draft });
  })
);

// ── IA como copiloto do BPMN: analisar saúde do processo ──
router.post(
  "/:id/analyze-bpmn",
  requireAuth,
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const version = await getOrCreateCurrentVersion(process.id, req.auth!.userId);
    const draft = await loadBpmnDraft(version.id);
    if (draft.elements.length === 0) {
      throw new AppError("O BPMN está vazio. Gere ou construa o processo antes de analisar.", 400);
    }

    const { provider, record } = await resolveOrgProvider(req.auth!.organizationId);
    const health = await provider.analyzeBPMN(draft);
    await recordAiUsage({
      organizationId: req.auth!.organizationId,
      providerId: record?.id,
      userId: req.auth!.userId,
      processId: process.id,
      purpose: "bpmn_health_check",
      model: record?.analysisModel ?? undefined,
      inputTokens: health.usage.inputTokens,
      outputTokens: health.usage.outputTokens,
    });

    await prisma.bpmnVersion.update({
      where: { processVersionId: version.id },
      data: { healthScore: health.data.score, healthBreakdown: health.data.breakdown as never },
    });
    await prisma.process.update({ where: { id: process.id }, data: { healthScore: health.data.score } });

    res.json(health.data);
  })
);

// ── Versões ──
router.get(
  "/:id/versions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const versions = await prisma.processVersion.findMany({
      where: { processId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } }, bpmnVersion: true },
    });
    res.json(versions);
  })
);

const newVersionSchema = z.object({
  type: z.enum(["AS_IS", "TO_BE"]).default("AS_IS"),
  label: z.string().optional(),
  changelog: z.string().optional(),
  cloneCurrent: z.boolean().default(true),
});

router.post(
  "/:id/versions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = newVersionSchema.parse(req.body);
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const current = await prisma.processVersion.findFirst({
      where: { processId: process.id, isCurrent: true },
    });

    const [major, minor] = (process.currentVersion || "0.1").split(".").map(Number);
    const nextVersion = input.type === "TO_BE" ? `${major + 1}.0` : `${major}.${(minor || 0) + 1}`;

    const version = await prisma.$transaction(async (tx) => {
      if (current) await tx.processVersion.update({ where: { id: current.id }, data: { isCurrent: false } });
      const created = await tx.processVersion.create({
        data: {
          processId: process.id,
          version: nextVersion,
          type: input.type,
          label: input.label,
          changelog: input.changelog,
          isCurrent: true,
          createdById: req.auth!.userId,
        },
      });
      await tx.process.update({ where: { id: process.id }, data: { currentVersion: nextVersion } });
      return created;
    });

    if (input.cloneCurrent && current) {
      const draft = await loadBpmnDraft(current.id);
      await replaceVersionBpmn(version.id, draft, "MANUAL");
    }

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "process_version",
      entityId: version.id,
      processId: process.id,
      version: version.version,
    });

    res.status(201).json(version);
  })
);

router.post(
  "/:id/versions/:versionId/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const target = await prisma.processVersion.findFirst({
      where: { id: req.params.versionId, processId: process.id },
    });
    if (!target) throw new NotFoundError("Versão não encontrada");

    await prisma.$transaction([
      prisma.processVersion.updateMany({ where: { processId: process.id }, data: { isCurrent: false } }),
      prisma.processVersion.update({ where: { id: target.id }, data: { isCurrent: true } }),
      prisma.process.update({ where: { id: process.id }, data: { currentVersion: target.version } }),
    ]);

    await regenerateXml(target.id);

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "process_version",
      entityId: target.id,
      processId: process.id,
      version: target.version,
      changes: { restored: true },
    });

    res.json(target);
  })
);

export default router;
