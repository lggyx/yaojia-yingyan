import { useEffect, useState } from "react";
import { AnomalyDetail } from "./components/AnomalyDetail";
import { Dashboard } from "./components/Dashboard";
import { getNextStatus } from "./components/KanbanBoard";
import { api } from "./lib/api";
import type { AiBriefing, AiModelStatus, Anomaly, AnomalyDetail as Detail, BoardResult, ChallengeResult, InvestigateResult, PageResult, PriceDetail, PriceRecord, RecheckResult, StatsOverview, WorkOrder } from "./types";

export default function App() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<PriceDetail | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Detail | null>(null);
  const [investigateResult, setInvestigateResult] = useState<InvestigateResult | null>(null);
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AiModelStatus | null>(null);
  const [aiBriefing, setAiBriefing] = useState<AiBriefing | null>(null);
  const [recheckMap, setRecheckMap] = useState<Record<string, RecheckResult>>({});
  const [busyWorkOrderId, setBusyWorkOrderId] = useState<string | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.detect()
      .then(() => Promise.all([
        api.getStats() as Promise<StatsOverview>,
        api.getPrices("?pageSize=12") as Promise<PageResult<PriceRecord>>,
        api.getAnomalies() as Promise<PageResult<Anomaly>>,
        api.getBoard() as Promise<BoardResult>,
        api.getAiStatus() as Promise<AiModelStatus>,
        api.getAiBriefing() as Promise<AiBriefing>,
      ]))
      .then(async ([nextStats, pricePage, anomalyPage, nextBoard, nextAiStatus, nextAiBriefing]) => {
        if (!active) return;
        setStats(nextStats);
        setRecords(pricePage.items);
        setAnomalies(anomalyPage.items);
        setBoard(nextBoard);
        setAiStatus(nextAiStatus);
        setAiBriefing(nextAiBriefing);
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

  const selectRecord = (id: string, anomalyId?: string) => {
    api.getPrice(id)
      .then(detail => setSelectedDetail(detail as PriceDetail))
      .catch((err: Error) => setError(err.message));
    if (anomalyId) {
      setInvestigateResult(null);
      setChallengeResult(null);
      api.getAnomaly(anomalyId)
        .then(detail => setSelectedAnomaly(detail as Detail))
        .catch((err: Error) => setError(err.message));
    }
  };

  const selectAnomaly = (anomalyId: string) => {
    const anomaly = anomalies.find(item => item.id === anomalyId);
    if (anomaly) selectRecord(anomaly.recordId, anomaly.id);
  };

  const investigateSelected = () => {
    if (!selectedAnomaly) return;
    setInvestigating(true);
    api.investigate(selectedAnomaly.id)
      .then(result => setInvestigateResult(result as InvestigateResult))
      .catch((err: Error) => setError(err.message))
      .finally(() => setInvestigating(false));
  };

  const challengeSelected = () => {
    if (!selectedAnomaly) return;
    setChallenging(true);
    api.challenge(selectedAnomaly.id)
      .then(result => setChallengeResult(result as ChallengeResult))
      .catch((err: Error) => setError(err.message))
      .finally(() => setChallenging(false));
  };

  const refreshBoard = () => api.getBoard().then(nextBoard => setBoard(nextBoard as BoardResult));

  const advanceWorkOrder = (workOrder: WorkOrder) => {
    const status = getNextStatus(workOrder.status);
    setBusyWorkOrderId(workOrder.id);
    api.patchWorkOrder(workOrder.id, { status, note: status === "closed" ? "整改复核通过，闭环归档" : "按处置流程推进" })
      .then(refreshBoard)
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusyWorkOrderId(null));
  };

  const recheckWorkOrder = (workOrder: WorkOrder) => {
    setBusyWorkOrderId(workOrder.id);
    api.recheck(workOrder.id)
      .then(result => {
        setRecheckMap(current => ({ ...current, [workOrder.id]: result as RecheckResult }));
        return refreshBoard();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusyWorkOrderId(null));
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
    <>
      <Dashboard
        stats={stats}
        records={records}
        anomalies={anomalies}
        selectedDetail={selectedDetail}
        board={board}
        aiStatus={aiStatus}
        aiBriefing={aiBriefing}
        recheckMap={recheckMap}
        busyWorkOrderId={busyWorkOrderId}
        onSelectRecord={selectRecord}
        onSelectAnomaly={selectAnomaly}
        onAdvanceWorkOrder={advanceWorkOrder}
        onRecheckWorkOrder={recheckWorkOrder}
      />
      <AnomalyDetail
        detail={selectedAnomaly}
        investigating={investigating}
        challenging={challenging}
        investigateResult={investigateResult}
        challengeResult={challengeResult}
        onClose={() => setSelectedAnomaly(null)}
        onInvestigate={investigateSelected}
        onChallenge={challengeSelected}
      />
    </>
  );
}