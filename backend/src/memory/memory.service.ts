import { MemoryTemplateType } from "@prisma/client";
import { prisma } from "../config/prisma";

const TYPE_LABEL: Record<MemoryTemplateType, string> = {
  DOCUMENT_TEMPLATE: "Modelo de documento final",
  BPMN_PATTERN: "Padrão de fluxo BPMN",
  EXAMPLE_PROCESS: "Exemplo de processo documentado",
};

/**
 * Monta o contexto de "Memória" da organização (modelos de documento, padrões de BPMN,
 * exemplos de processos) para ser injetado nos prompts de geração da IA — mesma técnica
 * do parâmetro `context` já usado em `analyzeDocument`.
 */
export async function getMemoryContext(
  organizationId: string,
  types?: MemoryTemplateType[]
): Promise<string | undefined> {
  const templates = await prisma.memoryTemplate.findMany({
    where: { organizationId, type: types ? { in: types } : undefined },
    orderBy: { createdAt: "desc" },
  });

  if (templates.length === 0) return undefined;

  return templates
    .map((t) => {
      const parts = [`[${TYPE_LABEL[t.type]}] ${t.name}`];
      if (t.description) parts.push(`Descrição: ${t.description}`);
      if (t.content) parts.push(`Conteúdo:\n${t.content}`);
      if (t.storageKey && !t.content) parts.push(`(arquivo de referência anexado: ${t.storageKey.split("-").slice(1).join("-") || t.storageKey})`);
      return parts.join("\n");
    })
    .join("\n---\n");
}
