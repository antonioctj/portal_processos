import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { UnauthorizedError, ForbiddenError } from "../../utils/errors";
import type { UserRole } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de autenticação ausente");
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    throw new UnauthorizedError("Token inválido ou expirado");
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw new UnauthorizedError();
    if (!roles.includes(req.auth.role)) {
      throw new ForbiddenError("Você não tem permissão para executar esta ação");
    }
    next();
  };
}
