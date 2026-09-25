import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Card, ConfidenceBadge, EmptyState, Select, SeverityBadge, Spinner } from "../../components/ui";
import type { Gap, GapStatus } from "../../types/api";

const STATUS_OPTIONS: { value: GapStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "RESOLVED", label: "Resolvido" },
  { value: "ACCEPTED_RISK", label: "Risco aceito" },
  { value: "WONT_FIX", label: "Não será corrigido" },
];

const CATEGORY_LABEL: Record<string, string> = {
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

export function GapsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GapStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["gaps", status],
    queryFn: async () => (await api.get<Gap[]>("/gaps", { params: { status: status || undefined } })).data,
  });

  async function updateStatus(gap: Gap, newStatus: GapStatus) {
    await api.patch(`/gaps/${gap.id}`, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["gaps"] });
  }

  return (
    <div>
      <PageHeader title="Gaps" description="Lacunas identificadas pela IA em todos os processos" />
      <div className="p-6">
        <div className="mb-4 max-w-xs">
          <Select value={status} onChange={(e) => setStatus(e.target.value as GapStatus | "")}>
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
          <EmptyState title="Nenhum gap encontrado" description="Analise documentos de processo para que a IA identifique gaps automaticamente." />
        ) : (
          <div className="space-y-3">
            {data.map((gap) => (
              <Card key={gap.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={gap.severity} />
                      <Badge>{CATEGORY_LABEL[gap.category] ?? gap.category}</Badge>
                      <ConfidenceBadge confidence={gap.confidence} />
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{gap.description}</p>
                    {gap.process && (
                      <Link to={`/processes/${gap.process.id}`} className="text-xs text-brand-600 hover:underline">
                        {gap.process.name}
                      </Link>
                    )}
                  </div>
                  <Select
                    className="w-auto"
                    value={gap.status}
                    onChange={(e) => updateStatus(gap, e.target.value as GapStatus)}
                  >
                    {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
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
      </div>
    </div>
  );
}
