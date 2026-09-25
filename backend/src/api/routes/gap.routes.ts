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
    const { processId, status, severity } = req.query as {
      processId?: string;
      status?: string;
      severity?: string;
    };
    const gaps = await prisma.gap.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        processId: processId || undefined,
        status: (status as never) || undefined,
        severity: (severity as never) || undefined,
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: {
        process: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        element: { select: { id: true, name: true } },
      },
    });
    res.json(gaps);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const gap = await prisma.gap.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { process: true, responsible: true, element: true, actions: true },
    });
    if (!gap) throw new NotFoundError("Gap não encontrado");
    res.json(gap);
  })
);

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "ACCEPTED_RISK", "WONT_FIX"]).optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  recommendation: z.string().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.gap.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Gap não encontrado");

    const gap = await prisma.gap.update({
      where: { id: existing.id },
      data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "gap",
      entityId: gap.id,
      processId: gap.processId,
      changes: input as never,
    });

    res.json(gap);
  })
);

export default router;
