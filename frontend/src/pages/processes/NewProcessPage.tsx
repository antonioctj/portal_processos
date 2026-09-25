import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Button, Card, Input, Label, Textarea } from "../../components/ui";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  area: "",
  department: "",
  objective: "",
  scope: "",
  category: "",
};

export function NewProcessPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/processes", form);
      navigate(`/processes/${data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateWithAi() {
    if (!aiDescription.trim()) return;
    setError(null);
    setAiLoading(true);
    try {
      const { data } = await api.post("/processes/generate", { description: aiDescription });
      navigate(`/processes/${data.process.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Novo Processo" description="Cadastre manualmente ou peça para a IA criar o processo por você" />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Cadastro manual</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome do processo *</Label>
              <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="PROC-001" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <Label>Área responsável</Label>
              <Input value={form.area} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Objetivo</Label>
              <Textarea rows={2} value={form.objective} onChange={(e) => set("objective", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Escopo</Label>
              <Textarea rows={2} value={form.scope} onChange={(e) => set("scope", e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar processo"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Criar processo com IA</h2>
          </div>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Descreva em uma frase o processo desejado. A IA irá propor objetivo, escopo, atividades, responsáveis e o BPMN inicial para você revisar.
          </p>
          <Textarea
            rows={4}
            placeholder="Ex: Crie um processo de aprovação de compras"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
          />
          <Button className="mt-3 w-full" variant="secondary" onClick={handleGenerateWithAi} disabled={aiLoading || !aiDescription.trim()}>
            {aiLoading ? "Gerando processo..." : "Gerar com IA"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
