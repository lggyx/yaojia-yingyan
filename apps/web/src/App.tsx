import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { api } from "./lib/api";
import type { Anomaly, PageResult, PriceDetail, PriceRecord, StatsOverview } from "./types";

export default function App() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<PriceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.detect()
      .then(() => Promise.all([
        api.getStats() as Promise<StatsOverview>,
        api.getPrices("?pageSize=12") as Promise<PageResult<PriceRecord>>,
        api.getAnomalies() as Promise<PageResult<Anomaly>>,
      ]))
      .then(async ([nextStats, pricePage, anomalyPage]) => {
        if (!active) return;
        setStats(nextStats);
        setRecords(pricePage.items);
        setAnomalies(anomalyPage.items);
        if (pricePage.items[0]) {
          const detail = await api.getPrice(pricePage.items[0].id) as PriceDetail;
          if (active) setSelectedDetail(detail);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectRecord = (id: string) => {
    api.getPrice(id)
      .then(detail => setSelectedDetail(detail as PriceDetail))
      .catch((err: Error) => setError(err.message));
  };

  if (error) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-sentinel-ink">
        <div className="w-full max-w-xl rounded-md border border-sentinel-risk bg-[#fff4f2] p-5 text-sentinel-risk shadow-sm">
          <div className="font-mono text-xs uppercase tracking-[0.18em]">API Error</div>
          <p className="mt-3 text-sm leading-6">{error}</p>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-[100dvh] px-4 py-4 text-sentinel-ink md:px-8 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-4">
          <div className="h-32 animate-pulse rounded-lg border border-sentinel-line bg-sentinel-panel" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-md bg-white" />)}
          </div>
          <div className="h-[420px] animate-pulse rounded-md bg-white" />
        </div>
      </main>
    );
  }

  return (
    <Dashboard
      stats={stats}
      records={records}
      anomalies={anomalies}
      selectedDetail={selectedDetail}
      onSelectRecord={selectRecord}
    />
  );
}