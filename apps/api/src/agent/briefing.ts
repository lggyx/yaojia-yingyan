import type { AiBriefing, AiPriority, RiskLevel } from "@shared/types";

const TS = "2026-06-27T00:00:00.000Z";

interface BriefingAnomalyRow {
  id: string;
  recordId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: string;
  generic: string;
  hospital: string;
  region: string;
}

export function generateBriefing(db: any): AiBriefing {
  const rows = db.query(`SELECT a.id,a.record_id recordId,a.risk_score riskScore,a.risk_level riskLevel,a.status,
    p.generic,p.hospital,p.region
    FROM anomalies a JOIN price_records p ON p.id=a.record_id
    ORDER BY a.risk_score DESC,a.created_at DESC LIMIT 3`).all() as BriefingAnomalyRow[];
  const total = (db.query("SELECT COUNT(*) count FROM anomalies").get() as { count: number }).count;
  const high = (db.query("SELECT COUNT(*) count FROM anomalies WHERE risk_level='high'").get() as { count: number }).count;
  const pendingOrders = (db.query("SELECT COUNT(*) count FROM work_orders WHERE status!='closed'").get() as { count: number }).count;
  const priorities = rows.map(rowToPriority);

  return {
    generatedAt: TS,
    summary: `今日识别 ${total} 条异常，其中高风险 ${high} 条，未闭环工单 ${pendingOrders} 条。`,
    priorities,
    actions: priorities.length ? [
      { label: "生成 AI 研判报告", target: "investigate", anomalyId: priorities[0].anomalyId },
      { label: "创建处置工单", target: "workorder", anomalyId: priorities[0].anomalyId },
    ] : [{ label: "继续监测价格波动", target: "review" }],
    reasoningSteps: [
      { phase: "collect", title: "读取监测数据", detail: `汇总 ${total} 条异常和 ${pendingOrders} 条未闭环工单。` },
      { phase: "rank", title: "按风险排序", detail: "优先选择风险分、风险等级和处置状态最需要关注的异常。" },
      { phase: "recommend", title: "生成处置建议", detail: priorities.length ? "建议先生成研判报告，再进入工单闭环。" : "当前无异常，建议保持日常监测。" },
    ],
  };
}

function rowToPriority(row: BriefingAnomalyRow): AiPriority {
  return {
    anomalyId: row.id,
    recordId: row.recordId,
    title: `${row.generic} · ${row.hospital}`,
    level: row.riskLevel,
    riskScore: row.riskScore,
    reason: `${row.region} ${row.generic} 风险分 ${row.riskScore.toFixed(2)}，状态 ${row.status}。`,
    target: "investigate",
  };
}