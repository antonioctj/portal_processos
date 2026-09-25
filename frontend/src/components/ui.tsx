import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import type { Severity, ConfidenceLevel } from "../types/api";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        variant === "primary" &&
          "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
        variant === "secondary" &&
          "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  color = "slate",
  className,
}: {
  children: ReactNode;
  color?: "slate" | "green" | "amber" | "orange" | "red" | "blue" | "purple";
  className?: string;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", colors[color], className)}>
      {children}
    </span>
  );
}

const SEVERITY_COLOR: Record<Severity, "green" | "amber" | "orange" | "red"> = {
  LOW: "green",
  MEDIUM: "amber",
  HIGH: "orange",
  CRITICAL: "red",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge color={SEVERITY_COLOR[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}

const CONFIDENCE_COLOR: Record<ConfidenceLevel, "green" | "amber" | "slate"> = {
  HIGH: "green",
  MEDIUM: "amber",
  LOW: "slate",
};
const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  return <Badge color={CONFIDENCE_COLOR[confidence]}>Confiança: {CONFIDENCE_LABEL[confidence]}</Badge>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        props.className
      )}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{children}</label>;
}
