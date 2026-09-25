import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Card, EmptyState, Spinner } from "../../components/ui";
import type { DocumentItem } from "../../types/api";

const STATUS_COLOR: Record<string, "green" | "amber" | "red" | "slate"> = {
  PROCESSED: "green",
  PROCESSING: "amber",
  UPLOADED: "slate",
  FAILED: "red",
};

export function DocumentLibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await api.get<DocumentItem[]>("/documents")).data,
  });

  return (
    <div>
      <PageHeader title="Biblioteca de Documentos" description="Todos os documentos enviados e seus processos relacionados" />
      <div className="p-6">
        {isLoading ? (
          <Spinner className="h-6 w-6 text-brand-600" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Nenhum documento enviado" />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Processos relacionados</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{doc.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{doc.type}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {doc.processes?.map((p) => p.process.name).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLOR[doc.status]}>{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                    </td>
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
