import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Network, Plus, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { Button, Card, Input, Label, Spinner, Textarea } from "../../components/ui";
import { RulesPanel } from "../../components/process/RulesPanel";
import type { ProcessSurvey, SurveyActor, SurveyInput, SurveyPendingInfo, SurveySystem } from "../../types/api";

const COMPLETENESS_ITEMS: { key: string; label: string }[] = [
  { key: "contexto_compreensivel", label: "Contexto compreensível" },
  { key: "escopo_limites", label: "Escopo e limites definidos" },
  { key: "volumetria", label: "Volumetria informada" },
  { key: "sla", label: "SLA informado" },
  { key: "tma", label: "TMA informado" },
  { key: "atores", label: "Atores e responsabilidades atuais identificados" },
  { key: "sistemas", label: "Sistemas, telas e ferramentas identificados" },
  { key: "entradas", label: "Entradas documentadas" },
  { key: "bpmn_as_is", label: "BPMN AS IS anexado/referenciado e versionado" },
  { key: "fluxo_as_is", label: "Fluxo AS IS detalhado na mesma sequência do BPMN" },
  { key: "evidencias", label: "Evidências associadas às etapas quando aplicável" },
  { key: "regras_atuais", label: "Regras atuais documentadas" },
  { key: "excecoes", label: "Exceções e contingências documentadas" },
  { key: "arquivos_dados", label: "Arquivos e dados documentados" },
  { key: "acessos_perfis", label: "Acessos e perfis atuais documentados" },
  { key: "glossario", label: "Glossário atualizado" },
  { key: "pendencias", label: "Pendências possuem responsável, prazo e status" },
  { key: "sem_propostas", label: "Não foram incluídas propostas de melhoria ou solução técnica" },
  { key: "terminologia", label: "Terminologia padronizada" },
];

const VALIDATION_ITEMS: { key: string; label: string }[] = [
  { key: "contexto", label: "Contexto validado" },
  { key: "escopo", label: "Escopo validado" },
  { key: "fluxo_as_is", label: "Fluxo AS IS validado" },
  { key: "bpmn_as_is", label: "BPMN AS IS validado" },
  { key: "regras", label: "Regras atuais validadas" },
  { key: "excecoes", label: "Exceções validadas" },
  { key: "sistemas_telas", label: "Sistemas e telas validados" },
  { key: "volumetria_sla_tma", label: "Volumetria, SLA e TMA validados" },
  { key: "evidencias", label: "Evidências validadas" },
  { key: "acessos_perfis", label: "Acessos/perfis atuais validados" },
  { key: "pendencias", label: "Pendências tratadas ou formalizadas" },
  { key: "terminologia", label: "Terminologia validada" },
  { key: "documento", label: "Documento" },
  { key: "aprovado", label: "Aprovado" },
];

type FormState = {
  context: string;
  scopeStart: string;
  scopeEnd: string;
  scopeIn: string;
  scopeOut: string;
  volumetria: string;
  tma: string;
  sla: string;
  frequencia: string;
  diasExecucao: string;
  horarioOperacao: string;
  capacidade: string;
  formaFaturamento: string;
  outrosIndicadores: string;
  actors: SurveyActor[];
  systems: SurveySystem[];
  inputs: SurveyInput[];
  flowEvidence: string;
  stepsDetail: string;
  executionContingency: string;
  filesAndData: string;
  accessProfiles: string;
  additionalInfo: string;
  pendingInfo: SurveyPendingInfo[];
  completenessChecklist: Record<string, boolean>;
  validationChecklist: Record<string, boolean>;
};

const EMPTY_FORM: FormState = {
  context: "",
  scopeStart: "",
  scopeEnd: "",
  scopeIn: "",
  scopeOut: "",
  volumetria: "",
  tma: "",
  sla: "",
  frequencia: "",
  diasExecucao: "",
  horarioOperacao: "",
  capacidade: "",
  formaFaturamento: "",
  outrosIndicadores: "",
  actors: [],
  systems: [],
  inputs: [],
  flowEvidence: "",
  stepsDetail: "",
  executionContingency: "",
  filesAndData: "",
  accessProfiles: "",
  additionalInfo: "",
  pendingInfo: [],
  completenessChecklist: {},
  validationChecklist: {},
};

