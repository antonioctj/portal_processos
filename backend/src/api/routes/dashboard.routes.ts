import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const organizationId = req.auth!.organizationId;
    const { processId } = req.query as { processId?: string };

    const processFilter = processId ? { organizationId, id: processId } : { organizationId };
    const scopedFilter = processId ? { organizationId, processId } : { organizationId };

    const [
      totalProcesses,
      inAnalysis,
      completed,
      totalGaps,
      criticalGaps,
      totalOpportunities,
      automationOpportunities,
      latestProcesses,
      latestVersions,
      processesWithHealth,
    ] = await Promise.all([
      prisma.process.count({ where: processFilter }),
      prisma.process.count({ where: { ...processFilter, status: "IN_ANALYSIS" } }),
      prisma.process.count({ where: { ...processFilter, status: { in: ["APPROVED", "PUBLISHED"] } } }),
      prisma.gap.count({ where: scopedFilter }),
      prisma.gap.count({ where: { ...scopedFilter, severity: "CRITICAL", status: { not: "RESOLVED" } } }),
      prisma.opportunity.count({ where: scopedFilter }),
      prisma.opportunity.count({ where: { ...scopedFilter, solutionType: { in: ["AUTOMATION", "RPA"] } } }),
      prisma.process.findMany({
        where: processFilter,
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, status: true, healthScore: true, updatedAt: true },
      }),
      prisma.processVersion.findMany({
        where: processId ? { processId } : { process: { organizationId } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { process: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
      }),
      prisma.process.findMany({
        where: { ...processFilter, healthScore: { not: null } },
        select: { healthScore: true },
      }),
    ]);

    const avgHealth = processesWithHealth.length
      ? Math.round(
          processesWithHealth.reduce((acc, p) => acc + (p.healthScore ?? 0), 0) /
            processesWithHealth.length
        )
      : null;

    res.json({
      cards: {
        totalProcesses,
        inAnalysis,
        completed,
        totalGaps,
        criticalGaps,
        totalOpportunities,
        automationOpportunities,
        avgHealth,
      },
      latestProcesses,
      latestVersions,
    });
  })
);

export default router;
