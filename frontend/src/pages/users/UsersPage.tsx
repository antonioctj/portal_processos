import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import { PageHeader } from "../../layouts/AppLayout";
import { Badge, Button, Card, Input, Label, Select } from "../../components/ui";
import { useAuth } from "../../store/AuthContext";
import type { User, UserRole } from "../../types/api";

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  ANALYST: "Analista",
  VIEWER: "Visualizador",
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "ANALYST" as UserRole });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", form);
      setForm({ name: "", email: "", role: "ANALYST" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function toggleActive(u: User) {
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários da organização"
        actions={
          isAdmin ? (
            <Button onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4" /> Convidar usuário
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4 p-6">
        {showForm && (
          <Card className="p-5">
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Nome</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
              <div className="sm:col-span-3">
                <Button type="submit">Enviar convite</Button>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Uma senha temporária será enviada por e-mail para o novo usuário.
                </p>
              </div>
            </form>
          </Card>
        )}

        {!isLoading && (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge color="blue">{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.isActive ? "green" : "slate"}>{u.isActive ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {u.id !== currentUser?.id && (
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                            {u.isActive ? "Desativar" : "Ativar"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
