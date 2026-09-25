import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Card, Spinner } from "../../components/ui";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

interface UsageResponse {
  totals: { requests: number; inputTokens: number; outputTokens: number; costEstimate: number };
  byModel: Record<string, { requests: number; costEstimate: number }>;
}

export function AuditPage() {
  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get<AuditLog[]>("/audit/logs")).data,
  });
  const usageQuery = useQuery({
    queryKey: ["ai-usage"],
    queryFn: async () => (await api.get<UsageResponse>("/audit/ai-usage")).data,
  });

  return (
    <div>
      <PageHeader title="Auditoria & Consumo de IA" description="Histórico de ações e consumo de tokens/custos de IA da organização" />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Logs de auditoria</h2>
          {logsQuery.isLoading ? (
            <Spinner className="h-5 w-5 text-brand-600" />
          ) : (
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {logsQuery.data?.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{log.action}</span>{" "}
                    <span className="text-slate-500 dark:text-slate-400">— {log.entity}</span>
                    <p className="text-xs text-slate-400">{log.user?.name ?? "sistema"}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              ))}
              {logsQuery.data?.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum log registrado.</p>}
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Consumo de IA</h2>
          {usageQuery.data && (
            <Card className="space-y-3 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Requisições</span>
                <span className="font-medium">{usageQuery.data.totals.requests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tokens de entrada</span>
                <span className="font-medium">{usageQuery.data.totals.inputTokens.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tokens de saída</span>
                <span className="font-medium">{usageQuery.data.totals.outputTokens.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
                <span className="text-slate-500">Custo estimado</span>
                <span className="font-medium">US$ {usageQuery.data.totals.costEstimate.toFixed(4)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <p className="mb-1 text-xs font-medium text-slate-500">Por modelo</p>
                {Object.entries(usageQuery.data.byModel).map(([model, v]) => (
                  <div key={model} className="flex justify-between text-xs">
                    <span>{model}</span>
                    <span>{v.requests}x — US$ {v.costEstimate.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
