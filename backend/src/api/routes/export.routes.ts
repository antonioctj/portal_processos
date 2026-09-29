import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError } from "../../utils/errors";
import { regenerateXml } from "../../bpmn/bpmn.service";
import { buildExecutivePdf } from "../../reports/report.service";
import { recordAudit } from "../../audit/audit.service";
import { resolveOrgProvider } from "../../ai/aiProviderFactory";
import { recordAiUsage } from "../../ai/aiUsage.service";
import { getMemoryContext } from "../../memory/memory.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/processes/:id/export/bpmn",
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const version = await prisma.processVersion.findFirst({
      where: { processId: process.id, isCurrent: true },
      include: { bpmnVersion: true },
    });
    if (!version) throw new NotFoundError("Versão do processo não encontrada");

    const bpmnVersion = version.bpmnVersion ?? (await regenerateXml(version.id));

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "EXPORT",
      entity: "process",
      entityId: process.id,
      processId: process.id,
    });

    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${process.code || process.name}.bpmn"`
    );
    res.send(bpmnVersion.xml);
  })
);

router.get(
  "/processes/:id/export/report",
  asyncHandler(async (req, res) => {
    const process = await prisma.process.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!process) throw new NotFoundError("Processo não encontrado");

    const [gaps, opportunities, version] = await Promise.all([
      prisma.gap.findMany({ where: { processId: process.id } }),
      prisma.opportunity.findMany({ where: { processId: process.id } }),
      prisma.processVersion.findFirst({
        where: { processId: process.id, isCurrent: true },
        include: { elements: { select: { name: true, responsible: true, system: true } } },
      }),
    ]);

    let aiSummary: string | null = null;
    try {
      const { provider, record } = await resolveOrgProvider(req.auth!.organizationId);
      const memoryContext = await getMemoryContext(req.auth!.organizationId);
      const summary = await provider.generateReport(
        { process, gaps, opportunities, elements: version?.elements ?? [] },
        memoryContext
      );
      aiSummary = summary.data || null;
      await recordAiUsage({
        organizationId: req.auth!.organizationId,
        providerId: record?.id,
        userId: req.auth!.userId,
        processId: process.id,
        purpose: "report_generation",
        model: record?.generationModel ?? undefined,
        inputTokens: summary.usage.inputTokens,
        outputTokens: summary.usage.outputTokens,
      });
    } catch {
      // Resumo por IA é um complemento opcional; o relatório segue com o texto padrão.
    }

    const pdfBuffer = await buildExecutivePdf({ process, gaps, opportunities, version, aiSummary });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "EXPORT",
      entity: "process",
      entityId: process.id,
      processId: process.id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio-${process.code || process.id}.pdf"`
    );
    res.send(pdfBuffer);
  })
);

export default router;
