import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../utils/asyncHandler";
import { login, loginSchema, register, registerSchema } from "../../auth/auth.service";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../../config/prisma";
import { sanitizeUser } from "../../auth/auth.service";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await register(input);
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    res.json(result);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: req.auth!.organizationId },
    });
    res.json({ user: sanitizeUser(user), organization });
  })
);

export default router;
