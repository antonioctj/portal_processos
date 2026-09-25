import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutDashboard,
  Workflow,
  FilePlus2,
  FileSearch,
  Network,
  AlertTriangle,
  Lightbulb,
  Library,
  BarChart3,
  History,
  Settings,
  Cpu,
  Users,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../store/AuthContext";

const MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/processes", label: "Processos", icon: Workflow },
  { to: "/processes/new", label: "Novo Processo", icon: FilePlus2 },
  { to: "/documents", label: "Analisar Documento", icon: FileSearch },
  { to: "/assistant", label: "Modelador BPMN / Assistente IA", icon: Network },
  { to: "/gaps", label: "Gaps", icon: AlertTriangle },
  { to: "/opportunities", label: "Oportunidades", icon: Lightbulb },
  { to: "/documents/library", label: "Biblioteca de Documentos", icon: Library },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/audit", label: "Auditoria & Consumo de IA", icon: History },
  { to: "/settings/ai-providers", label: "APIs de IA", icon: Cpu },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppLayout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            P
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">ProcessAI</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">processo.site</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/users"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )
            }
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Usuários</span>
          </NavLink>
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{organization?.name}</p>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Alternar tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
