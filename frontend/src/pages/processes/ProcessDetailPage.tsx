import { useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Network, Plus, Trash2, Upload, ImagePlus, GripVertical } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Card, ConfidenceBadge, EmptyState, Input, Label, Spinner, Textarea } from "../../components/ui";
import { AnalysisProgress } from "../../components/AnalysisProgress";
import { useAnalysisStream } from "../../hooks/useAnalysisStream";
import type { ArchitectureSystem, ExtractedProcess, MacroFlowPhase, ProcessRule, ProcessScreen } from "../../types/api";

const TABS = [
  "overview",
  "inputs",
  "activities",
  "outputs",
  "decisions",
  "exceptions",
  "rules",
  "screens",
  "macroFlow",
  "architecture",
  "documents",
  "versions",
] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Visão geral",
  inputs: "Entradas",
  activities: "Atividades",
  outputs: "Saídas",
  decisions: "Decisões",
  exceptions: "Exceções",
  rules: "Regras",
  screens: "Telas",
  macroFlow: "Macro Fluxo",
  architecture: "Arquitetura",
  documents: "Documentos",
  versions: "Versões",
};

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);

  const processQuery = useQuery({
    queryKey: ["process", id],
    queryFn: async () => (await api.get(`/processes/${id}`)).data,
    enabled: !!id,
  });

  const analysisQuery = useQuery({
    queryKey: ["analysis-results", id],
    queryFn: async () => (await api.get(`/processes/${id}/analysis-results`)).data as { id: string; status: string; structured: ExtractedProcess | null }[],
    enabled: !!id,
  });

  const versionsQuery = useQuery({
    queryKey: ["versions", id],
    queryFn: async () => (await api.get(`/processes/${id}/versions`)).data,
    enabled: !!id && tab === "versions",
  });

  const { steps, isRunning, error: analysisError, result, start } = useAnalysisStream(id!);

  const structured: ExtractedProcess | null = useMemo(() => {
    if (result && typeof result === "object" && "extracted" in (result as Record<string, unknown>)) {
      return (result as { extracted: ExtractedProcess }).extracted;
    }
    const completed = analysisQuery.data?.find((a) => a.status === "COMPLETED" && a.structured);
    return completed?.structured ?? null;
  }, [result, analysisQuery.data]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("processId", id);
      const { data } = await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPendingDocumentId(data.id);
      start(data.id);
    } catch (err) {
      setUploadError(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExport(kind: "bpmn" | "report") {
    const res = await api.get(`/processes/${id}/export/${kind}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "bpmn" ? `${process?.name || "processo"}.bpmn` : `relatorio-${process?.name || "processo"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const process = processQuery.data;

  if (processQuery.isLoading || !process) {
    return (
      <div className="p-6">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={process.name}
        description={process.description || "Sem descrição"}
        actions={
          <>
            <Badge>{process.status}</Badge>
            <Link to={`/assistant/${id}`}>
              <Button variant="secondary">
                <Network className="h-4 w-4" /> Modelador / Assistente IA
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => handleExport("bpmn")}>
              <Download className="h-4 w-4" /> BPMN
            </Button>
            <Button variant="ghost" onClick={() => handleExport("report")}>
              <FileText className="h-4 w-4" /> Relatório PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-brand-600 text-brand-700 dark:text-brand-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab process={process} structured={structured} />}
          {tab === "inputs" && <InputsTab structured={structured} />}
          {tab === "activities" && <ActivitiesTab structured={structured} />}
          {tab === "outputs" && <OutputsTab structured={structured} />}
          {tab === "decisions" && <DecisionsTab structured={structured} />}
          {tab === "exceptions" && <ExceptionsTab structured={structured} />}
          {tab === "rules" && <RulesTab processId={id!} />}
          {tab === "screens" && <ScreensTab processId={id!} />}
          {tab === "macroFlow" && <MacroFlowTab processId={id!} initial={process.macroFlow} />}
          {tab === "architecture" && <ArchitectureTab processId={id!} initial={process.architecture} />}
          {tab === "documents" && <DocumentsTab process={process} />}
          {tab === "versions" && <VersionsTab versions={versionsQuery.data} />}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Upload className="h-4 w-4" /> Analisar documento
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              PDF, DOCX, XLSX, CSV, TXT ou imagem digitalizada (OCR).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              disabled={uploading || isRunning}
              className="mb-3 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
            />
            {uploadError && <p className="mb-2 text-xs text-red-600">{uploadError}</p>}
            {analysisError && <p className="mb-2 text-xs text-red-600">{analysisError}</p>}

            {(uploading || isRunning || pendingDocumentId) && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {isRunning ? "Analisando documento..." : "Análise concluída"}
                </p>
                <AnalysisProgress steps={steps} />
              </div>
            )}

            {!isRunning && Boolean(result) && (
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["process", id] });
                  queryClient.invalidateQueries({ queryKey: ["analysis-results", id] });
                  setTab("overview");
                }}
              >
                Ver resultado
              </Button>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Resumo</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Gaps</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{process.gaps?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Oportunidades</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{process.opportunities?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Versão atual</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">v{process.currentVersion}</dd>
              </div>
              {process.healthScore != null && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Saúde do processo</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">{process.healthScore}%</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{value || "Não identificado no documento"}</dd>
    </div>
  );
}

function OverviewTab({ process, structured }: { process: any; structured: ExtractedProcess | null }) {
  const overview = structured?.overview;
  return (
    <Card className="p-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do processo" value={overview?.name || process.name} />
        <Field label="Área responsável" value={overview?.area || process.area} />
        <Field label="Objetivo" value={overview?.objective || process.objective} />
        <Field label="Escopo" value={overview?.scope || process.scope} />
        <Field label="Início" value={overview?.start} />
        <Field label="Fim" value={overview?.end} />
        <Field label="Dono do processo" value={overview?.owner} />
      </dl>
      {structured?.systems && structured.systems.length > 0 && (
        <div className="mt-4">
          <dt className="mb-1 text-xs font-medium uppercase text-slate-400 dark:text-slate-500">Sistemas identificados</dt>
          <div className="flex flex-wrap gap-1.5">
            {structured.systems.map((s, i) => (
              <Badge key={i} color="blue">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {structured?.rules && structured.rules.length > 0 && (
        <div className="mt-4">
          <dt className="mb-1 text-xs font-medium uppercase text-slate-400 dark:text-slate-500">Regras de negócio</dt>
          <ul className="list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
            {structured.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {!structured && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Nenhuma análise de IA disponível ainda. Envie um documento ao lado para começar.
        </p>
      )}
    </Card>
  );
}

function InputsTab({ structured }: { structured: ExtractedProcess | null }) {
  if (!structured || structured.inputs.length === 0)
    return <EmptyState title="Nenhuma entrada identificada" description="Analise um documento para que a IA identifique as entradas do processo." />;
  return (
    <div className="space-y-3">
      {structured.inputs.map((input, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">{input.name}</h3>
            <ConfidenceBadge confidence={input.confidence} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-4">
            <div><dt className="uppercase">Origem</dt><dd className="text-slate-700 dark:text-slate-300">{input.origin || "—"}</dd></div>
            <div><dt className="uppercase">Tipo</dt><dd className="text-slate-700 dark:text-slate-300">{input.type || "—"}</dd></div>
            <div><dt className="uppercase">Obrigatória</dt><dd className="text-slate-700 dark:text-slate-300">{input.required == null ? "—" : input.required ? "Sim" : "Não"}</dd></div>
            <div><dt className="uppercase">Qualidade</dt><dd className="text-slate-700 dark:text-slate-300">{input.quality || "—"}</dd></div>
          </dl>
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-500 dark:border-slate-800 dark:text-slate-400">"{input.evidence}"</p>
        </Card>
      ))}
    </div>
  );
}

function ActivitiesTab({ structured }: { structured: ExtractedProcess | null }) {
  if (!structured || structured.activities.length === 0)
    return <EmptyState title="Nenhuma atividade identificada" description="Analise um documento para que a IA identifique as atividades do processo." />;
  return (
    <div className="space-y-3">
      {structured.activities.map((a, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">{a.name}</h3>
            <ConfidenceBadge confidence={a.confidence} />
          </div>
          {a.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>}
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-4">
            <div><dt className="uppercase">Responsável</dt><dd className="text-slate-700 dark:text-slate-300">{a.responsible || "Não identificado no documento"}</dd></div>
            <div><dt className="uppercase">Sistema</dt><dd className="text-slate-700 dark:text-slate-300">{a.system || "Não identificado no documento"}</dd></div>
            <div><dt className="uppercase">Tempo estimado</dt><dd className="text-slate-700 dark:text-slate-300">{a.estimatedTime || "—"}</dd></div>
            <div><dt className="uppercase">Manual/Automática</dt><dd className="text-slate-700 dark:text-slate-300">{a.isManual == null ? "—" : a.isManual ? "Manual" : "Automática"}</dd></div>
          </dl>
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-500 dark:border-slate-800 dark:text-slate-400">"{a.evidence}"</p>
        </Card>
      ))}
    </div>
  );
}

function OutputsTab({ structured }: { structured: ExtractedProcess | null }) {
  if (!structured || structured.outputs.length === 0)
    return <EmptyState title="Nenhuma saída identificada" />;
  return (
    <div className="space-y-3">
      {structured.outputs.map((o, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">{o.name}</h3>
            <ConfidenceBadge confidence={o.confidence} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tipo: {o.type} · Destino: {o.destination || "Não identificado no documento"}</p>
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-500 dark:border-slate-800 dark:text-slate-400">"{o.evidence}"</p>
        </Card>
      ))}
    </div>
  );
}

function DecisionsTab({ structured }: { structured: ExtractedProcess | null }) {
  if (!structured || structured.decisions.length === 0)
    return <EmptyState title="Nenhuma decisão identificada" />;
  return (
    <div className="space-y-3">
      {structured.decisions.map((d, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">{d.condition}</h3>
            <ConfidenceBadge confidence={d.confidence} />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div><span className="uppercase text-slate-400">Sim →</span> <span className="text-slate-700 dark:text-slate-300">{d.yesPath || "—"}</span></div>
            <div><span className="uppercase text-slate-400">Não →</span> <span className="text-slate-700 dark:text-slate-300">{d.noPath || "—"}</span></div>
            <div><span className="uppercase text-slate-400">Responsável</span> <span className="text-slate-700 dark:text-slate-300">{d.responsible || "Não identificado no documento"}</span></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ExceptionsTab({ structured }: { structured: ExtractedProcess | null }) {
  if (!structured || structured.exceptions.length === 0)
    return <EmptyState title="Nenhuma exceção identificada" description="A IA não encontrou tratamento de exceções descrito no documento." />;
  return (
    <div className="space-y-3">
      {structured.exceptions.map((ex, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-100">{ex.description}</h3>
            <ConfidenceBadge confidence={ex.confidence} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tipo: {ex.type}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tratamento: {ex.handling || "Não identificado no documento"}</p>
        </Card>
      ))}
    </div>
  );
}

function RulesTab({ processId }: { processId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const rulesQuery = useQuery({
    queryKey: ["process-rules", processId],
    queryFn: async () => (await api.get<ProcessRule[]>(`/processes/${processId}/rules`)).data,
  });

  async function addRule() {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await api.post(`/processes/${processId}/rules`, { title, description });
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["process-rules", processId] });
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    await api.delete(`/rules/${id}`);
    queryClient.invalidateQueries({ queryKey: ["process-rules", processId] });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Nova regra de negócio</h3>
        <div className="space-y-2">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Limite de alçada" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={addRule} disabled={saving || !title.trim() || !description.trim()}>
            <Plus className="h-4 w-4" /> Adicionar regra
          </Button>
        </div>
      </Card>

      {rulesQuery.isLoading ? (
        <Spinner className="h-6 w-6 text-brand-600" />
      ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
        <EmptyState title="Nenhuma regra cadastrada" description="Adicione as regras de negócio que o processo deve seguir." />
      ) : (
        <div className="space-y-2">
          {rulesQuery.data.map((rule) => (
            <Card key={rule.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{rule.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{rule.description}</p>
              </div>
              <button
                onClick={() => removeRule(rule.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScreensTab({ processId }: { processId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemName, setSystemName] = useState("");
  const [stepName, setStepName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screensQuery = useQuery({
    queryKey: ["process-screens", processId],
    queryFn: async () => (await api.get<ProcessScreen[]>(`/processes/${processId}/screens`)).data,
  });

  async function uploadScreen() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !systemName.trim()) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("systemName", systemName);
      if (stepName) formData.append("stepName", stepName);
      if (description) formData.append("description", description);
      await api.post(`/processes/${processId}/screens`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSystemName("");
      setStepName("");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["process-screens", processId] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function removeScreen(id: string) {
    await api.delete(`/screens/${id}`);
    queryClient.invalidateQueries({ queryKey: ["process-screens", processId] });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Anexar tela de sistema</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label>Sistema *</Label>
            <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="Ex: CRM" />
          </div>
          <div>
            <Label>Etapa</Label>
            <Input value={stepName} onChange={(e) => setStepName(e.target.value)} placeholder="Ex: Confirmação de cadastro" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300" />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <Button className="mt-3" onClick={uploadScreen} disabled={uploading || !systemName.trim()}>
          <ImagePlus className="h-4 w-4" /> {uploading ? "Enviando..." : "Anexar tela"}
        </Button>
      </Card>

      {screensQuery.isLoading ? (
        <Spinner className="h-6 w-6 text-brand-600" />
      ) : !screensQuery.data || screensQuery.data.length === 0 ? (
        <EmptyState title="Nenhuma tela anexada" description="Anexe prints das telas dos sistemas usados no processo." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {screensQuery.data.map((screen) => (
            <Card key={screen.id} className="overflow-hidden p-0">
              <img src={screen.url} alt={screen.systemName} className="h-40 w-full object-cover" />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{screen.systemName}</p>
                    {screen.stepName && <p className="text-xs text-slate-500 dark:text-slate-400">{screen.stepName}</p>}
                  </div>
                  <button
                    onClick={() => removeScreen(screen.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {screen.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{screen.description}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MacroFlowTab({ processId, initial }: { processId: string; initial: MacroFlowPhase[] | null }) {
  const queryClient = useQueryClient();
  const [phases, setPhases] = useState<MacroFlowPhase[]>(initial ?? []);
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<MacroFlowPhase>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function move(i: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/processes/${processId}/macro-flow`, { phases });
      queryClient.invalidateQueries({ queryKey: ["process", processId] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {phases.map((phase, i) => (
        <Card key={i} className="flex items-start gap-3 p-4">
          <div className="flex flex-col gap-1 pt-1 text-slate-300">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
              <GripVertical className="h-4 w-4 rotate-90" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <Input value={phase.title} onChange={(e) => update(i, { title: e.target.value })} placeholder={`Fase ${i + 1}`} />
            <Textarea rows={2} value={phase.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} placeholder="Descrição curta da fase" />
          </div>
          <button
            onClick={() => setPhases((prev) => prev.filter((_, idx) => idx !== i))}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setPhases((prev) => [...prev, { title: "", description: "" }])}>
          <Plus className="h-4 w-4" /> Nova fase
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar macro fluxo"}
        </Button>
      </div>
    </div>
  );
}

function ArchitectureTab({ processId, initial }: { processId: string; initial: ArchitectureSystem[] | null }) {
  const queryClient = useQueryClient();
  const [systems, setSystems] = useState<ArchitectureSystem[]>(initial ?? []);
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<ArchitectureSystem>) {
    setSystems((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/processes/${processId}/architecture`, { systems });
      queryClient.invalidateQueries({ queryKey: ["process", processId] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {systems.map((sys, i) => (
        <Card key={i} className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label>Sistema</Label>
              <Input value={sys.system} onChange={(e) => update(i, { system: e.target.value })} placeholder="Ex: SAP" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Input value={sys.type ?? ""} onChange={(e) => update(i, { type: e.target.value })} placeholder="Ex: ERP" />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={sys.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Integra com (separado por vírgula)</Label>
              <Input value={sys.integratesWith ?? ""} onChange={(e) => update(i, { integratesWith: e.target.value })} placeholder="Ex: CRM, Financeiro" />
            </div>
          </div>
          <button
            onClick={() => setSystems((prev) => prev.filter((_, idx) => idx !== i))}
            className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover sistema
          </button>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setSystems((prev) => [...prev, { system: "", type: "", description: "", integratesWith: "" }])}
        >
          <Plus className="h-4 w-4" /> Novo sistema
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar arquitetura"}
        </Button>
      </div>
    </div>
  );
}

function DocumentsTab({ process }: { process: any }) {
  if (!process.documents || process.documents.length === 0)
    return <EmptyState title="Nenhum documento vinculado" />;
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      {process.documents.map(({ document }: any) => (
        <div key={document.id} className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{document.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{document.type} · {(document.sizeBytes / 1024).toFixed(0)} KB</p>
          </div>
          <Badge color={document.status === "PROCESSED" ? "green" : document.status === "FAILED" ? "red" : "amber"}>{document.status}</Badge>
        </div>
      ))}
    </Card>
  );
}

function VersionsTab({ versions }: { versions?: any[] }) {
  if (!versions || versions.length === 0) return <EmptyState title="Nenhuma versão registrada" />;
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      {versions.map((v) => (
        <div key={v.id} className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              v{v.version} — {v.label || v.type}
              {v.isCurrent && <Badge color="green" className="ml-2">atual</Badge>}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              por {v.createdBy?.name} em {new Date(v.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <Badge color="purple">{v.type}</Badge>
        </div>
      ))}
    </Card>
  );
}
