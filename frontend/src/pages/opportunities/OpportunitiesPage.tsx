import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Card, ConfidenceBadge, EmptyState, Select, Spinner } from "../../components/ui";
import type { Opportunity, OpportunityStatus } from "../../types/api";

const STATUS_OPTIONS: { value: OpportunityStatus | ""; label: string }[] = [
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

export function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OpportunityStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", status],
    queryFn: async () => (await api.get<Opportunity[]>("/opportunities", { params: { status: status || undefined } })).data,
  });

  async function updateStatus(opp: Opportunity, newStatus: OpportunityStatus) {
    await api.patch(`/opportunities/${opp.id}`, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
  }

  return (
    <div>
      <PageHeader title="Oportunidades de Melhoria" description="Oportunidades de automação e melhoria identificadas pela IA" />
      <div className="p-6">
        <div className="mb-4 max-w-xs">
          <Select value={status} onChange={(e) => setStatus(e.target.value as OpportunityStatus | "")}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <Spinner className="h-6 w-6 text-brand-600" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Nenhuma oportunidade encontrada" description="Analise documentos de processo para que a IA identifique oportunidades automaticamente." />
        ) : (
          <div className="space-y-3">
            {data.map((opp) => (
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
                      <Link to={`/processes/${opp.process.id}`} className="text-xs text-brand-600 hover:underline">
                        {opp.process.name}
                      </Link>
                    )}
                  </div>
                  <Select className="w-auto" value={opp.status} onChange={(e) => updateStatus(opp, e.target.value as OpportunityStatus)}>
                    {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
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
      </div>
    </div>
  );
}
