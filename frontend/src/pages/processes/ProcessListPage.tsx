import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Card, EmptyState, Input, Spinner } from "../../components/ui";
import type { ProcessSummary } from "../../types/api";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_ANALYSIS: "Em análise",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

export function ProcessListPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["processes", search],
    queryFn: async () =>
      (await api.get<ProcessSummary[]>("/processes", { params: { search: search || undefined } })).data,
  });

  return (
    <div>
      <PageHeader
        title="Processos"
        description="Todos os processos de negócio cadastrados na organização"
        actions={
          <Link to="/processes/new">
            <Button>
              <Plus className="h-4 w-4" /> Novo processo
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <div className="mb-4 max-w-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar processo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <Spinner className="h-6 w-6 text-brand-600" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Nenhum processo encontrado" description="Crie um novo processo ou analise um documento para começar." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Versão</th>
                  <th className="px-4 py-3 font-medium">Saúde</th>
                  <th className="px-4 py-3 font-medium">Gaps</th>
                  <th className="px-4 py-3 font-medium">Oportunidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link to={`/processes/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.area || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">v{p.currentVersion}</td>
                    <td className="px-4 py-3">{p.healthScore != null ? <Badge color="blue">{p.healthScore}%</Badge> : "—"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p._count?.gaps ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p._count?.opportunities ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
