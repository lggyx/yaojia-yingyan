import type { Database } from "bun:sqlite";
import type { AiInvestigationReport, Anomaly, PriceRecord } from "@shared/types";
import { challenge } from "./challenge";
import { investigate } from "./orchestrator";

const TS = "2026-06-27T00:00:00.000Z";

export async function generateReport(db: Database, anomaly: Anomaly, record: PriceRecord): Promise<AiInvestigationReport> {
  const [investigation, redTeam] = await Promise.all([
    investigate(db, anomaly, record),
    challenge(db, anomaly, record),
  ]);
  return {
    anomalyId: anomaly.id,
    recordId: anomaly.recordId,
    generatedAt: TS,
    investigation,
    challenge: redTeam,
    conclusion: {
      verdict: redTeam.verdict,
      riskLevel: redTeam.adjustedRiskLevel,
      confidence: redTeam.confidence,
      suggestedDisposition: investigation.suggestedDisposition,
      summary: `${record.generic} 当前判定为${redTeam.verdict}，建议采取 ${investigation.suggestedDisposition} 处置。`,
    },
    reasoningSteps: [
      { phase: "collect", title: "取证比价", detail: `调用 ${investigation.trace.length} 个证据工具，形成结构化证据链。` },
      { phase: "challenge", title: "红队反驳", detail: `检验 ${redTeam.rebuttals.length} 条可能合理解释，结论为 ${redTeam.verdict}。` },
      { phase: "conclude", title: "形成处置建议", detail: `置信度 ${redTeam.confidence}，建议工单类型 ${investigation.suggestedDisposition}。` },
    ],
    nextActions: [
      { label: "创建处置工单", target: "workorder", anomalyId: anomaly.id },
      { label: "进入人工复核", target: "review", anomalyId: anomaly.id },
    ],
  };
}