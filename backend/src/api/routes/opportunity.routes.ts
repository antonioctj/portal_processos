import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { NotFoundError } from "../../utils/errors";
import { recordAudit } from "../../audit/audit.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { processId, status, solutionType } = req.query as {
      processId?: string;
      status?: string;
      solutionType?: string;
    };
    const opportunities = await prisma.opportunity.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        processId: processId || undefined,
        status: (status as never) || undefined,
        solutionType: (solutionType as never) || undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        process: { select: { id: true, name: true } },
        element: { select: { id: true, name: true } },
      },
    });
    res.json(opportunities);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { process: true, element: true, actions: true },
    });
    if (!opportunity) throw new NotFoundError("Oportunidade não encontrada");
    res.json(opportunity);
  })
);

const updateSchema = z.object({
  status: z
    .enum(["IDENTIFIED", "UNDER_EVALUATION", "APPROVED", "IN_PROGRESS", "IMPLEMENTED", "REJECTED"])
    .optional(),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.opportunity.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Oportunidade não encontrada");

    const opportunity = await prisma.opportunity.update({
      where: { id: existing.id },
      data: input,
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "opportunity",
      entityId: opportunity.id,
      processId: opportunity.processId,
      changes: input as never,
    });

    res.json(opportunity);
  })
);

export default router;
