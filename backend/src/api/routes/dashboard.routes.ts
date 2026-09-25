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
      prisma.process.count({ where: { organizationId } }),
      prisma.process.count({ where: { organizationId, status: "IN_ANALYSIS" } }),
      prisma.process.count({ where: { organizationId, status: { in: ["APPROVED", "PUBLISHED"] } } }),
      prisma.gap.count({ where: { organizationId } }),
      prisma.gap.count({ where: { organizationId, severity: "CRITICAL", status: { not: "RESOLVED" } } }),
      prisma.opportunity.count({ where: { organizationId } }),
      prisma.opportunity.count({ where: { organizationId, solutionType: { in: ["AUTOMATION", "RPA"] } } }),
      prisma.process.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true, status: true, healthScore: true, updatedAt: true },
      }),
      prisma.processVersion.findMany({
        where: { process: { organizationId } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { process: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
      }),
      prisma.process.findMany({
        where: { organizationId, healthScore: { not: null } },
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
