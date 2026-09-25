import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { encryptSecret, maskApiKey, last4 } from "../../utils/crypto";
import { buildProvider } from "../../ai/aiProviderFactory";
import { recordAudit } from "../../audit/audit.service";
import { NotFoundError } from "../../utils/errors";

const router = Router();
router.use(requireAuth);

const upsertSchema = z.object({
  type: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "AZURE_OPENAI", "LOCAL", "OTHER"]),
  label: z.string().min(1),
  apiKey: z.string().optional(), // se omitido em update, mantém a chave atual
  endpoint: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(256).max(128000).optional(),
  analysisModel: z.string().optional().nullable(),
  generationModel: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

function serialize(record: Awaited<ReturnType<typeof prisma.aIProvider.findFirstOrThrow>>) {
  return {
    id: record.id,
    type: record.type,
    label: record.label,
    apiKeyMasked: record.apiKeyLast4 ? `••••••••••••${record.apiKeyLast4}` : null,
    endpoint: record.endpoint,
    temperature: record.temperature,
    maxTokens: record.maxTokens,
    analysisModel: record.analysisModel,
    generationModel: record.generationModel,
    isActive: record.isActive,
    isDefault: record.isDefault,
    lastTestedAt: record.lastTestedAt,
    lastTestOk: record.lastTestOk,
    createdAt: record.createdAt,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const providers = await prisma.aIProvider.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(providers.map(serialize));
  })
);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const input = upsertSchema.parse(req.body);

    if (input.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { organizationId: req.auth!.organizationId },
        data: { isDefault: false },
      });
    }

    const record = await prisma.aIProvider.create({
      data: {
        organizationId: req.auth!.organizationId,
        type: input.type,
        label: input.label,
        apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : null,
        apiKeyLast4: input.apiKey ? last4(input.apiKey) : null,
        endpoint: input.endpoint,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        analysisModel: input.analysisModel,
        generationModel: input.generationModel,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "ai_provider",
      entityId: record.id,
    });

    res.status(201).json(serialize(record));
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const input = upsertSchema.partial().parse(req.body);
    const existing = await prisma.aIProvider.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Provedor de IA não encontrado");

    if (input.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { organizationId: req.auth!.organizationId },
        data: { isDefault: false },
      });
    }

    const record = await prisma.aIProvider.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        label: input.label,
        ...(input.apiKey
          ? { apiKeyEncrypted: encryptSecret(input.apiKey), apiKeyLast4: last4(input.apiKey) }
          : {}),
        endpoint: input.endpoint,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        analysisModel: input.analysisModel,
        generationModel: input.generationModel,
        isActive: input.isActive,
        isDefault: input.isDefault,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "UPDATE",
      entity: "ai_provider",
      entityId: record.id,
    });

    res.json(serialize(record));
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.aIProvider.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Provedor de IA não encontrado");
    await prisma.aIProvider.delete({ where: { id: existing.id } });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "DELETE",
      entity: "ai_provider",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

router.post(
  "/:id/test",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.aIProvider.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Provedor de IA não encontrado");

    const provider = buildProvider(existing);
    const result = await provider.testConnection();

    await prisma.aIProvider.update({
      where: { id: existing.id },
      data: { lastTestedAt: new Date(), lastTestOk: result.ok },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "TEST_CONNECTION",
      entity: "ai_provider",
      entityId: existing.id,
    });

    res.json(result);
  })
);

export default router;
