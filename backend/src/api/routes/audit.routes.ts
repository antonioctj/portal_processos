import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/logs",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { processId, limit } = req.query as { processId?: string; limit?: string };
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        processId: processId || undefined,
      },
      orderBy: { createdAt: "desc" },
      take: limit ? Number(limit) : 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(logs);
  })
);

router.get(
  "/ai-usage",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const usage = await prisma.aIUsage.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        provider: { select: { id: true, label: true, type: true } },
      },
    });

    const totals = usage.reduce(
      (acc, u) => {
        acc.requests += 1;
        acc.inputTokens += u.inputTokens;
        acc.outputTokens += u.outputTokens;
        acc.costEstimate += u.costEstimate;
        return acc;
      },
      { requests: 0, inputTokens: 0, outputTokens: 0, costEstimate: 0 }
    );

    const byModel: Record<string, { requests: number; costEstimate: number }> = {};
    for (const u of usage) {
      const key = u.model ?? "desconhecido";
      byModel[key] = byModel[key] ?? { requests: 0, costEstimate: 0 };
      byModel[key].requests += 1;
      byModel[key].costEstimate += u.costEstimate;
    }

    res.json({ usage, totals, byModel });
  })
);

export default router;
