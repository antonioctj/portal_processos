import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Card, Input, Label, Select } from "../../components/ui";
import type { AIProviderItem, AIProviderType } from "../../types/api";

const PROVIDER_LABEL: Record<AIProviderType, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google",
  AZURE_OPENAI: "Azure OpenAI",
  LOCAL: "Modelo local",
  OTHER: "Outro",
};

const emptyForm = {
  type: "OPENAI" as AIProviderType,
  label: "",
  apiKey: "",
  endpoint: "",
  temperature: 0.2,
  maxTokens: 4096,
  analysisModel: "",
  generationModel: "",
};

export function AiProvidersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: async () => (await api.get<AIProviderItem[]>("/ai-providers")).data,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/ai-providers", form);
      setForm(emptyForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleTest(id: string) {
    const { data } = await api.post(`/ai-providers/${id}/test`);
    setTestResults((prev) => ({ ...prev, [id]: data }));
    queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
  }

  async function handleDelete(id: string) {
    await api.delete(`/ai-providers/${id}`);
    queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
  }

  async function handleSetDefault(id: string) {
    await api.patch(`/ai-providers/${id}`, { isDefault: true });
    queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
  }

  return (
    <div>
      <PageHeader
        title="Configurações → Inteligência Artificial → APIs"
        description="Configure os provedores de IA usados para análise de documentos, chat e geração de BPMN. As chaves são armazenadas criptografadas e nunca exibidas por completo."
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Adicionar provedor
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        {showForm && (
          <Card className="p-5">
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Provedor</Label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AIProviderType })}>
                  {Object.entries(PROVIDER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Nome (rótulo)</Label>
                <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: OpenAI Produção" />
              </div>
              <div className="sm:col-span-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  required={form.type !== "LOCAL"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <Label>Endpoint (opcional)</Label>
                <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Temperatura</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={2}
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Limite de tokens</Label>
                <Input
                  type="number"
                  min={256}
                  value={form.maxTokens}
                  onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Modelo para análise</Label>
                <Input
                  value={form.analysisModel}
                  onChange={(e) => setForm({ ...form, analysisModel: e.target.value })}
                  placeholder={form.type === "OPENAI" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001"}
                />
              </div>
              <div>
                <Label>Modelo para geração de BPMN</Label>
                <Input
                  value={form.generationModel}
                  onChange={(e) => setForm({ ...form, generationModel: e.target.value })}
                  placeholder={form.type === "OPENAI" ? "gpt-4o" : "claude-sonnet-5"}
                />
              </div>

              {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar provedor</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? null : (
          <div className="space-y-3">
            {data?.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{p.label}</p>
                      <Badge color="blue">{PROVIDER_LABEL[p.type]}</Badge>
                      {p.isDefault && <Badge color="purple">Padrão</Badge>}
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {p.apiKeyMasked ?? "Sem chave configurada"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Análise: {p.analysisModel || "padrão"} · Geração: {p.generationModel || "padrão"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(testResults[p.id] || p.lastTestOk != null) && (
                      <span className="flex items-center gap-1 text-xs">
                        {(testResults[p.id]?.ok ?? p.lastTestOk) ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {testResults[p.id]?.message}
                      </span>
                    )}
                    {!p.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(p.id)}>
                        Definir como padrão
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => handleTest(p.id)}>
                      Testar conexão
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {data?.length === 0 && !showForm && (
              <Card className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum provedor configurado. Sem um provedor ativo, o ProcessAI usa um mecanismo heurístico local
                (sem IA generativa) como fallback funcional.
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
