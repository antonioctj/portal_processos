import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Button, Card } from "../../components/ui";
import { ProcessSelector } from "../../components/ProcessSelector";
import { useSelectedProcess } from "../../store/SelectedProcessContext";
import type { ProcessSummary } from "../../types/api";

export function ReportsPage() {
  const { processId } = useSelectedProcess();
  const { data: processes } = useQuery({
    queryKey: ["processes-select"],
    queryFn: async () => (await api.get<ProcessSummary[]>("/processes")).data,
  });

  async function download(kind: "bpmn" | "report") {
    if (!processId) return;
    const res = await api.get(`/processes/${processId}/export/${kind}`, { responseType: "blob" });
    const process = processes?.find((p) => p.id === processId);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "bpmn" ? `${process?.name}.bpmn` : `relatorio-${process?.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Gere e exporte relatórios executivos e diagramas BPMN dos processos"
        actions={<ProcessSelector />}
      />
      <div className="mx-auto max-w-lg p-6">
        <Card className="p-6">
          {!processId && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Selecione um processo no topo da página para gerar o relatório.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button disabled={!processId} onClick={() => download("report")}>
              <FileText className="h-4 w-4" /> Relatório executivo (PDF)
            </Button>
            <Button variant="secondary" disabled={!processId} onClick={() => download("bpmn")}>
              <Download className="h-4 w-4" /> Diagrama BPMN (XML)
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            O relatório inclui resumo executivo, atividades, gaps, oportunidades e plano de ação com base na última análise disponível.
          </p>
        </Card>
      </div>
    </div>
  );
}
