import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { ANALYSIS_STEP_LABELS } from "../types/api";
import type { StepState } from "../hooks/useAnalysisStream";

export function AnalysisProgress({ steps }: { steps: StepState[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map(({ step, status }) => (
        <div key={step} className="flex items-center gap-2.5 text-sm">
          <div
            className={clsx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
              status === "COMPLETED" && "border-emerald-500 bg-emerald-500 text-white",
              status === "RUNNING" && "border-brand-500 text-brand-600",
              status === "PENDING" && "border-slate-300 text-transparent dark:border-slate-700"
            )}
          >
            {status === "COMPLETED" && <Check className="h-3 w-3" />}
            {status === "RUNNING" && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <span
            className={clsx(
              status === "PENDING" && "text-slate-400 dark:text-slate-600",
              status === "RUNNING" && "font-medium text-slate-900 dark:text-white",
              status === "COMPLETED" && "text-slate-600 dark:text-slate-300"
            )}
          >
            {ANALYSIS_STEP_LABELS[step]}
          </span>
        </div>
      ))}
    </div>
  );
}
