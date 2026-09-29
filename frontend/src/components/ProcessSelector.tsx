import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { api } from "../lib/api";
import { Select } from "./ui";
import { useSelectedProcess } from "../store/SelectedProcessContext";
import type { ProcessSummary } from "../types/api";

export function ProcessSelector({ onChange }: { onChange?: (processId: string) => void }) {
  const { processId, setProcessId } = useSelectedProcess();
  const { data } = useQuery({
    queryKey: ["processes-select"],
    queryFn: async () => (await api.get<ProcessSummary[]>("/processes")).data,
  });

  return (
    <div className="flex items-center gap-2">
      <Workflow className="h-4 w-4 shrink-0 text-slate-400" />
      <Select
        className="w-64"
        value={processId}
        onChange={(e) => {
          setProcessId(e.target.value);
          onChange?.(e.target.value);
        }}
      >
        <option value="">Todos os processos</option>
        {data?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
