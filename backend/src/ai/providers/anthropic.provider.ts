import Anthropic from "@anthropic-ai/sdk";
import { PROMPTS } from "../prompts";
import { parseJsonOrThrow } from "./base";
import type {
  AIProvider,
  AIProviderConfig,
  AIResult,
  BpmnDraft,
  BpmnHealthReport,
  ChatReply,
  ExtractedProcess,
  IdentifiedGap,
  IdentifiedOpportunity,
} from "../types";

const JSON_ONLY_SUFFIX =
  "\n\nResponda APENAS com o JSON solicitado, sem nenhum texto antes ou depois, sem markdown.";

export class AnthropicProvider implements AIProvider {
  readonly name = "Anthropic";
  private client: Anthropic;
  private analysisModel: string;
  private generationModel: string;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey, baseURL: config.endpoint || undefined });
    this.analysisModel = config.analysisModel || "claude-haiku-4-5-20251001";
    this.generationModel = config.generationModel || "claude-sonnet-5";
    this.maxTokens = config.maxTokens ?? 4096;
  }

  private async complete(system: string, user: string, model: string): Promise<AIResult<string>> {
    const response = await this.client.messages.create({
      model,
      max_tokens: this.maxTokens,
      system: system + JSON_ONLY_SUFFIX,
      messages: [{ role: "user", content: user }],
    });
    const block = response.content.find((c) => c.type === "text");
    const text = block && block.type === "text" ? block.text : "{}";
    return {
      data: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async testConnection() {
    try {
      await this.client.messages.create({
        model: this.analysisModel,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      });
      return { ok: true, message: "Conexão realizada com sucesso" };
    } catch (err) {
      return { ok: false, message: errorMessage(err) };
    }
  }

  async analyzeDocument(text: string, context?: string): Promise<AIResult<ExtractedProcess>> {
    const prompt = PROMPTS.documentAnalysis;
    const user = context
      ? `Contexto adicional: ${context}\n\nTexto do documento:\n${text}`
      : `Texto do documento:\n${text}`;
    const result = await this.complete(prompt.system, user, this.analysisModel);
    return { data: parseJsonOrThrow(result.data, "analyzeDocument"), usage: result.usage };
  }

  async extractProcess(text: string): Promise<AIResult<ExtractedProcess>> {
    const prompt = PROMPTS.extractProcess;
    const result = await this.complete(prompt.system, text, this.analysisModel);
    return { data: parseJsonOrThrow(result.data, "extractProcess"), usage: result.usage };
  }

  async identifyGaps(process: ExtractedProcess): Promise<AIResult<IdentifiedGap[]>> {
    const prompt = PROMPTS.identifyGaps;
    const result = await this.complete(
      prompt.system,
      JSON.stringify(process),
      this.analysisModel
    );
    const parsed = parseJsonOrThrow<{ gaps: IdentifiedGap[] }>(result.data, "identifyGaps");
    return { data: parsed.gaps ?? [], usage: result.usage };
  }

  async identifyOpportunities(
    process: ExtractedProcess
  ): Promise<AIResult<IdentifiedOpportunity[]>> {
    const prompt = PROMPTS.identifyOpportunities;
    const result = await this.complete(
      prompt.system,
      JSON.stringify(process),
      this.analysisModel
    );
    const parsed = parseJsonOrThrow<{ opportunities: IdentifiedOpportunity[] }>(
      result.data,
      "identifyOpportunities"
    );
    return { data: parsed.opportunities ?? [], usage: result.usage };
  }

  async generateProcess(description: string): Promise<AIResult<ExtractedProcess>> {
    const prompt = PROMPTS.generateProcess;
    const result = await this.complete(prompt.system, description, this.generationModel);
    return { data: parseJsonOrThrow(result.data, "generateProcess"), usage: result.usage };
  }

  async generateBPMN(process: ExtractedProcess): Promise<AIResult<BpmnDraft>> {
    const prompt = PROMPTS.generateBpmn;
    const result = await this.complete(
      prompt.system,
      JSON.stringify(process),
      this.generationModel
    );
    return { data: parseJsonOrThrow(result.data, "generateBPMN"), usage: result.usage };
  }

  async refineBPMN(
    currentBpmn: BpmnDraft,
    instruction: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[]
  ): Promise<AIResult<ChatReply>> {
    const prompt = PROMPTS.refineBpmn;
    const historyText = conversationHistory
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");
    const user = `BPMN atual:\n${JSON.stringify(currentBpmn)}\n\nHistórico da conversa:\n${historyText}\n\nNova instrução do usuário:\n${instruction}`;
    const result = await this.complete(prompt.system, user, this.generationModel);
    return { data: parseJsonOrThrow(result.data, "refineBPMN"), usage: result.usage };
  }

  async analyzeBPMN(bpmn: BpmnDraft): Promise<AIResult<BpmnHealthReport>> {
    const prompt = PROMPTS.analyzeBpmn;
    const result = await this.complete(prompt.system, JSON.stringify(bpmn), this.analysisModel);
    return { data: parseJsonOrThrow(result.data, "analyzeBPMN"), usage: result.usage };
  }

  async generateReport(payload: Record<string, unknown>): Promise<AIResult<string>> {
    const prompt = PROMPTS.executiveReport;
    const response = await this.client.messages.create({
      model: this.generationModel,
      max_tokens: this.maxTokens,
      system: prompt.system,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const block = response.content.find((c) => c.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    return {
      data: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro desconhecido ao testar conexão";
}
