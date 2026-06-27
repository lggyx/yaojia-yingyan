import type { PriceRecord, PriceHistoryPoint, Thresholds, DimensionResult, Anomaly, RiskLevel } from "@shared/types";
import { DIM_SCORE, RISK_HIGH, RISK_MID } from "@shared/constants";
import { tenderDim, historyDim, regionalDim, volumeDim, alternativeDim } from "./dimensions";

export function aggregateRisk(dims: DimensionResult[]): { score: number; level: RiskLevel } {
  const hits = dims.filter(d => d.hit);
  if (hits.length === 0) return { score: 0, level: "low" };
  let score = hits.reduce((s, d) => s + DIM_SCORE[d.type], 0);
  if (hits.length >= 2) score += 10; // 多维共振加成
  score = Math.min(100, score);
  const level: RiskLevel = score >= RISK_HIGH ? "high" : score >= RISK_MID ? "mid" : "low";
  return { score, level };
}

export function detectOne(r: PriceRecord, ctx: { history: PriceHistoryPoint[]; all: PriceRecord[] }, t: Thresholds): Anomaly | null {
  const dims = [
    tenderDim(r, t),
    historyDim(r, ctx.history, t),
    regionalDim(r, ctx.all, t),
    volumeDim(r, t),
    alternativeDim(r, ctx.all),
  ].filter((d): d is DimensionResult => d !== null);
  if (!dims.some(d => d.hit)) return null;
  const { score, level } = aggregateRisk(dims);
  return { id: `A-${r.id}`, recordId: r.id, dimensions: dims, riskScore: score,
    riskLevel: level, confidence: 0, status: "pending", createdAt: r.date };
}

export function detectAll(records: PriceRecord[], history: PriceHistoryPoint[], t: Thresholds): Anomaly[] {
  const ctx = { history, all: records };
  return records.map(r => detectOne(r, ctx, t)).filter((a): a is Anomaly => a !== null);
}
