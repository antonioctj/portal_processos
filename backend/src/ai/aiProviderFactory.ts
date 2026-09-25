import { prisma } from "../config/prisma";
import { decryptSecret } from "../utils/crypto";
import { AppError } from "../utils/errors";
import { OpenAIProvider } from "./providers/openai.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { LocalProvider } from "./providers/local.provider";
import type { AIProvider } from "./types";
import type { AIProvider as AIProviderRecord } from "@prisma/client";

export function buildProvider(record: AIProviderRecord): AIProvider {
  const apiKey = record.apiKeyEncrypted ? decryptSecret(record.apiKeyEncrypted) : "";
  const config = {
    apiKey,
    endpoint: record.endpoint,
    temperature: record.temperature,
    maxTokens: record.maxTokens,
    analysisModel: record.analysisModel,
    generationModel: record.generationModel,
  };

  switch (record.type) {
    case "OPENAI":
      return new OpenAIProvider(config);
    case "ANTHROPIC":
      return new AnthropicProvider(config);
    case "LOCAL":
      return new LocalProvider();
    default:
      throw new AppError(`Provedor de IA "${record.type}" ainda não implementado`, 501);
  }
}

/** Resolve o provider de IA ativo da organização (padrão explícito, senão o primeiro ativo, senão fallback local). */
export async function resolveOrgProvider(organizationId: string): Promise<{
  provider: AIProvider;
  record: AIProviderRecord | null;
}> {
  const record = await prisma.aIProvider.findFirst({
    where: { organizationId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (!record) {
    return { provider: new LocalProvider(), record: null };
  }

  return { provider: buildProvider(record), record };
}
