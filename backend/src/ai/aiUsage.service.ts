import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

// Preços aproximados (USD por 1K tokens). Ajustável futuramente via tabela ai_models.
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-5": { input: 0.003, output: 0.015 },
  "claude-haiku-4-5-20251001": { input: 0.0008, output: 0.004 },
};

function estimateCost(model: string | undefined, inputTokens: number, outputTokens: number) {
  if (!model) return 0;
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

interface RecordUsageInput {
  organizationId: string;
  providerId?: string | null;
  userId?: string | null;
  processId?: string | null;
  purpose: string;
  model?: string | null;
  inputTokens: number;
  outputTokens: number;
}

export async function recordAiUsage(input: RecordUsageInput) {
  const costEstimate = estimateCost(input.model ?? undefined, input.inputTokens, input.outputTokens);
  try {
    await prisma.aIUsage.create({
      data: {
        organizationId: input.organizationId,
        providerId: input.providerId ?? null,
        userId: input.userId ?? null,
        processId: input.processId ?? null,
        purpose: input.purpose,
        model: input.model ?? null,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costEstimate,
      },
    });
  } catch (err) {
    logger.error({ err }, "Falha ao registrar uso de IA");
  }
  return costEstimate;
}
