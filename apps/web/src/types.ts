export interface StatsOverview {
  monitoredCount: number;
  anomalyCount: number;
  byRisk: { high: number; mid: number; low: number };
  closedRate: number;
  dismissedCount: number;
}

export interface PriceRecord {
  id: string;
  miCode: string;
  generic: string;
  brand: string;
  manufacturer: string;
  spec: string;
  form: string;
  category: "drug" | "consumable";
  price: number;
  tenderPrice: number | null;
  agreedVolume: number | null;
  actualVolume: number | null;
  listingPrice: number | null;
  hospital: string;
  region: string;
  date: string;
}

export interface PriceDetail extends PriceRecord {
  history: Array<{ date: string; price: number }>;
}

export interface DimensionResult {
  type: string;
  base: number;
  actual: number;
  deviation: number;
  hit: boolean;
  detail: string;
}

export interface Anomaly {
  id: string;
  recordId: string;
  dimensions: DimensionResult[];
  riskScore: number;
  riskLevel: "high" | "mid" | "low";
  confidence: number;
  status: string;
  createdAt: string;
}

export interface AnomalyDetail extends Anomaly {
  record: PriceRecord;
}

export interface TraceStep {
  step: number;
  tool: string;
  input: unknown;
  output: unknown;
}

export interface InvestigateResult {
  trace: TraceStep[];
  evidence: Record<string, unknown>;
  explanation: string;
  suggestedDisposition: string;
}

export interface Rebuttal {
  hypothesis: string;
  checked: boolean;
  refuted: boolean;
  reason: string;
}

export interface ChallengeResult {
  rebuttals: Rebuttal[];
  confidence: number;
  adjustedRiskLevel: "high" | "mid" | "low";
  verdict: "confirmed" | "review" | "dismissed";
}

export interface AiModelStatus {
  mode: "mock" | "remote";
  model: string;
  provider: "openai-compatible";
  baseConfigured: boolean;
  keyConfigured: boolean;
}

export interface AiReasoningStep {
  phase: "collect" | "rank" | "recommend" | "challenge" | "conclude";
  title: string;
  detail: string;
}

export interface AiPriority {
  anomalyId: string;
  recordId: string;
  title: string;
  level: "high" | "mid" | "low";
  riskScore: number;
  reason: string;
  target: "investigate" | "workorder" | "review";
}

export interface AiSuggestedAction {
  label: string;
  target: "investigate" | "workorder" | "review";
  anomalyId?: string;
}

export interface AiBriefing {
  generatedAt: string;
  summary: string;
  priorities: AiPriority[];
  actions: AiSuggestedAction[];
  reasoningSteps: AiReasoningStep[];
}

export interface AiInvestigationReport {
  anomalyId: string;
  recordId: string;
  generatedAt: string;
  investigation: InvestigateResult;
  challenge: ChallengeResult;
  conclusion: {
    verdict: ChallengeResult["verdict"];
    riskLevel: "high" | "mid" | "low";
    confidence: number;
    suggestedDisposition: string;
    summary: string;
  };
  reasoningSteps: AiReasoningStep[];
  nextActions: AiSuggestedAction[];
}

export type WorkOrderStatus = "pending" | "processing" | "done" | "closed";

export interface WorkOrder {
  id: string;
  anomalyId: string;
  type: string;
  status: WorkOrderStatus;
  assignee: string | null;
  sla?: string | null;
  correctedPrice?: number | null;
  note: string | null;
  createdAt?: string;
  updatedAt: string;
  riskLevel?: "high" | "mid" | "low";
  riskScore?: number;
  generic?: string;
  hospital?: string;
  region?: string;
  currentStep?: string;
  nextStep?: string;
  lastEvent?: string | null;
}

export interface BoardColumn {
  status: WorkOrderStatus;
  cards: WorkOrder[];
}

export interface BoardResult {
  columns: BoardColumn[];
}

export interface RecheckResult {
  corrected: boolean;
  latestPrice: number;
  deviationNow: number | null;
  canClose: boolean;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export type PageKey = "workspace" | "anomalies" | "work-orders" | "recheck" | "data-rules";

export interface TaskItem {
  id: string;
  type: "investigate" | "create_work_order" | "advance" | "recheck" | "close";
  label: string;
  targetPage: PageKey;
  targetId?: string;
  priority: "high" | "mid" | "low";
  anomalyId?: string;
  workOrderId?: string;
}

export interface SuggestedLink {
  label: string;
  page: PageKey;
  id?: string;
}

export interface CopilotContext {
  stats: StatsOverview;
  brief: AiBriefing | null;
  tasks: TaskItem[];
  modelStatus: AiModelStatus;
  pendingAnomalyCount: number;
  pendingReviewCount: number;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotChatResponse {
  answer: string;
  citations: Array<{ type: string; id: string; label: string }>;
  suggestedTasks: TaskItem[];
  suggestedLinks: SuggestedLink[];
}

export interface RuleConfig {
  tenderRatio: number;
  historyMoM: number;
  regionalDev: number;
  volumeRate: number;
}