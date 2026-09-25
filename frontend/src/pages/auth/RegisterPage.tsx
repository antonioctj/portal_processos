import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { Button, Input, Label } from "../../components/ui";
import { apiErrorMessage } from "../../lib/api";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ organizationName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Criar organização</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Comece a usar o ProcessAI gratuitamente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <Label>Nome da organização</Label>
            <Input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} placeholder="Minha Empresa" />
          </div>
          <div>
            <Label>Seu nome</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@empresa.com" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
