import { AppError } from "../../utils/errors";

/** Remove eventuais cercas de código markdown (```json ... ```) que os modelos às vezes retornam. */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();
  return trimmed;
}

export function parseJsonOrThrow<T>(raw: string, context: string): T {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (err) {
    throw new AppError(
      `Falha ao interpretar resposta da IA (${context}). Tente novamente.`,
      502,
      { raw: raw.slice(0, 2000) }
    );
  }
}

/** Prefixa a mensagem do usuário com os padrões/modelos de Memória da organização, quando houver. */
export function withMemoryContext(user: string, memoryContext?: string): string {
  if (!memoryContext) return user;
  return `Padrões e modelos da organização a seguir (Memória):\n${memoryContext}\n\n${user}`;
}
