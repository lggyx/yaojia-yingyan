import { useEffect, useState } from "react";
import { api } from "./lib/api";

interface Stats {
  monitoredCount: number;
  anomalyCount: number;
  byRisk: { high: number; mid: number; low: number };
  closedRate: number;
  dismissedCount: number;
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.detect()
      .then(() => api.getStats())
      .then(data => {
        if (active) setStats(data as Stats);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-[100dvh] px-6 py-6 text-sentinel-ink md:px-10">
      <section className="mx-auto grid max-w-7xl gap-5 rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.14)] md:grid-cols-[1.2fr_0.8fr] md:p-7">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Price Sentinel</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">药价鹰眼</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#40564d] md:text-base">
            面向医保价格治理的异常预警与闭环处置智能体，当前前端链路已接入检测和统计接口。
          </p>
        </div>
        <div className="grid content-end gap-3 rounded-md border border-sentinel-line bg-[#fbfcfb] p-4">
          {error ? (
            <div className="border-l-4 border-sentinel-risk bg-[#fff4f2] p-3 text-sm text-sentinel-risk">{error}</div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="监测记录" value={stats.monitoredCount} />
              <Metric label="异常候选" value={stats.anomalyCount} tone="risk" />
              <Metric label="高风险" value={stats.byRisk.high} tone="risk" />
              <Metric label="闭环率" value={`${Math.round(stats.closedRate * 100)}%`} />
            </div>
          ) : (
            <div className="h-28 animate-pulse rounded-md bg-[#e2ebe5]" aria-label="加载统计" />
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "risk" }) {
  return (
    <div className="rounded-md border border-sentinel-line bg-white p-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#5c6f67]">{label}</div>
      <div className={tone === "risk" ? "mt-2 text-2xl font-semibold text-sentinel-risk" : "mt-2 text-2xl font-semibold"}>
        {value}
      </div>
    </div>
  );
}