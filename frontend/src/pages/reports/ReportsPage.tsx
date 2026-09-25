import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Button, Card, Select } from "../../components/ui";
import type { ProcessSummary } from "../../types/api";

export function ReportsPage() {
  const [processId, setProcessId] = useState("");
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
      <PageHeader title="Relatórios" description="Gere e exporte relatórios executivos e diagramas BPMN dos processos" />
      <div className="mx-auto max-w-lg p-6">
        <Card className="p-6">
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Processo</label>
            <Select value={processId} onChange={(e) => setProcessId(e.target.value)}>
              <option value="">Selecione um processo...</option>
              {processes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
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
