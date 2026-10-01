import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Card, ConfidenceBadge, EmptyState, Select, SeverityBadge, Spinner } from "../../components/ui";
import { ProcessSelector } from "../../components/ProcessSelector";
import { useSelectedProcess } from "../../store/SelectedProcessContext";
import type { Gap, GapStatus, Opportunity, OpportunityStatus } from "../../types/api";

const GAP_STATUS_OPTIONS: { value: GapStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "RESOLVED", label: "Resolvido" },
  { value: "ACCEPTED_RISK", label: "Risco aceito" },
  { value: "WONT_FIX", label: "Não será corrigido" },
];

const GAP_CATEGORY_LABEL: Record<string, string> = {
  MISSING_RESPONSIBLE: "Sem responsável",
  MISSING_INPUT: "Sem entrada",
  MISSING_OUTPUT: "Sem saída",
  MISSING_RULE: "Sem regra",
  DUPLICATED_ACTIVITY: "Atividade duplicada",
  REDUNDANT_ACTIVITY: "Atividade redundante",
  INCONSISTENT_INFO: "Informação inconsistente",
  MISSING_SYSTEM: "Sem sistema definido",
  MANUAL_STEP: "Etapa manual",
  MISSING_SLA: "Sem SLA",
  MISSING_ENTRY_CRITERIA: "Sem critério de entrada",
  MISSING_EXIT_CRITERIA: "Sem critério de saída",
  MISSING_DOCUMENTATION: "Falta de documentação",
  MISSING_EXCEPTION_HANDLING: "Sem tratamento de exceção",
  MISSING_CONTROL: "Sem controle",
  REWORK: "Retrabalho",
  WAIT_POINT: "Ponto de espera",
  EXCESSIVE_APPROVAL: "Aprovações excessivas",
  UNNECESSARY_HANDOFF: "Transferência desnecessária",
  MANUAL_CONTROL: "Controle manual",
  OPERATIONAL_RISK: "Risco operacional",
  OTHER: "Outro",
};

const OPPORTUNITY_STATUS_OPTIONS: { value: OpportunityStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "IDENTIFIED", label: "Identificada" },
  { value: "UNDER_EVALUATION", label: "Em avaliação" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "IMPLEMENTED", label: "Implementada" },
  { value: "REJECTED", label: "Rejeitada" },
];

const SOLUTION_LABEL: Record<string, string> = {
  AUTOMATION: "Automação",
  RPA: "RPA / Robotização",
  SYSTEM_INTEGRATION: "Integração entre sistemas",
  STEP_ELIMINATION: "Eliminação de etapas",
  REWORK_REDUCTION: "Redução de retrabalho",
  APPROVAL_REDUCTION: "Redução de aprovações",
  PARALLELIZATION: "Paralelização",
  DIGITALIZATION: "Digitalização",
  TIME_REDUCTION: "Redução de tempo",
  HANDOFF_REDUCTION: "Redução de transferências",
  CONTROL_IMPROVEMENT: "Melhoria de controle",
  CX_IMPROVEMENT: "Experiência do cliente",
  OPERATIONAL_IMPROVEMENT: "Melhoria operacional",
  OTHER: "Outro",
};

const COMPLEXITY_COLOR: Record<string, "green" | "amber" | "red"> = { LOW: "green", MEDIUM: "amber", HIGH: "red" };
const COMPLEXITY_LABEL: Record<string, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };

