import { createContext, useContext, useState, type ReactNode } from "react";

interface SelectedProcessContextValue {
  processId: string;
  setProcessId: (id: string) => void;
}

const STORAGE_KEY = "processai_selected_process";
const SelectedProcessContext = createContext<SelectedProcessContextValue | undefined>(undefined);

export function SelectedProcessProvider({ children }: { children: ReactNode }) {
  const [processId, setProcessIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  function setProcessId(id: string) {
    setProcessIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado, etc.) — seleção só não persiste entre sessões.
    }
  }

  return (
    <SelectedProcessContext.Provider value={{ processId, setProcessId }}>
      {children}
    </SelectedProcessContext.Provider>
  );
}

export function useSelectedProcess() {
  const ctx = useContext(SelectedProcessContext);
  if (!ctx) throw new Error("useSelectedProcess deve ser usado dentro de SelectedProcessProvider");
  return ctx;
}
