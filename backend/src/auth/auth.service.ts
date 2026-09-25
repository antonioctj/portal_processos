import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import { signToken } from "../api/middleware/auth";
import { recordAudit } from "../audit/audit.service";
import { sendMail, welcomeEmail } from "../notifications/email.service";

export const registerSchema = z.object({
  organizationName: z.string().min(2, "Nome da organização é obrigatório"),
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("Já existe uma conta com este e-mail", 409);
  }

  const baseSlug = slugify(input.organizationName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.organizationName, slug },
    });
    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
      },
    });
    return { user, organization };
  });

  await recordAudit({
    organizationId: organization.id,
    userId: user.id,
    action: "CREATE",
    entity: "user",
    entityId: user.id,
  });

  await sendMail({ to: user.email, ...welcomeEmail(user.name) });

  const token = signToken({ userId: user.id, organizationId: organization.id, role: user.role });
  return { token, user: sanitizeUser(user), organization };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new AppError("Credenciais inválidas", 401);
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Credenciais inválidas", 401);
  }

  const token = signToken({ userId: user.id, organizationId: user.organizationId, role: user.role });

  await recordAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "LOGIN",
    entity: "user",
    entityId: user.id,
  });

  return { token, user: sanitizeUser(user) };
}

export function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
