import { useCallback, useRef, useState } from "react";
import { getToken } from "../lib/api";
import { ANALYSIS_STEP_LABELS, type AnalysisStep } from "../types/api";

export interface StepState {
  step: AnalysisStep;
  status: "PENDING" | "RUNNING" | "COMPLETED";
}

const ALL_STEPS = Object.keys(ANALYSIS_STEP_LABELS) as AnalysisStep[];

export function useAnalysisStream(processId: string) {
  const [steps, setSteps] = useState<StepState[]>(ALL_STEPS.map((step) => ({ step, status: "PENDING" })));
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const start = useCallback(
    (documentId?: string) => {
      setSteps(ALL_STEPS.map((step) => ({ step, status: "PENDING" })));
      setError(null);
      setResult(null);
      setIsRunning(true);

      const token = getToken();
      const params = new URLSearchParams({ token: token ?? "" });
      if (documentId) params.set("documentId", documentId);

      const source = new EventSource(`/api/processes/${processId}/analyze/stream?${params.toString()}`);
      sourceRef.current = source;

      source.addEventListener("progress", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { step: AnalysisStep; status: "RUNNING" | "COMPLETED" };
        setSteps((prev) => prev.map((s) => (s.step === data.step ? { ...s, status: data.status } : s)));
      });

      source.addEventListener("done", (event) => {
        setResult(JSON.parse((event as MessageEvent).data));
        setIsRunning(false);
        source.close();
      });

      source.addEventListener("error", (event) => {
        const msgEvent = event as MessageEvent;
        if (msgEvent.data) {
          try {
            const parsed = JSON.parse(msgEvent.data);
            setError(parsed.message || "Erro na análise");
          } catch {
            setError("Erro na análise");
          }
        } else {
          setError("Conexão perdida com o servidor durante a análise");
        }
        setIsRunning(false);
        source.close();
      });
    },
    [processId]
  );

  const stop = useCallback(() => {
    sourceRef.current?.close();
    setIsRunning(false);
  }, []);

  return { steps, isRunning, error, result, start, stop };
}
