import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "../../components/ui";
import type { MemoryTemplate, MemoryTemplateType } from "../../types/api";

const TYPE_LABEL: Record<MemoryTemplateType, string> = {
  DOCUMENT_TEMPLATE: "Modelo de documento final",
  BPMN_PATTERN: "Padrão de fluxo BPMN",
  EXAMPLE_PROCESS: "Exemplo de processo documentado",
};

const emptyForm = {
  type: "DOCUMENT_TEMPLATE" as MemoryTemplateType,
  name: "",
  description: "",
  content: "",
};

export function MemoryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["memory-templates"],
    queryFn: async () => (await api.get<MemoryTemplate[]>("/memory")).data,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!form.content.trim() && !file) {
      setError("Informe um conteúdo em texto ou anexe um arquivo");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("type", form.type);
      formData.append("name", form.name);
      if (form.description) formData.append("description", form.description);
      if (form.content) formData.append("content", form.content);
      if (file) formData.append("file", file);

      await api.post("/memory", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(emptyForm);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["memory-templates"] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/memory/${id}`);
    queryClient.invalidateQueries({ queryKey: ["memory-templates"] });
  }

  return (
    <div>
      <PageHeader
        title="Memória"
        description="Modelos de documento, padrões de BPMN e exemplos de processos que a IA deve seguir ao gerar fluxos e documentos finais."
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Adicionar à memória
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        {showForm && (
          <Card className="p-5">
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MemoryTemplateType })}>
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Nome</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Modelo de relatório executivo" />
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Conteúdo / instruções em texto</Label>
                <Textarea
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Ex: convenção de nomes de raias, estrutura do relatório, etc."
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Arquivo (opcional — .pdf, .docx, .doc, .txt, .png, .jpg ou .webp)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
                />
              </div>

              {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar na memória"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {isLoading ? null : (
          <div className="space-y-3">
            {data?.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {t.url && t.mimeType?.startsWith("image/") && (
                    <img src={t.url} alt={t.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                      <Badge color="blue">{TYPE_LABEL[t.type]}</Badge>
                    </div>
                    {t.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.description}</p>}
                    {t.content && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">{t.content}</p>}
                    {t.url && !t.mimeType?.startsWith("image/") && (
                      <a href={t.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-600 hover:underline">
                        Ver arquivo anexado
                      </a>
                    )}
                  </div>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
            {data?.length === 0 && !showForm && (
              <Card className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum item na memória ainda. Cadastre modelos de documento, padrões de BPMN ou exemplos de
                processos para orientar a IA nas próximas gerações.
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
