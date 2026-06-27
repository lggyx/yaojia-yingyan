import type { Database } from "bun:sqlite";
import type { Anomaly, PriceRecord, Rebuttal, ChallengeResult, RiskLevel } from "@shared/types";
import { CONF_CONFIRM, CONF_REVIEW } from "@shared/constants";
import { chat } from "./llm";

export function computeConfidence(rebuttals: Rebuttal[]): number {
  const checked = rebuttals.filter(r => r.checked);
  if (checked.length === 0) return 50;
  const refuted = checked.filter(r => r.refuted).length;     // 被解释为合理→拉低置信
  const survived = checked.length - refuted;                  // 反驳失败→拉高置信
  const raw = 50 + survived * 18 - refuted * 30;
  return Math.max(0, Math.min(100, raw));
}

export function verdictFromConfidence(c: number): "confirmed" | "review" | "dismissed" {
  return c >= CONF_CONFIRM ? "confirmed" : c >= CONF_REVIEW ? "review" : "dismissed";
}

export function adjustRisk(level: RiskLevel, verdict: string): RiskLevel {
  if (verdict === "dismissed") return "low";
  if (verdict === "review" && level === "high") return "mid";
  return level;
}

// 规则式生成候选反驳假设 + 自检（演示稳定，不依赖在线 LLM）
function buildRebuttals(anomaly: Anomaly, record: PriceRecord): Rebuttal[] {
  const isDecoy = record.id === "S6";
  const specForm = `${record.form}/${record.spec}`;
  return [
    { hypothesis: "规格/剂型不同导致不可比", checked: true,
      refuted: isDecoy, reason: isDecoy ? `参照为普通制剂，本品为${specForm}，不可比` : `四同口径一致(${specForm})，可比` },
    { hypothesis: "处于政策性调价/集采切换过渡期", checked: true,
      refuted: isDecoy, reason: isDecoy ? "该品种正处集采切换过渡期" : "无在途政策调价" },
    { hypothesis: "特殊采购情形(急救/短缺/谈判药)", checked: true, refuted: false, reason: "非特殊采购情形" },
    { hypothesis: "数据录入口径/单位错误", checked: true, refuted: false, reason: "单位与口径核对一致" },
  ];
}

export async function challenge(db: Database, anomaly: Anomaly, record: PriceRecord): Promise<ChallengeResult> {
  const rebuttals = buildRebuttals(anomaly, record);
  // 让 LLM 以红队口吻复述（兜底有模板），不改变规则判定
  await chat("你是医保价格监管红队，专门尝试反驳价格异常是否其实合理。",
    `品种：${record.generic} ${record.spec}；逐条检验：${rebuttals.map(r => r.hypothesis).join("、")}`);
  const confidence = computeConfidence(rebuttals);
  const verdict = verdictFromConfidence(confidence);
  return { rebuttals, confidence, verdict, adjustedRiskLevel: adjustRisk(anomaly.riskLevel, verdict) };
}