function surveyToForm(survey: ProcessSurvey | null): FormState {
  if (!survey) return EMPTY_FORM;
  return {
    context: survey.context ?? "",
    scopeStart: survey.scopeStart ?? "",
    scopeEnd: survey.scopeEnd ?? "",
    scopeIn: survey.scopeIn ?? "",
    scopeOut: survey.scopeOut ?? "",
    volumetria: survey.volumetria ?? "",
    tma: survey.tma ?? "",
    sla: survey.sla ?? "",
    frequencia: survey.frequencia ?? "",
    diasExecucao: survey.diasExecucao ?? "",
    horarioOperacao: survey.horarioOperacao ?? "",
    capacidade: survey.capacidade ?? "",
    formaFaturamento: survey.formaFaturamento ?? "",
    outrosIndicadores: survey.outrosIndicadores ?? "",
    actors: survey.actors ?? [],
    systems: survey.systems ?? [],
    inputs: survey.inputs ?? [],
    flowEvidence: survey.flowEvidence ?? "",
    stepsDetail: survey.stepsDetail ?? "",
    executionContingency: survey.executionContingency ?? "",
    filesAndData: survey.filesAndData ?? "",
    accessProfiles: survey.accessProfiles ?? "",
    additionalInfo: survey.additionalInfo ?? "",
    pendingInfo: survey.pendingInfo ?? [],
    completenessChecklist: survey.completenessChecklist ?? {},
    validationChecklist: survey.validationChecklist ?? {},
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {children}
    </Card>
  );
}

