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