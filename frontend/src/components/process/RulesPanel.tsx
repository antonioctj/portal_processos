import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { Button, Card, EmptyState, Input, Label, Spinner, Textarea } from "../ui";
import type { ProcessRule } from "../../types/api";

export function RulesPanel({ processId }: { processId: string }) {
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
