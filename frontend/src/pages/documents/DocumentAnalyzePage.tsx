import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Button, Card, Select, Spinner } from "../../components/ui";
import { AnalysisProgress } from "../../components/AnalysisProgress";
import { useAnalysisStream } from "../../hooks/useAnalysisStream";
import type { ProcessSummary } from "../../types/api";

export function DocumentAnalyzePage() {
  const navigate = useNavigate();
  const [processId, setProcessId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processesQuery = useQuery({
    queryKey: ["processes-select"],
    queryFn: async () => (await api.get<ProcessSummary[]>("/processes")).data,
  });

  const { steps, isRunning, error: analysisError, result, start } = useAnalysisStream(processId);

  async function handleAnalyze() {
    if (!file || !processId) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("processId", processId);
      const { data } = await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      start(data.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Analisar Documento" description="Envie um documento de processo para a IA extrair automaticamente atividades, gaps e oportunidades" />
      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-6">
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Processo de destino</label>
            {processesQuery.isLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Select value={processId} onChange={(e) => setProcessId(e.target.value)}>
                <option value="">Selecione um processo...</option>
                {processesQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Não achou o processo?{" "}
              <button className="text-brand-600 hover:underline" onClick={() => navigate("/processes/new")}>
                Criar um novo
              </button>
            </p>
          </div>

          <label
            htmlFor="doc-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400 dark:border-slate-700"
          >
            <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {file ? file.name : "Clique para selecionar um arquivo"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, XLSX, CSV, TXT ou imagem (OCR)</p>
            <input
              id="doc-upload"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {analysisError && <p className="mt-3 text-sm text-red-600">{analysisError}</p>}

          <Button className="mt-4 w-full" onClick={handleAnalyze} disabled={!file || !processId || uploading || isRunning}>
            {uploading ? "Enviando..." : isRunning ? "Analisando..." : "Analisar documento"}
          </Button>

          {(isRunning || Boolean(result)) && (
            <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <AnalysisProgress steps={steps} />
              {!isRunning && Boolean(result) && (
                <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate(`/processes/${processId}`)}>
                  Ver resultado da análise
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
