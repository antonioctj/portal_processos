import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Button, Card, Input, Label, Select, Spinner } from "../../components/ui";
import { useSelectedProcess } from "../../store/SelectedProcessContext";
import { AssistantPage } from "../assistant/AssistantPage";
import { GapsOpportunitiesPage } from "../gaps/GapsOpportunitiesPage";
import { ReportsPage } from "../reports/ReportsPage";
import { LevantamentoStep } from "./LevantamentoStep";
import type { ProcessDetail, ProcessStatus } from "../../types/api";

const STEPS = ["projeto", "levantamento", "fluxograma", "gaps", "documentos"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = {
  projeto: "Projeto",
  levantamento: "Levantamento",
  fluxograma: "Fluxograma",
  gaps: "Gaps & Oportunidades",
  documentos: "Documentos",
};

const STATUS_OPTIONS: { value: ProcessStatus; label: string }[] = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "IN_ANALYSIS", label: "Em análise" },
  { value: "IN_REVIEW", label: "Em revisão" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "ARCHIVED", label: "Arquivado" },
];

export function ProcessWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { setProcessId } = useSelectedProcess();
  const [step, setStep] = useState<Step>("projeto");

  useEffect(() => {
    if (id) setProcessId(id);
  }, [id]);

  const processQuery = useQuery({
    queryKey: ["process", id],
    queryFn: async () => (await api.get<ProcessDetail>(`/processes/${id}`)).data,
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title={processQuery.data?.projectName || processQuery.data?.name || "Projeto"}
        description={processQuery.data?.name && processQuery.data?.projectName ? `Processo: ${processQuery.data.name}` : undefined}
      />
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        {STEPS.map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              step === s
                ? "border-brand-600 text-brand-700 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {STEP_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === "projeto" &&
          (processQuery.isLoading || !processQuery.data ? (
            <div className="p-6">
              <Spinner className="h-6 w-6 text-brand-600" />
            </div>
          ) : (
            <ProjetoStep process={processQuery.data} />
          ))}
        {step === "levantamento" && <LevantamentoStep processId={id} />}
        {step === "fluxograma" && <AssistantPage />}
        {step === "gaps" && <GapsOpportunitiesPage />}
        {step === "documentos" && <ReportsPage />}
      </div>
    </div>
  );
}

function ProjetoStep({ process }: { process: ProcessDetail }) {
  const [form, setForm] = useState({
    projectName: process.projectName ?? "",
    name: process.name ?? "",
    area: process.area ?? "",
    documentResponsible: process.documentResponsible ?? "",
    elaborationDate: process.elaborationDate ? process.elaborationDate.slice(0, 10) : "",
    currentVersion: process.currentVersion ?? "",
    validatorName: process.validatorName ?? "",
    status: process.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/processes/${process.id}`, form);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Capa do projeto</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do projeto</Label>
            <Input value={form.projectName} onChange={(e) => set("projectName", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Processo</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Área / Operação</Label>
            <Input value={form.area} onChange={(e) => set("area", e.target.value)} />
          </div>
          <div>
            <Label>Responsável pelo documento</Label>
            <Input value={form.documentResponsible} onChange={(e) => set("documentResponsible", e.target.value)} />
          </div>
          <div>
            <Label>Data de elaboração</Label>
            <Input type="date" value={form.elaborationDate} onChange={(e) => set("elaborationDate", e.target.value)} />
          </div>
          <div>
            <Label>Versão</Label>
            <Input value={form.currentVersion} onChange={(e) => set("currentVersion", e.target.value)} />
          </div>
          <div>
            <Label>Quem valida</Label>
            <Input value={form.validatorName} onChange={(e) => set("validatorName", e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as ProcessStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          {saved && <span className="text-xs text-emerald-600">Salvo.</span>}
        </div>
      </Card>
      <Link to={`/processes/${process.id}`} className="mt-3 inline-block text-xs text-brand-600 hover:underline">
        Ver extração de IA (entradas, atividades, gaps, versões...)
      </Link>
    </div>
  );
}