export function LevantamentoStep({ processId }: { processId: string }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const surveyQuery = useQuery({
    queryKey: ["process-survey", processId],
    queryFn: async () => (await api.get<ProcessSurvey | null>(`/processes/${processId}/survey`)).data,
  });

  useEffect(() => {
    if (surveyQuery.data !== undefined) setForm(surveyToForm(surveyQuery.data));
  }, [surveyQuery.data]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.put(`/processes/${processId}/survey`, form);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (surveyQuery.isLoading) {
    return (
      <div className="p-6">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Section title="Contexto do Processo">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          O que é o processo, para que serve, o que o inicia, quem executa, quem recebe o resultado e qual é o
          resultado atual.
        </p>
        <Textarea
          rows={4}
          value={form.context}
          onChange={(e) => set("context", e.target.value)}
          placeholder='Ex: "A fila [NOME] corresponde a uma tarefa aberta no sistema [SISTEMA] pela operação quando [EVENTO]. A tarefa reúne as informações necessárias para [TRATATIVA]."'
        />
      </Section>

      <Section title="Escopo do Processo">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Início do processo</Label>
            <Input value={form.scopeStart} onChange={(e) => set("scopeStart", e.target.value)} />
          </div>
          <div>
            <Label>Fim do processo</Label>
            <Input value={form.scopeEnd} onChange={(e) => set("scopeEnd", e.target.value)} />
          </div>
          <div>
            <Label>Dentro do escopo</Label>
            <Textarea rows={2} value={form.scopeIn} onChange={(e) => set("scopeIn", e.target.value)} />
          </div>
          <div>
            <Label>Fora do escopo</Label>
            <Textarea rows={2} value={form.scopeOut} onChange={(e) => set("scopeOut", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Dados Operacionais">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label>Volumetria</Label>
            <Input value={form.volumetria} onChange={(e) => set("volumetria", e.target.value)} />
          </div>
          <div>
            <Label>TMA</Label>
            <Input value={form.tma} onChange={(e) => set("tma", e.target.value)} />
          </div>
          <div>
            <Label>SLA</Label>
            <Input value={form.sla} onChange={(e) => set("sla", e.target.value)} />
          </div>
          <div>
            <Label>Frequência</Label>
            <Input value={form.frequencia} onChange={(e) => set("frequencia", e.target.value)} />
          </div>
          <div>
            <Label>Dias de execução</Label>
            <Input value={form.diasExecucao} onChange={(e) => set("diasExecucao", e.target.value)} />
          </div>
          <div>
            <Label>Horário de operação</Label>
            <Input value={form.horarioOperacao} onChange={(e) => set("horarioOperacao", e.target.value)} />
          </div>
          <div>
            <Label>Capacidade</Label>
            <Input value={form.capacidade} onChange={(e) => set("capacidade", e.target.value)} />
          </div>
          <div>
            <Label>Forma de faturamento</Label>
            <Input value={form.formaFaturamento} onChange={(e) => set("formaFaturamento", e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label>Outros indicadores</Label>
            <Textarea rows={2} value={form.outrosIndicadores} onChange={(e) => set("outrosIndicadores", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Atores e Responsabilidades">
        <ListEditor
          items={form.actors}
          onChange={(v) => set("actors", v)}
          empty={{ area: "", responsible: "" }}
          addLabel="Novo ator"
          render={(item, update) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={item.area} onChange={(e) => update({ ...item, area: e.target.value })} placeholder="Área" />
              <Input
                value={item.responsible ?? ""}
                onChange={(e) => update({ ...item, responsible: e.target.value })}
                placeholder="Responsável"
              />
            </div>
          )}
        />
      </Section>

      <Section title="Sistemas e Ferramentas">
        <ListEditor
          items={form.systems}
          onChange={(v) => set("systems", v)}
          empty={{ system: "", usage: "" }}
          addLabel="Novo sistema"
          render={(item, update) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={item.system} onChange={(e) => update({ ...item, system: e.target.value })} placeholder="Sistema" />
              <Input value={item.usage ?? ""} onChange={(e) => update({ ...item, usage: e.target.value })} placeholder="Uso no processo" />
            </div>
          )}
        />
      </Section>

      <Section title="Entradas do Processo">
        <ListEditor
          items={form.inputs}
          onChange={(v) => set("inputs", v)}
          empty={{ input: "", origin: "" }}
          addLabel="Nova entrada"
          render={(item, update) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={item.input} onChange={(e) => update({ ...item, input: e.target.value })} placeholder="Entrada" />
              <Input value={item.origin ?? ""} onChange={(e) => update({ ...item, origin: e.target.value })} placeholder="Origem" />
            </div>
          )}
        />
      </Section>

      <Section title="Fluxo e Evidências do Processo AS IS">
        <Textarea rows={3} value={form.flowEvidence} onChange={(e) => set("flowEvidence", e.target.value)} />
      </Section>

      <Section title="BPMN AS IS">
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          O fluxo é modelado no modelador BPMN — você pode conversar com a IA e clicar nos elementos do diagrama
          para editar.
        </p>
        <Link to={`/assistant/${processId}`}>
          <Button variant="secondary">
            <Network className="h-4 w-4" /> Abrir modelador BPMN
          </Button>
        </Link>
      </Section>

      <Section title="Detalhamento das Etapas">
        <Textarea rows={3} value={form.stepsDetail} onChange={(e) => set("stepsDetail", e.target.value)} />
      </Section>

      <Section title="Regras de Negócio Atuais">
        <RulesPanel processId={processId} />
      </Section>

      <Section title="Execução e Contingências Atuais">
        <Textarea rows={3} value={form.executionContingency} onChange={(e) => set("executionContingency", e.target.value)} />
      </Section>

      <Section title="Arquivo e Dados">
        <Textarea rows={3} value={form.filesAndData} onChange={(e) => set("filesAndData", e.target.value)} />
      </Section>

      <Section title="Acesso e Perfis Atuais">
        <Textarea rows={3} value={form.accessProfiles} onChange={(e) => set("accessProfiles", e.target.value)} />
      </Section>

      <Section title="Informações Complementares, Orientações e Exemplos">
        <Textarea rows={3} value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} />
      </Section>

      <Section title="Informações Pendentes">
        <ListEditor
          items={form.pendingInfo}
          onChange={(v) => set("pendingInfo", v)}
          empty={{ description: "", responsible: "", deadline: "", status: "" }}
          addLabel="Nova pendência"
          render={(item, update) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <Input
                className="sm:col-span-2"
                value={item.description}
                onChange={(e) => update({ ...item, description: e.target.value })}
                placeholder="Descrição"
              />
              <Input value={item.responsible ?? ""} onChange={(e) => update({ ...item, responsible: e.target.value })} placeholder="Responsável" />
              <Input value={item.deadline ?? ""} onChange={(e) => update({ ...item, deadline: e.target.value })} placeholder="Prazo" />
            </div>
          )}
        />
      </Section>

      <Section title="Check List de Completude">
        <ChecklistEditor items={COMPLETENESS_ITEMS} value={form.completenessChecklist} onChange={(v) => set("completenessChecklist", v)} />
      </Section>

      <Section title="Checklist de Validação">
        <ChecklistEditor items={VALIDATION_ITEMS} value={form.validationChecklist} onChange={(v) => set("validationChecklist", v)} />
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white/90 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Levantamento"}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Salvo.</span>}
      </div>
    </div>
  );
}

function ListEditor<T>({
  items,
  onChange,
  empty,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  empty: T;
  addLabel: string;
  render: (item: T, update: (item: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1">
            {render(item, (next) => onChange(items.map((it, idx) => (idx === i ? next : it))))}
          </div>
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="mt-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, empty])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

function ChecklistEditor({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={!!value[item.key]}
            onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}
