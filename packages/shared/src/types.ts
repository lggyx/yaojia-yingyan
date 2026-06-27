export type Category = "drug" | "consumable";
export type RiskLevel = "high" | "mid" | "low";
export type DimensionType = "tender" | "history" | "regional" | "alternative" | "volume" | "standardize";
export type AnomalyStatus = "pending" | "investigating" | "confirmed" | "review" | "dismissed" | "disposing" | "closed";
export type WorkOrderType = "remind" | "interview" | "inquiry" | "creditDeduct" | "priceCorrect" | "transfer";
export type WorkOrderStatus = "pending" | "processing" | "done" | "closed";

export interface PriceRecord {
  id: string; miCode: string; generic: string; brand: string; manufacturer: string;
  spec: string; form: string; category: Category;
  price: number; tenderPrice: number | null; agreedVolume: number | null;
  actualVolume: number | null; listingPrice: number | null;
  hospital: string; region: string; date: string;
}
export interface PriceHistoryPoint { miCode: string; region: string; date: string; price: number; }

export interface DimensionResult {
  type: DimensionType; base: number; actual: number; deviation: number; hit: boolean; detail: string;
}
export interface Anomaly {
  id: string; recordId: string; dimensions: DimensionResult[];
  riskScore: number; riskLevel: RiskLevel; confidence: number;
  status: AnomalyStatus; createdAt: string;
}
export interface Thresholds { tenderRatio: number; historyMoM: number; regionalDev: number; volumeRate: number; }

// 对抗校验：refuted=true 表示该假设成功解释价格为"合理"（异常被驳回）
export interface Rebuttal { hypothesis: string; checked: boolean; refuted: boolean; reason: string; }
export interface ChallengeResult {
  rebuttals: Rebuttal[]; confidence: number; adjustedRiskLevel: RiskLevel;
  verdict: "confirmed" | "review" | "dismissed";
}
export interface TraceStep { step: number; tool: string; input: unknown; output: unknown; }
export interface InvestigateResult {
  trace: TraceStep[]; evidence: Record<string, unknown>;
  explanation: string; suggestedDisposition: WorkOrderType;
}
export interface WorkOrder {
  id: string; anomalyId: string; type: WorkOrderType; status: WorkOrderStatus;
  assignee: string | null; sla: string | null; correctedPrice: number | null;
  note: string | null; createdAt: string; updatedAt: string;
}
export interface WorkOrderEvent {
  id: string; workOrderId: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string;
}
export interface StatsOverview {
  monitoredCount: number; anomalyCount: number;
  byRisk: { high: number; mid: number; low: number };
  closedRate: number; dismissedCount: number;
}
