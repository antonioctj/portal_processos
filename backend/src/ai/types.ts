// Camada abstrata "AI Provider" — permite trocar o provedor de IA (OpenAI, Anthropic,
// Google, Azure OpenAI, modelos locais) sem alterar o restante do sistema.
// Ver seção 21 da especificação.

export interface AIExtractedField<T> {
  value: T;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Trecho do documento ou justificativa que sustenta o valor. "Não identificado no documento" quando ausente. */
  evidence: string;
}

export interface ExtractedInput {
  name: string;
  origin: string;
  type: string;
  required: boolean | null;
  quality: string | null;
  notes: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
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
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface ExtractedOutput {
  name: string;
  type: string;
  destination: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface ExtractedDecision {
  condition: string;
  yesPath: string | null;
  noPath: string | null;
  responsible: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface ExtractedException {
  description: string;
  type: string;
  handling: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
}

export interface ProcessOverview {
  name: string | null;
  objective: string | null;
  scope: string | null;
  start: string | null;
  end: string | null;
  area: string | null;
  owner: string | null;
}

export interface ExtractedProcess {
  overview: ProcessOverview;
  inputs: ExtractedInput[];
  activities: ExtractedActivity[];
  outputs: ExtractedOutput[];
  decisions: ExtractedDecision[];
  exceptions: ExtractedException[];
  systems: string[];
  rules: string[];
}

export interface IdentifiedGap {
  category: string;
  description: string;
  evidence: string;
  relatedElement: string | null;
  impact: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface IdentifiedOpportunity {
  title: string;
  description: string;
  affectedStep: string | null;
  currentProblem: string | null;
  benefit: string | null;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  dependencies: string | null;
  systemsInvolved: string | null;
  solutionType: string;
  evidence: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
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

export interface BpmnElementDraft {
  id: string;
  type: BpmnElementKind;
  name: string;
  laneId?: string | null;
  responsible?: string | null;
  system?: string | null;
}

export interface BpmnConnectionDraft {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  condition?: string | null;
}

export interface BpmnDraft {
  elements: BpmnElementDraft[];
  connections: BpmnConnectionDraft[];
  lanes?: { id: string; name: string }[];
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

export interface ChatAction {
  type:
    | "ADD_ELEMENT"
    | "ADD_CONNECTION"
    | "UPDATE_ELEMENT"
    | "REMOVE_ELEMENT"
    | "ADD_GATEWAY"
    | "SET_PROPERTY"
    | "NONE";
  description: string;
  payload?: unknown;
}

export interface ChatReply {
  message: string;
  actions: ChatAction[];
  updatedBpmn?: BpmnDraft;
  question?: {
    text: string;
    options?: string[];
  };
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface AIResult<T> {
  data: T;
  usage: UsageInfo;
}

export interface AIProviderConfig {
  apiKey: string;
  endpoint?: string | null;
  temperature?: number;
  maxTokens?: number;
  analysisModel?: string | null;
  generationModel?: string | null;
}

export interface AIProvider {
  readonly name: string;

  testConnection(): Promise<{ ok: boolean; message: string }>;

  analyzeDocument(text: string, context?: string): Promise<AIResult<ExtractedProcess>>;
  extractProcess(text: string): Promise<AIResult<ExtractedProcess>>;
  identifyGaps(process: ExtractedProcess): Promise<AIResult<IdentifiedGap[]>>;
  identifyOpportunities(process: ExtractedProcess): Promise<AIResult<IdentifiedOpportunity[]>>;
  generateProcess(description: string): Promise<AIResult<ExtractedProcess>>;
  generateBPMN(process: ExtractedProcess): Promise<AIResult<BpmnDraft>>;
  refineBPMN(
    currentBpmn: BpmnDraft,
    instruction: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[]
  ): Promise<AIResult<ChatReply>>;
  analyzeBPMN(bpmn: BpmnDraft): Promise<AIResult<BpmnHealthReport>>;
  generateReport(payload: Record<string, unknown>): Promise<AIResult<string>>;
}
