import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";
import { sanitizeUser } from "../../auth/auth.service";
import { recordAudit } from "../../audit/audit.service";
import { sendMail, userInvitedEmail } from "../../notifications/email.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(users.map(sanitizeUser));
  })
);

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "ANALYST", "VIEWER"]).default("ANALYST"),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("Já existe um usuário com este e-mail", 409);

    const temporaryPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: req.auth!.organizationId },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
      },
    });

    await sendMail({ to: user.email, ...userInvitedEmail(user.name, organization.name, temporaryPassword) });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "user",
      entityId: user.id,
    });

    res.status(201).json(sanitizeUser(user));
  })
);

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "ANALYST", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new AppError("Usuário não encontrado", 404);

    const user = await prisma.user.update({ where: { id: existing.id }, data: input });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "user",
      entityId: user.id,
      changes: input as never,
    });

    res.json(sanitizeUser(user));
  })
);

export default router;
