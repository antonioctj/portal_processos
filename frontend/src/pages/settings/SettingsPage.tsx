import { Link } from "react-router-dom";
import { Cpu, Users as UsersIcon, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../layouts/AppLayout";
import { Card } from "../../components/ui";
import { useAuth } from "../../store/AuthContext";

export function SettingsPage() {
  const { organization, user } = useAuth();

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências da organização e da plataforma" />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Organização</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Nome: {organization?.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Slug: {organization?.slug}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Usuário: {user?.name} ({user?.role})</p>
        </Card>

        <Link to="/settings/ai-providers">
          <Card className="flex items-start gap-3 p-5 hover:border-brand-300">
            <Cpu className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">APIs de IA</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure OpenAI, Anthropic e outros provedores</p>
            </div>
          </Card>
        </Link>

        <Link to="/users">
          <Card className="flex items-start gap-3 p-5 hover:border-brand-300">
            <UsersIcon className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Usuários</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os usuários da organização</p>
            </div>
          </Card>
        </Link>

        <Link to="/audit">
          <Card className="flex items-start gap-3 p-5 hover:border-brand-300">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Auditoria</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Logs de ações e consumo de IA</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
