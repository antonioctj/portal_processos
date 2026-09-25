// Provider local/heurístico — não depende de chamadas externas de IA.
// Serve como fallback funcional (dev/testes/sem chave configurada) e como ponto de
// extensão futuro para modelos locais (ex: Ollama). Segue rigorosamente a regra de
// nunca inventar informação: tudo que não for encontrado por padrão textual simples
// é marcado como "Não identificado no documento" com confidence LOW.
import { randomUUID } from "crypto";
import type {
  AIProvider,
  AIResult,
  BpmnDraft,
  BpmnHealthReport,
  ChatReply,
  ExtractedProcess,
  IdentifiedGap,
  IdentifiedOpportunity,
} from "../types";

const NOT_FOUND = "Não identificado no documento";

function findLine(text: string, keywords: string[]): { value: string | null; evidence: string } {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    for (const kw of keywords) {
      const regex = new RegExp(`${kw}\\s*[:\\-]\\s*(.+)`, "i");
      const match = line.match(regex);
      if (match && match[1].trim()) {
        return { value: match[1].trim(), evidence: line.trim() };
      }
    }
  }
  return { value: null, evidence: NOT_FOUND };
}

function findAllBulletLines(text: string, keywords: string[]): string[] {
  const lines = text.split(/\r?\n/);
  return lines
    .filter((l) => /^\s*[-*\d.]/.test(l) || keywords.some((k) => l.toLowerCase().includes(k)))
    .map((l) => l.replace(/^\s*[-*\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export class LocalProvider implements AIProvider {
  readonly name = "Local (heurístico)";

  async testConnection() {
    return { ok: true, message: "Provider local ativo (sem dependência externa)" };
  }

  async analyzeDocument(text: string): Promise<AIResult<ExtractedProcess>> {
    return this.extractProcess(text);
  }

  async extractProcess(text: string): Promise<AIResult<ExtractedProcess>> {
    const name = findLine(text, ["processo", "nome do processo"]);
    const objective = findLine(text, ["objetivo"]);
    const scope = findLine(text, ["escopo"]);
    const area = findLine(text, ["área responsável", "área"]);
    const owner = findLine(text, ["dono do processo", "responsável pelo processo"]);

    const activityLines = findAllBulletLines(text, ["etapa", "atividade", "passo"]);
    const systems = Array.from(
      new Set((text.match(/sistema\s+([A-Z][\w-]{1,30})/gi) || []).map((s) => s.trim()))
    );

    const data: ExtractedProcess = {
      overview: {
        name: name.value,
        objective: objective.value,
        scope: scope.value,
        start: null,
        end: null,
        area: area.value,
        owner: owner.value,
      },
      inputs: [],
      activities: activityLines.map((line) => ({
        name: line.slice(0, 120),
        description: null,
        responsible: null,
        area: null,
        system: null,
        input: null,
        output: null,
        estimatedTime: null,
        frequency: null,
        rule: null,
        isManual: null,
        confidence: "LOW" as const,
        evidence: line,
      })),
      outputs: [],
      decisions: [],
      exceptions: [],
      systems,
      rules: [],
    };

    return { data, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async identifyGaps(process: ExtractedProcess): Promise<AIResult<IdentifiedGap[]>> {
    const gaps: IdentifiedGap[] = [];
    for (const activity of process.activities) {
      if (!activity.responsible) {
        gaps.push({
          category: "MISSING_RESPONSIBLE",
          description: `Atividade "${activity.name}" não possui responsável definido`,
          evidence: activity.evidence,
          relatedElement: activity.name,
          impact: "Pode gerar ambiguidade sobre quem executa a etapa",
          severity: "MEDIUM",
          recommendation: "Definir explicitamente o responsável pela atividade",
          confidence: "MEDIUM",
        });
      }
      if (!activity.system) {
        gaps.push({
          category: "MISSING_SYSTEM",
          description: `Atividade "${activity.name}" não possui sistema definido`,
          evidence: activity.evidence,
          relatedElement: activity.name,
          impact: "Dificulta identificar oportunidades de automação",
          severity: "LOW",
          recommendation: "Registrar o sistema utilizado, se houver",
          confidence: "LOW",
        });
      }
    }
    return { data: gaps, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async identifyOpportunities(
    process: ExtractedProcess
  ): Promise<AIResult<IdentifiedOpportunity[]>> {
    const opportunities: IdentifiedOpportunity[] = [];
    const manualActivities = process.activities.filter((a) => a.isManual !== false);
    if (manualActivities.length >= 3) {
      opportunities.push({
        title: "Avaliar automação de etapas manuais",
        description: `Foram identificadas ${manualActivities.length} atividades potencialmente manuais que podem ser candidatas à automação.`,
        affectedStep: manualActivities.map((a) => a.name).join(", "),
        currentProblem: "Execução manual sujeita a variação e retrabalho",
        benefit: "Redução de tempo e erros",
        complexity: "MEDIUM",
        dependencies: null,
        systemsInvolved: process.systems.join(", ") || null,
        solutionType: "AUTOMATION",
        evidence: "Heurística local baseada na ausência de indicação de sistema/automação",
        confidence: "LOW",
      });
    }
    return { data: opportunities, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async generateProcess(description: string): Promise<AIResult<ExtractedProcess>> {
    return {
      data: {
        overview: {
          name: description.slice(0, 120),
          objective: NOT_FOUND,
          scope: NOT_FOUND,
          start: null,
          end: null,
          area: null,
          owner: null,
        },
        inputs: [],
        activities: [],
        outputs: [],
        decisions: [],
        exceptions: [],
        systems: [],
        rules: [],
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async generateBPMN(process: ExtractedProcess): Promise<AIResult<BpmnDraft>> {
    const startId = `start_${randomUUID().slice(0, 6)}`;
    const endId = `end_${randomUUID().slice(0, 6)}`;
    const elements: BpmnDraft["elements"] = [
      { id: startId, type: "START_EVENT", name: "Início" },
    ];
    const connections: BpmnDraft["connections"] = [];
    let previous = startId;
    process.activities.forEach((activity, idx) => {
      const id = `task_${idx}_${randomUUID().slice(0, 6)}`;
      elements.push({
        id,
        type: "TASK",
        name: activity.name,
        responsible: activity.responsible,
        system: activity.system,
      });
      connections.push({ id: `flow_${previous}_${id}`, sourceId: previous, targetId: id });
      previous = id;
    });
    elements.push({ id: endId, type: "END_EVENT", name: "Fim" });
    connections.push({ id: `flow_${previous}_${endId}`, sourceId: previous, targetId: endId });
    return { data: { elements, connections }, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async refineBPMN(currentBpmn: BpmnDraft, instruction: string): Promise<AIResult<ChatReply>> {
    const reply: ChatReply = {
      message: `Provider local ativo: não é possível interpretar instruções em linguagem natural sem um provedor de IA configurado (OpenAI/Anthropic). Instrução recebida: "${instruction}".`,
      actions: [],
      updatedBpmn: currentBpmn,
    };
    return { data: reply, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async analyzeBPMN(bpmn: BpmnDraft): Promise<AIResult<BpmnHealthReport>> {
    const hasStart = bpmn.elements.some((e) => e.type === "START_EVENT");
    const hasEnd = bpmn.elements.some((e) => e.type === "END_EVENT");
    const connectedIds = new Set(bpmn.connections.flatMap((c) => [c.sourceId, c.targetId]));
    const disconnected = bpmn.elements.filter((e) => !connectedIds.has(e.id));
    const withoutResponsible = bpmn.elements.filter(
      (e) => e.type !== "START_EVENT" && e.type !== "END_EVENT" && !e.responsible
    );

    const completeness = hasStart && hasEnd ? 80 : 40;
    const responsibilities =
      bpmn.elements.length > 0
        ? Math.round(100 - (withoutResponsible.length / bpmn.elements.length) * 100)
        : 100;

    const findings: string[] = [];
    if (!hasStart) findings.push("Fluxo sem evento de início");
    if (!hasEnd) findings.push("Fluxo sem evento de fim");
    if (disconnected.length) findings.push(`${disconnected.length} elemento(s) desconectado(s)`);
    if (withoutResponsible.length)
      findings.push(`${withoutResponsible.length} atividade(s) sem responsável definido`);

    const breakdown = {
      completeness,
      clarity: disconnected.length === 0 ? 80 : 50,
      control: 60,
      automation: 50,
      responsibilities,
      exceptions: 50,
      risks: 60,
    };
    const score = Math.round(
      Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.values(breakdown).length
    );

    return {
      data: {
        score,
        breakdown,
        findings,
        criteria:
          "Cálculo heurístico local (provider sem IA configurada): considera presença de início/fim, elementos desconectados e responsáveis definidos.",
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async generateReport(): Promise<AIResult<string>> {
    return {
      data: "# Relatório executivo\n\nConfigure um provedor de IA (OpenAI ou Anthropic) em Configurações > APIs de IA para gerar o relatório executivo completo.",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
