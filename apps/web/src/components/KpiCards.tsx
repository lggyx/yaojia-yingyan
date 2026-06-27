import type { StatsOverview } from "../types";

const cards = [
  { key: "monitoredCount", label: "监测记录", suffix: "条" },
  { key: "anomalyCount", label: "异常候选", suffix: "起", tone: "risk" },
  { key: "highRisk", label: "高风险", suffix: "起", tone: "risk" },
  { key: "closedRate", label: "闭环率", suffix: "%" },
] as const;

export function KpiCards({ stats }: { stats: StatsOverview }) {
  const values = {
    monitoredCount: stats.monitoredCount,
    anomalyCount: stats.anomalyCount,
    highRisk: stats.byRisk.high,
    closedRate: Math.round(stats.closedRate * 100),
  };

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <article key={card.key} className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#60746b]">{card.label}</div>
          <div className={card.tone === "risk" ? "mt-3 flex items-end gap-1 text-sentinel-risk" : "mt-3 flex items-end gap-1"}>
            <span className="text-3xl font-semibold leading-none">{values[card.key]}</span>
            <span className="pb-1 text-xs text-[#60746b]">{card.suffix}</span>
          </div>
        </article>
      ))}
    </section>
  );
}