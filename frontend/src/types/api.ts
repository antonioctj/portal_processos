export type UserRole = "ADMIN" | "MANAGER" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export type ProcessStatus = "DRAFT" | "IN_ANALYSIS" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export interface ProcessSummary {
  id: string;
  name: string;
  code: string | null;
  status: ProcessStatus;
  healthScore: number | null;
  area: string | null;
  currentVersion: string;
  updatedAt: string;
  owner?: { id: string; name: string } | null;
  _count?: { gaps: number; opportunities: number };
}

export interface ProcessDetail extends ProcessSummary {
  description: string | null;
  objective: string | null;
  scope: string | null;
  department: string | null;
  category: string | null;
  parentId: string | null;
  createdAt: string;
  gaps: Gap[];
  opportunities: Opportunity[];
  documents: { document: DocumentItem }[];
}

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type SourceType = "DOCUMENT" | "CHAT" | "AI_SUGGESTION" | "MANUAL";

export interface ExtractedInput {
  name: string;
  origin: string;
  type: string;
  required: boolean | null;
  quality: string | null;
  notes: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedActivity {
  name: string;
  description: string | null;
  responsible: string | null;
  area: string | null;
  system: string | null;
  input: string | null;
  output: string | null;
  estimatedTime: string | null;
  frequency: string | null;
  rule: string | null;
  isManual: boolean | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedOutput {
  name: string;
  type: string;
  destination: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedDecision {
  condition: string;
  yesPath: string | null;
  noPath: string | null;
  responsible: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedException {
  description: string;
  type: string;
  handling: string | null;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedProcess {
  overview: {
    name: string | null;
    objective: string | null;
    scope: string | null;
    start: string | null;
    end: string | null;
    area: string | null;
    owner: string | null;
  };
  inputs: ExtractedInput[];
  activities: ExtractedActivity[];
  outputs: ExtractedOutput[];
  decisions: ExtractedDecision[];
  exceptions: ExtractedException[];
  systems: string[];
  rules: string[];
}

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GapStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK" | "WONT_FIX";

export interface Gap {
  id: string;
  processId: string;
  category: string;
  description: string;
  evidence: string | null;
  impact: string | null;
  severity: Severity;
  recommendation: string | null;
  status: GapStatus;
  responsibleId: string | null;
  dueDate: string | null;
  confidence: ConfidenceLevel;
  sourceType: SourceType;
  sourceRef: string | null;
  createdAt: string;
  process?: { id: string; name: string };
  responsible?: { id: string; name: string } | null;
  element?: { id: string; name: string } | null;
}

export type OpportunityStatus =
  | "IDENTIFIED"
  | "UNDER_EVALUATION"
  | "APPROVED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "REJECTED";
export type Complexity = "LOW" | "MEDIUM" | "HIGH";

export interface Opportunity {
  id: string;
  processId: string;
  title: string;
  description: string | null;
  currentProblem: string | null;
  benefit: string | null;
  complexity: Complexity;
  dependencies: string | null;
  systemsInvolved: string | null;
  solutionType: string;
  evidence: string | null;
  status: OpportunityStatus;
  confidence: ConfidenceLevel;
  sourceType: SourceType;
  sourceRef: string | null;
  createdAt: string;
  process?: { id: string; name: string };
  element?: { id: string; name: string } | null;
}

export type DocumentType = "PDF" | "DOCX" | "XLSX" | "CSV" | "TXT" | "IMAGE" | "OTHER";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  sizeBytes: number;
  hash: string;
  errorMessage: string | null;
  createdAt: string;
  processes?: { process: { id: string; name: string } }[];
}

export type AnalysisStep =
  | "EXTRACTING_CONTENT"
  | "IDENTIFYING_CONTEXT"
  | "IDENTIFYING_PROCESS"
  | "IDENTIFYING_ACTIVITIES"
  | "IDENTIFYING_RESPONSIBLES"
  | "IDENTIFYING_INPUTS"
  | "IDENTIFYING_OUTPUTS"
  | "IDENTIFYING_DECISIONS"
  | "IDENTIFYING_RULES"
  | "IDENTIFYING_EXCEPTIONS"
  | "IDENTIFYING_SYSTEMS"
  | "IDENTIFYING_GAPS"
  | "IDENTIFYING_OPPORTUNITIES";

export const ANALYSIS_STEP_LABELS: Record<AnalysisStep, string> = {
  EXTRACTING_CONTENT: "Extraindo conteúdo",
  IDENTIFYING_CONTEXT: "Identificando contexto",
  IDENTIFYING_PROCESS: "Identificando processo",
  IDENTIFYING_ACTIVITIES: "Identificando atividades",
  IDENTIFYING_RESPONSIBLES: "Identificando responsáveis",
  IDENTIFYING_INPUTS: "Identificando entradas",
  IDENTIFYING_OUTPUTS: "Identificando saídas",
  IDENTIFYING_DECISIONS: "Identificando decisões",
  IDENTIFYING_RULES: "Identificando regras",
  IDENTIFYING_EXCEPTIONS: "Identificando exceções",
  IDENTIFYING_SYSTEMS: "Identificando sistemas",
  IDENTIFYING_GAPS: "Identificando gaps",
  IDENTIFYING_OPPORTUNITIES: "Identificando oportunidades",
};

export interface DashboardData {
  cards: {
    totalProcesses: number;
    inAnalysis: number;
    completed: number;
    totalGaps: number;
    criticalGaps: number;
    totalOpportunities: number;
    automationOpportunities: number;
    avgHealth: number | null;
  };
  latestProcesses: ProcessSummary[];
  latestVersions: {
    id: string;
    version: string;
    type: string;
    label: string | null;
    createdAt: string;
    process: { id: string; name: string };
    createdBy: { name: string };
  }[];
}

export type AIProviderType = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "AZURE_OPENAI" | "LOCAL" | "OTHER";

export interface AIProviderItem {
  id: string;
  type: AIProviderType;
  label: string;
  apiKeyMasked: string | null;
  endpoint: string | null;
  temperature: number;
  maxTokens: number;
  analysisModel: string | null;
  generationModel: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  actions?: { actions: ChatAction[]; question: { text: string; options?: string[] } | null; appliedBpmn: boolean } | null;
  createdAt: string;
}

export interface ChatAction {
  type: string;
  description: string;
  payload?: unknown;
}

export type BpmnElementKind =
  | "START_EVENT"
  | "END_EVENT"
  | "INTERMEDIATE_EVENT"
  | "TASK"
  | "USER_TASK"
  | "SERVICE_TASK"
  | "MANUAL_TASK"
  | "SUBPROCESS"
  | "EXCLUSIVE_GATEWAY"
  | "PARALLEL_GATEWAY"
  | "INCLUSIVE_GATEWAY"
  | "POOL"
  | "LANE"
  | "DATA_OBJECT";

export interface BpmnDraftElement {
  id: string;
  type: BpmnElementKind;
  name: string;
  laneId?: string | null;
  responsible?: string | null;
  system?: string | null;
}

export interface BpmnDraftConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  condition?: string | null;
}

export interface BpmnDraft {
  elements: BpmnDraftElement[];
  connections: BpmnDraftConnection[];
}

export interface BpmnHealthReport {
  score: number;
  breakdown: {
    completeness: number;
    clarity: number;
    control: number;
    automation: number;
    responsibilities: number;
    exceptions: number;
    risks: number;
  };
  findings: string[];
  criteria: string;
}
