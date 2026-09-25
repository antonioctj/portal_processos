import OpenAI from "openai";
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

export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";
  private client: OpenAI;
  private analysisModel: string;
  private generationModel: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.endpoint || undefined });
    this.analysisModel = config.analysisModel || "gpt-4o-mini";
    this.generationModel = config.generationModel || "gpt-4o";
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  private async complete(system: string, user: string, model: string): Promise<AIResult<string>> {
    const response = await this.client.chat.completions.create({
      model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    return {
      data: content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async testConnection() {
    try {
      await this.client.models.list();
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
    const response = await this.client.chat.completions.create({
      model: this.generationModel,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const content = response.choices[0]?.message?.content ?? "";
    return {
      data: content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro desconhecido ao testar conexão";
}
