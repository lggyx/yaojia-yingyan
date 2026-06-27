import type { Anomaly, PriceDetail, PriceRecord, StatsOverview } from "../types";
import { KpiCards } from "./KpiCards";
import { PriceTable } from "./PriceTable";
import { TrendChart } from "./TrendChart";

export function Dashboard({ stats, records, anomalies, selectedDetail, onSelectRecord }: {
  stats: StatsOverview;
  records: PriceRecord[];
  anomalies: Anomaly[];
  selectedDetail: PriceDetail | null;
  onSelectRecord: (id: string) => void;
}) {
  return (
    <main className="min-h-[100dvh] px-4 py-4 text-sentinel-ink md:px-8 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-4">
        <header className="flex flex-col justify-between gap-3 rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)] md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Price Sentinel</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">药价鹰眼</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-xs text-[#60746b]">
            <span>规则引擎</span>
            <span>红队校验</span>
            <span>闭环处置</span>
          </div>
        </header>
        <KpiCards stats={stats} />
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <PriceTable records={records} anomalies={anomalies} selectedId={selectedDetail?.id ?? null} onSelect={onSelectRecord} />
          <TrendChart detail={selectedDetail} />
        </div>
      </div>
    </main>
  );
}