import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

interface AuditEntry {
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  processId?: string | null;
  version?: string | null;
  changes?: Prisma.InputJsonValue;
  aiProvider?: string | null;
  aiModel?: string | null;
  tokensUsed?: number | null;
  costEstimate?: number | null;
  documentId?: string | null;
  ip?: string | null;
}

export async function recordAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    // Auditoria nunca deve derrubar a requisição principal.
    logger.error({ err }, "Falha ao registrar log de auditoria");
  }
}
