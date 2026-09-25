import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";
import type { Organization, User } from "../types/api";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { organizationName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setOrganization(data.organization);
    } catch {
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization ?? null);
    if (!data.organization) await loadMe();
  }, [loadMe]);

  const register = useCallback(
    async (input: { organizationName: string; name: string; email: string; password: string }) => {
      const { data } = await api.post("/auth/register", input);
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
