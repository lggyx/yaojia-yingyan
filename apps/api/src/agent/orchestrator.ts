import type { Database } from "bun:sqlite";
import type { Anomaly, PriceRecord, InvestigateResult, TraceStep, WorkOrderType } from "@shared/types";
import { getTenderPrice, getHistory, getRegionalAvg, getAlternatives } from "./tools";
import { chat } from "./llm";

export async function investigate(db: Database, anomaly: Anomaly, record: PriceRecord): Promise<InvestigateResult> {
  const trace: TraceStep[] = [];
  const evidence: Record<string, unknown> = {};
  let step = 0;
  const run = (tool: string, input: unknown, output: unknown) => { trace.push({ step: ++step, tool, input, output }); return output; };

  // 智能体按命中的维度选择工具取证
  const hitTypes = new Set(anomaly.dimensions.filter(d => d.hit).map(d => d.type));
  if (hitTypes.has("tender") || hitTypes.has("volume"))
    evidence.tender = run("get_tender_price", { miCode: record.miCode }, getTenderPrice(db, record.miCode));
  if (hitTypes.has("history"))
    evidence.history = run("get_history_price", { miCode: record.miCode, region: record.region }, getHistory(db, record.miCode, record.region));
  if (hitTypes.has("regional"))
    evidence.regional = run("get_regional_avg", { generic: record.generic }, getRegionalAvg(db, record));
  if (hitTypes.has("alternative") || hitTypes.has("volume"))
    evidence.alternatives = run("get_alternatives", { generic: record.generic }, getAlternatives(db, record));

  const dimText = anomaly.dimensions.filter(d => d.hit).map(d => `- ${d.detail}`).join("\n");
  const explanation = await chat(
    "你是医保医药价格治理分析专家，依据给定的结构化证据，用简洁专业中文解释该价格为何异常、风险等级与建议处置，不得编造证据外信息。",
    `品种：${record.generic}（${record.brand}，${record.manufacturer}，${record.spec}）\n地区/医院：${record.region}/${record.hospital}\n命中维度：\n${dimText}\n风险初判：${anomaly.riskLevel}`);

  const suggestedDisposition: WorkOrderType =
    anomaly.riskLevel === "high" ? "inquiry" : anomaly.riskLevel === "mid" ? "interview" : "remind";

  return { trace, evidence, explanation, suggestedDisposition };
}
