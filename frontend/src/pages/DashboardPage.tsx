import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Gauge, Lightbulb, Sparkles, Workflow } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../layouts/AppLayout";
import { Card, Spinner, Badge } from "../components/ui";
import type { DashboardData } from "../types/api";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardData>("/dashboard")).data,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos processos, gaps e oportunidades identificados pela IA"
      />
      <div className="p-6">
        {isLoading || !data ? (
          <Spinner className="h-6 w-6 text-brand-600" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Workflow} label="Processos" value={data.cards.totalProcesses} color="bg-brand-100 text-brand-700" />
              <StatCard
                icon={AlertTriangle}
                label="Gaps identificados"
                value={data.cards.totalGaps}
                hint={`${data.cards.criticalGaps} crítico(s)`}
                color="bg-red-100 text-red-700"
              />
              <StatCard icon={Lightbulb} label="Oportunidades" value={data.cards.totalOpportunities} color="bg-amber-100 text-amber-700" />
              <StatCard
                icon={Sparkles}
                label="Automação"
                value={data.cards.automationOpportunities}
                hint="oportunidades de automação/RPA"
                color="bg-purple-100 text-purple-700"
              />
              <StatCard icon={Gauge} label="Em análise" value={data.cards.inAnalysis} color="bg-blue-100 text-blue-700" />
              <StatCard icon={CheckCircle2} label="Processos concluídos" value={data.cards.completed} color="bg-emerald-100 text-emerald-700" />
              <StatCard
                icon={Gauge}
                label="Qualidade média do processo"
                value={data.cards.avgHealth != null ? `${data.cards.avgHealth}%` : "—"}
                hint="Baseado na saúde calculada do BPMN"
                color="bg-teal-100 text-teal-700"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Últimos processos analisados</h2>
                {data.latestProcesses.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum processo cadastrado ainda.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.latestProcesses.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5">
                        <Link to={`/processes/${p.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                          {p.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          {p.healthScore != null && <Badge color="blue">{p.healthScore}%</Badge>}
                          <Badge>{p.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Últimas versões de processos</h2>
                {data.latestVersions.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma versão registrada ainda.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.latestVersions.map((v) => (
                      <li key={v.id} className="py-2.5">
                        <div className="flex items-center justify-between">
                          <Link to={`/processes/${v.process.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                            {v.process.name}
                          </Link>
                          <Badge color="purple">v{v.version}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {v.label || v.type} — por {v.createdBy?.name}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