export function GapsOpportunitiesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { processId } = useSelectedProcess();
  const [tab, setTab] = useState<"gaps" | "opportunities">(location.pathname === "/opportunities" ? "opportunities" : "gaps");

  function selectTab(next: "gaps" | "opportunities") {
    setTab(next);
    navigate(next === "gaps" ? "/gaps" : "/opportunities");
  }

  const [gapStatus, setGapStatus] = useState<GapStatus | "">("");
  const gapsQuery = useQuery({
    queryKey: ["gaps", gapStatus, processId],
    queryFn: async () =>
      (await api.get<Gap[]>("/gaps", { params: { status: gapStatus || undefined, processId: processId || undefined } })).data,
    enabled: tab === "gaps",
  });

  async function updateGapStatus(gap: Gap, newStatus: GapStatus) {
    await api.patch(`/gaps/${gap.id}`, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["gaps"] });
  }

  const [oppStatus, setOppStatus] = useState<OpportunityStatus | "">("");
  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities", oppStatus, processId],
    queryFn: async () =>
      (await api.get<Opportunity[]>("/opportunities", { params: { status: oppStatus || undefined, processId: processId || undefined } })).data,
    enabled: tab === "opportunities",
  });

  async function updateOpportunityStatus(opp: Opportunity, newStatus: OpportunityStatus) {
    await api.patch(`/opportunities/${opp.id}`, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
  }

  return (
    <div>
      <PageHeader
        title="Gaps & Oportunidades"
        description={
          processId
            ? `${tab === "gaps" ? "Lacunas" : "Oportunidades"} identificadas pela IA no processo selecionado`
            : `${tab === "gaps" ? "Lacunas" : "Oportunidades"} identificadas pela IA em todos os processos`
        }
        actions={<ProcessSelector />}
      />
      <div className="p-6">
        <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => selectTab("gaps")}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === "gaps"
                ? "border-brand-600 text-brand-700 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Gaps
          </button>
          <button
            onClick={() => selectTab("opportunities")}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === "opportunities"
                ? "border-brand-600 text-brand-700 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Oportunidades
          </button>
        </div>

        {tab === "gaps" ? (
          <>
            <div className="mb-4 max-w-xs">
              <Select value={gapStatus} onChange={(e) => setGapStatus(e.target.value as GapStatus | "")}>
                {GAP_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            {gapsQuery.isLoading ? (
              <Spinner className="h-6 w-6 text-brand-600" />
            ) : !gapsQuery.data || gapsQuery.data.length === 0 ? (
              <EmptyState title="Nenhum gap encontrado" description="Analise documentos de processo para que a IA identifique gaps automaticamente." />
            ) : (
              <div className="space-y-3">
                {gapsQuery.data.map((gap) => (
                  <Card key={gap.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={gap.severity} />
                          <Badge>{GAP_CATEGORY_LABEL[gap.category] ?? gap.category}</Badge>
                          <ConfidenceBadge confidence={gap.confidence} />
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{gap.description}</p>
                        {gap.process && (
                          <Link to={`/processes/${gap.process.id}/workspace`} className="text-xs text-brand-600 hover:underline">
                            {gap.process.name}
                          </Link>
                        )}
                      </div>
                      <Select
                        className="w-auto"
                        value={gap.status}
                        onChange={(e) => updateGapStatus(gap, e.target.value as GapStatus)}
                      >
                        {GAP_STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {gap.evidence && (
                      <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">Evidência: "{gap.evidence}"</p>
                    )}
                    {gap.impact && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Impacto: {gap.impact}</p>}
                    {gap.recommendation && (
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">Recomendação: {gap.recommendation}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 max-w-xs">
              <Select value={oppStatus} onChange={(e) => setOppStatus(e.target.value as OpportunityStatus | "")}>
                {OPPORTUNITY_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            {opportunitiesQuery.isLoading ? (
              <Spinner className="h-6 w-6 text-brand-600" />
            ) : !opportunitiesQuery.data || opportunitiesQuery.data.length === 0 ? (
              <EmptyState title="Nenhuma oportunidade encontrada" description="Analise documentos de processo para que a IA identifique oportunidades automaticamente." />
            ) : (
              <div className="space-y-3">
                {opportunitiesQuery.data.map((opp) => (
                  <Card key={opp.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge color="purple">{SOLUTION_LABEL[opp.solutionType] ?? opp.solutionType}</Badge>
                          <Badge color={COMPLEXITY_COLOR[opp.complexity]}>Complexidade: {COMPLEXITY_LABEL[opp.complexity]}</Badge>
                          <ConfidenceBadge confidence={opp.confidence} />
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{opp.title}</p>
                        {opp.process && (
                          <Link to={`/processes/${opp.process.id}/workspace`} className="text-xs text-brand-600 hover:underline">
                            {opp.process.name}
                          </Link>
                        )}
                      </div>
                      <Select className="w-auto" value={opp.status} onChange={(e) => updateOpportunityStatus(opp, e.target.value as OpportunityStatus)}>
                        {OPPORTUNITY_STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {opp.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{opp.description}</p>}
                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      {opp.currentProblem && (
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Problema atual: </span>{opp.currentProblem}</p>
                      )}
                      {opp.benefit && (
                        <p><span className="font-medium text-slate-500 dark:text-slate-400">Benefício esperado: </span>{opp.benefit}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
