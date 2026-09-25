import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, ZoomIn, ZoomOut, Maximize, Save, Wand2 } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Select, Spinner, Textarea } from "../../components/ui";
import { BpmnCanvas, type BpmnCanvasHandle } from "../../components/bpmn/BpmnCanvas";
import { EMPTY_DIAGRAM_XML, KIND_LABEL } from "../../lib/bpmnConstants";
import type { BpmnDraft, BpmnHealthReport, Message, ProcessSummary } from "../../types/api";

export function AssistantPage() {
  const { processId: paramProcessId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<BpmnCanvasHandle>(null);

  const [processId, setProcessId] = useState(paramProcessId ?? "");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [health, setHealth] = useState<BpmnHealthReport | null>(null);
  const [analyzingBpmn, setAnalyzingBpmn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paramProcessId) setProcessId(paramProcessId);
  }, [paramProcessId]);

  const processesQuery = useQuery({
    queryKey: ["processes-select"],
    queryFn: async () => (await api.get<ProcessSummary[]>("/processes")).data,
  });

  const processQuery = useQuery({
    queryKey: ["process", processId],
    queryFn: async () => (await api.get(`/processes/${processId}`)).data,
    enabled: !!processId,
  });

  const bpmnQuery = useQuery({
    queryKey: ["bpmn", processId],
    queryFn: async () => (await api.get<{ xml: string | null; draft: BpmnDraft }>(`/processes/${processId}/bpmn`)).data,
    enabled: !!processId,
  });

  const chatQuery = useQuery({
    queryKey: ["chat", processId],
    queryFn: async () => (await api.get<{ messages: Message[] }>(`/chat/${processId}`)).data,
    enabled: !!processId,
  });

  useEffect(() => {
    if (bpmnQuery.data && canvasRef.current) {
      canvasRef.current.importXml(bpmnQuery.data.xml || EMPTY_DIAGRAM_XML);
    }
  }, [bpmnQuery.data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatQuery.data?.messages.length]);

  const selectedDraftElement = useMemo(
    () => bpmnQuery.data?.draft.elements.find((e) => e.id === selectedElementId) ?? null,
    [bpmnQuery.data, selectedElementId]
  );

  async function handleSend() {
    if (!input.trim() || !processId) return;
    setError(null);
    setSending(true);
    const content = input;
    setInput("");
    try {
      const { data } = await api.post(`/chat/${processId}/messages`, { content });
      queryClient.setQueryData(["chat", processId], (old: { messages: Message[] } | undefined) => ({
        messages: [...(old?.messages ?? []), data.userMessage, data.assistantMessage],
      }));
      if (data.appliedBpmn) {
        const { data: bpmn } = await api.get(`/processes/${processId}/bpmn`);
        queryClient.setQueryData(["bpmn", processId], bpmn);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleGenerateBpmn() {
    setError(null);
    try {
      await api.post(`/processes/${processId}/generate-bpmn`);
      const { data: bpmn } = await api.get(`/processes/${processId}/bpmn`);
      queryClient.setQueryData(["bpmn", processId], bpmn);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleSaveBpmn() {
    if (!canvasRef.current) return;
    setError(null);
    try {
      const draft = canvasRef.current.exportDraft();
      // Preserva campos de negócio (responsável/sistema) já conhecidos para elementos existentes.
      const enriched: BpmnDraft = {
        elements: draft.elements.map((el) => {
          const prev = bpmnQuery.data?.draft.elements.find((p) => p.id === el.id);
          return { ...el, responsible: prev?.responsible ?? null, system: prev?.system ?? null };
        }),
        connections: draft.connections,
      };
      const { data } = await api.put(`/processes/${processId}/bpmn`, enriched);
      queryClient.setQueryData(["bpmn", processId], { xml: data.xml, draft: enriched });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleAnalyzeBpmn() {
    setError(null);
    setAnalyzingBpmn(true);
    try {
      const { data } = await api.post<BpmnHealthReport>(`/processes/${processId}/analyze-bpmn`);
      setHealth(data);
      queryClient.invalidateQueries({ queryKey: ["process", processId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAnalyzingBpmn(false);
    }
  }

  const process = processQuery.data;

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title={process ? `Processo: ${process.name}` : "Assistente IA / Modelador BPMN"}
        description={!processId ? "Selecione um processo para começar" : undefined}
        actions={
          <>
            {!processId && (
              <Select className="w-64" value={processId} onChange={(e) => navigate(`/assistant/${e.target.value}`)}>
                <option value="">Selecione um processo...</option>
                {processesQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            {processId && (
              <>
                <Button variant="secondary" onClick={handleGenerateBpmn}>
                  <Wand2 className="h-4 w-4" /> Gerar BPMN
                </Button>
                <Button variant="secondary" onClick={handleSaveBpmn}>
                  <Save className="h-4 w-4" /> Salvar
                </Button>
                <Button onClick={handleAnalyzeBpmn} disabled={analyzingBpmn}>
                  <Sparkles className="h-4 w-4" /> {analyzingBpmn ? "Analisando..." : "Analisar BPMN com IA"}
                </Button>
              </>
            )}
          </>
        }
      />

      {!processId ? (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          Selecione um processo acima para abrir o modelador.
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr_280px]">
          {/* Chat */}
          <div className="flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chatQuery.data?.messages.map((m) => (
                <div key={m.id} className={m.role === "USER" ? "text-right" : ""}>
                  <div
                    className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "USER"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.actions?.actions && m.actions.actions.length > 0 && (
                    <div className="mt-1 space-y-0.5 text-left">
                      {m.actions.actions.map((a, i) => (
                        <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400">
                          ⚡ {a.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {error && <p className="px-4 text-xs text-red-600">{error}</p>}
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <Textarea
                rows={2}
                placeholder="Converse com a IA sobre o processo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button className="mt-2 w-full" onClick={handleSend} disabled={sending || !input.trim()}>
                {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />} Enviar
              </Button>
            </div>
          </div>

          {/* BPMN Canvas */}
          <div className="relative">
            {bpmnQuery.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner className="h-6 w-6 text-brand-600" />
              </div>
            ) : (
              <>
                <BpmnCanvas ref={canvasRef} onSelectionChange={setSelectedElementId} />
                <div className="absolute bottom-3 right-3 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <button className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => canvasRef.current?.zoomIn()}>
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => canvasRef.current?.zoomOut()}>
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => canvasRef.current?.zoomReset()}>
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Propriedades */}
          <div className="overflow-y-auto border-l border-slate-200 p-4 dark:border-slate-800">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Propriedades</h2>
            {selectedDraftElement ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-400">Nome</p>
                  <p className="text-slate-800 dark:text-slate-100">{selectedDraftElement.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Tipo</p>
                  <Badge>{KIND_LABEL[selectedDraftElement.type]}</Badge>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Responsável</p>
                  <p className="text-slate-800 dark:text-slate-100">{selectedDraftElement.responsible || "Não identificado no documento"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Sistema</p>
                  <p className="text-slate-800 dark:text-slate-100">{selectedDraftElement.system || "Não identificado no documento"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um elemento no diagrama para ver detalhes.</p>
            )}

            {health && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Saúde do processo</h3>
                <p className="mb-2 text-2xl font-bold text-brand-600">{health.score}/100</p>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(health.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="capitalize text-slate-500 dark:text-slate-400">{key}</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-brand-500" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {health.findings.length > 0 && (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {health.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[11px] italic text-slate-400">{health.criteria}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rodapé com indicadores */}
      {processId && process && (
        <div className="flex items-center gap-6 border-t border-slate-200 bg-white px-6 py-2.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span>Gaps: {process.gaps?.length ?? 0}</span>
          <span>Oportunidades: {process.opportunities?.length ?? 0}</span>
          <span>Automação: {process.opportunities?.filter((o: any) => o.solutionType === "AUTOMATION" || o.solutionType === "RPA").length ?? 0}</span>
          <span>Saúde: {process.healthScore != null ? `${process.healthScore}%` : "—"}</span>
        </div>
      )}
    </div>
  );
}
