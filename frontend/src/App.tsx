import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProcessListPage } from "./pages/processes/ProcessListPage";
import { NewProcessPage } from "./pages/processes/NewProcessPage";
import { ProcessDetailPage } from "./pages/processes/ProcessDetailPage";
import { DocumentAnalyzePage } from "./pages/documents/DocumentAnalyzePage";
import { DocumentLibraryPage } from "./pages/documents/DocumentLibraryPage";
import { GapsPage } from "./pages/gaps/GapsPage";
import { OpportunitiesPage } from "./pages/opportunities/OpportunitiesPage";
import { AssistantPage } from "./pages/assistant/AssistantPage";
import { AiProvidersPage } from "./pages/settings/AiProvidersPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { AuditPage } from "./pages/audit/AuditPage";
import { UsersPage } from "./pages/users/UsersPage";
import { Spinner } from "./components/ui";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/processes" element={<ProcessListPage />} />
        <Route path="/processes/new" element={<NewProcessPage />} />
        <Route path="/processes/:id" element={<ProcessDetailPage />} />
        <Route path="/documents" element={<DocumentAnalyzePage />} />
        <Route path="/documents/library" element={<DocumentLibraryPage />} />
        <Route path="/gaps" element={<GapsPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/assistant/:processId" element={<AssistantPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/ai-providers" element={<AiProvidersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
