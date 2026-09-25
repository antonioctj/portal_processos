import { AnalysisStep, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { resolveOrgProvider } from "./aiProviderFactory";
import { recordAiUsage } from "./aiUsage.service";
import { getDocumentFullText } from "../documents/document.service";
import { toConfidence, toGapCategory, toOpportunityType, toSeverity, toComplexity } from "./enumMapping";
import { NotFoundError } from "../utils/errors";
import type { ExtractedProcess } from "./types";

export const ANALYSIS_STEPS: AnalysisStep[] = [
  "EXTRACTING_CONTENT",
  "IDENTIFYING_CONTEXT",
  "IDENTIFYING_PROCESS",
  "IDENTIFYING_ACTIVITIES",
  "IDENTIFYING_RESPONSIBLES",
  "IDENTIFYING_INPUTS",
  "IDENTIFYING_OUTPUTS",
  "IDENTIFYING_DECISIONS",
  "IDENTIFYING_RULES",
  "IDENTIFYING_EXCEPTIONS",
  "IDENTIFYING_SYSTEMS",
  "IDENTIFYING_GAPS",
  "IDENTIFYING_OPPORTUNITIES",
];

type ProgressCallback = (step: AnalysisStep, status: "RUNNING" | "COMPLETED") => void | Promise<void>;

interface RunAnalysisInput {
  organizationId: string;
  userId: string;
  processId: string;
  documentId?: string;
  onProgress?: ProgressCallback;
}

export async function runProcessAnalysis(input: RunAnalysisInput) {
  const process = await prisma.process.findFirst({
    where: { id: input.processId, organizationId: input.organizationId },
  });
  if (!process) throw new NotFoundError("Processo não encontrado");

  const analysisResult = await prisma.analysisResult.create({
    data: {
      processId: process.id,
      documentId: input.documentId ?? null,
      status: "RUNNING",
      currentStep: "EXTRACTING_CONTENT",
      stepsLog: [],
    },
  });

  const stepsLog: { step: AnalysisStep; status: string; at: string }[] = [];
  const emit = async (step: AnalysisStep, status: "RUNNING" | "COMPLETED") => {
    stepsLog.push({ step, status, at: new Date().toISOString() });
    await prisma.analysisResult.update({
      where: { id: analysisResult.id },
      data: { currentStep: step, stepsLog: stepsLog as unknown as Prisma.InputJsonValue },
    });
    await input.onProgress?.(step, status);
  };

  try {
    const { provider, record } = await resolveOrgProvider(input.organizationId);

    await emit("EXTRACTING_CONTENT", "RUNNING");
    const text = input.documentId ? await getDocumentFullText(input.documentId) : "";
    if (input.documentId && !text.trim()) {
      throw new Error("Não foi possível extrair conteúdo textual do documento");
    }
    await emit("EXTRACTING_CONTENT", "COMPLETED");

    await emit("IDENTIFYING_CONTEXT", "RUNNING");
    const analysisCall = await provider.analyzeDocument(text);
    const extracted = analysisCall.data;
    await recordAiUsage({
      organizationId: input.organizationId,
      providerId: record?.id,
      userId: input.userId,
      processId: process.id,
      purpose: "document_analysis",
      model: record?.analysisModel ?? undefined,
      inputTokens: analysisCall.usage.inputTokens,
      outputTokens: analysisCall.usage.outputTokens,
    });
    await emit("IDENTIFYING_CONTEXT", "COMPLETED");

    // As etapas abaixo já vêm resolvidas na mesma chamada estruturada (analyzeDocument),
    // mas são sinalizadas individualmente para refletir o progresso ao usuário.
    for (const step of [
      "IDENTIFYING_PROCESS",
      "IDENTIFYING_ACTIVITIES",
      "IDENTIFYING_RESPONSIBLES",
      "IDENTIFYING_INPUTS",
      "IDENTIFYING_OUTPUTS",
      "IDENTIFYING_DECISIONS",
      "IDENTIFYING_RULES",
      "IDENTIFYING_EXCEPTIONS",
      "IDENTIFYING_SYSTEMS",
    ] as AnalysisStep[]) {
      await emit(step, "RUNNING");
      await emit(step, "COMPLETED");
    }

    await emit("IDENTIFYING_GAPS", "RUNNING");
    const gapsCall = await provider.identifyGaps(extracted);
    await recordAiUsage({
      organizationId: input.organizationId,
      providerId: record?.id,
      userId: input.userId,
      processId: process.id,
      purpose: "gap_detection",
      model: record?.analysisModel ?? undefined,
      inputTokens: gapsCall.usage.inputTokens,
      outputTokens: gapsCall.usage.outputTokens,
    });
    await emit("IDENTIFYING_GAPS", "COMPLETED");

    await emit("IDENTIFYING_OPPORTUNITIES", "RUNNING");
    const opportunitiesCall = await provider.identifyOpportunities(extracted);
    await recordAiUsage({
      organizationId: input.organizationId,
      providerId: record?.id,
      userId: input.userId,
      processId: process.id,
      purpose: "opportunity_detection",
      model: record?.analysisModel ?? undefined,
      inputTokens: opportunitiesCall.usage.inputTokens,
      outputTokens: opportunitiesCall.usage.outputTokens,
    });
    await emit("IDENTIFYING_OPPORTUNITIES", "COMPLETED");

    const sourceRef = input.documentId ? `Documento (id ${input.documentId})` : "Análise IA";

    const [gaps, opportunities] = await prisma.$transaction(async (tx) => {
      const createdGaps = await Promise.all(
        gapsCall.data.map((g) =>
          tx.gap.create({
            data: {
              organizationId: input.organizationId,
              processId: process.id,
              category: toGapCategory(g.category),
              description: g.description,
              evidence: g.evidence,
              impact: g.impact,
              severity: toSeverity(g.severity),
              recommendation: g.recommendation,
              confidence: toConfidence(g.confidence),
              sourceType: "AI_SUGGESTION",
              sourceRef: g.relatedElement ? `${sourceRef} — ${g.relatedElement}` : sourceRef,
            },
          })
        )
      );
      const createdOpportunities = await Promise.all(
        opportunitiesCall.data.map((o) =>
          tx.opportunity.create({
            data: {
              organizationId: input.organizationId,
              processId: process.id,
              title: o.title,
              description: o.description,
              currentProblem: o.currentProblem,
              benefit: o.benefit,
              complexity: toComplexity(o.complexity),
              dependencies: o.dependencies,
              systemsInvolved: o.systemsInvolved,
              solutionType: toOpportunityType(o.solutionType),
              evidence: o.evidence,
              confidence: toConfidence(o.confidence),
              sourceType: "AI_SUGGESTION",
              sourceRef: o.affectedStep ? `${sourceRef} — ${o.affectedStep}` : sourceRef,
            },
          })
        )
      );
      return [createdGaps, createdOpportunities] as const;
    });

    await prisma.process.update({
      where: { id: process.id },
      data: {
        objective: process.objective ?? extracted.overview.objective ?? undefined,
        scope: process.scope ?? extracted.overview.scope ?? undefined,
        area: process.area ?? extracted.overview.area ?? undefined,
        status: "IN_REVIEW",
      },
    });

    await prisma.analysisResult.update({
      where: { id: analysisResult.id },
      data: {
        status: "COMPLETED",
        structured: extracted as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    return { analysisResultId: analysisResult.id, extracted, gaps, opportunities };
  } catch (err) {
    await prisma.analysisResult.update({
      where: { id: analysisResult.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido na análise",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

export type { ExtractedProcess };
