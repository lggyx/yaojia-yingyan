import { useEffect, useState } from "react";
import { AnomaliesPage } from "./components/AnomaliesPage";
import { DataRulesPage } from "./components/DataRulesPage";
import { getNextStatus } from "./components/KanbanBoard";
import { RecheckPage } from "./components/RecheckPage";
import { SideNav } from "./components/SideNav";
import { WorkOrdersPage } from "./components/WorkOrdersPage";
import { WorkspacePage } from "./components/WorkspacePage";
import { CopilotSidebar } from "./components/CopilotSidebar";
import { api } from "./lib/api";
import type { AiBriefing, AiInvestigationReport, AiModelStatus, Anomaly, AnomalyDetail as Detail, BoardResult, ChallengeResult, InvestigateResult, PageKey, PageResult, PriceDetail, PriceRecord, RecheckResult, StatsOverview, TaskItem, WorkOrder } from "./types";

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("workspace");
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<PriceDetail | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Detail | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [investigateResult, setInvestigateResult] = useState<InvestigateResult | null>(null);
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [aiReport, setAiReport] = useState<AiInvestigationReport | null>(null);
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AiModelStatus | null>(null);
  const [aiBriefing, setAiBriefing] = useState<AiBriefing | null>(null);
  const [recheckMap, setRecheckMap] = useState<Record<string, RecheckResult>>({});
  const [busyWorkOrderId, setBusyWorkOrderId] = useState<string | null>(null);
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [reporting, setReporting] = useState(false);
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
      setAiReport(null);
      api.getAnomaly(anomalyId)
        .then(detail => setSelectedAnomaly(detail as Detail))
        .catch((err: Error) => setError(err.message));
    }
  };

  const selectAnomaly = (anomalyId: string) => {
    const anomaly = anomalies.find(item => item.id === anomalyId);
    if (anomaly) selectRecord(anomaly.recordId, anomaly.id);
    setActivePage("anomalies");
  };

  const navigateTask = (page: PageKey, id?: string) => {
    setActivePage(page);
    if (page === "anomalies" && id) selectAnomaly(id);
    if ((page === "work-orders" || page === "recheck") && id) setSelectedWorkOrderId(id);
  };

  const investigateSelected = () => {
    if (!selectedAnomaly) return;
    setInvestigating(true);
    api.investigate(selectedAnomaly.id)
      .then(result => setInvestigateResult(result as InvestigateResult))
      .catch((err: Error) => setError(err.message))
      .finally(() => setInvestigating(false));
  };

  const reportSelected = () => {
    if (!selectedAnomaly) return;
    setReporting(true);
    api.getAiReport(selectedAnomaly.id)
      .then(result => {
        const report = result as AiInvestigationReport;
        setAiReport(report);
        setInvestigateResult(report.investigation);
        setChallengeResult(report.challenge);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setReporting(false));
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

  const workOrders = board && Array.isArray(board.columns) ? board.columns.flatMap(column => column.cards) : [];

  const tasks: TaskItem[] = [
    ...(aiBriefing?.priorities ?? []).map(priority => ({
      id: `briefing-${priority.anomalyId}`,
      type: priority.target === "workorder" ? "create_work_order" as const : "investigate" as const,
      label: priority.title,
      targetPage: "anomalies" as const,
      targetId: priority.anomalyId,
      priority: priority.level,
      anomalyId: priority.anomalyId,
    })),
    ...workOrders.filter(item => item.status !== "closed").map(item => ({
      id: `work-order-${item.id}`,
      type: item.status === "done" ? (recheckMap[item.id]?.canClose ? "close" as const : "recheck" as const) : "advance" as const,
      label: `${item.currentStep ?? item.status}：${item.generic ?? item.anomalyId}`,
      targetPage: item.status === "done" ? "recheck" as const : "work-orders" as const,
      targetId: item.id,
      priority: item.riskLevel ?? "mid" as const,
      anomalyId: item.anomalyId,
      workOrderId: item.id,
    })),
  ];

  const createWorkOrderFromReport = () => {
    if (!selectedAnomaly || !aiReport) return;
    const existingWorkOrder = workOrders.find(item => item.anomalyId === selectedAnomaly.id);
    if (existingWorkOrder) {
      setSelectedWorkOrderId(existingWorkOrder.id);
      setActivePage("work-orders");
      return;
    }
    setCreatingWorkOrder(true);
    api.createWorkOrder({
      anomalyId: selectedAnomaly.id,
      type: aiReport.conclusion.suggestedDisposition,
      assignee: "监管一组",
      note: `AI研判：${aiReport.conclusion.summary}`,
    })
      .then(nextWorkOrder => {
        const workOrder = nextWorkOrder as WorkOrder;
        setSelectedWorkOrderId(workOrder.id);
        setActivePage("work-orders");
        return refreshBoard();
      })
      .catch((err: Error) => {
        if (err.message.includes("already exists")) {
          const duplicate = workOrders.find(item => item.anomalyId === selectedAnomaly.id);
          if (duplicate) setSelectedWorkOrderId(duplicate.id);
          setActivePage("work-orders");
          return refreshBoard();
        }
        setError(err.message);
      })
      .finally(() => setCreatingWorkOrder(false));
  };

  const advanceWorkOrder = (workOrder: WorkOrder) => {
    const status = getNextStatus(workOrder.status);
    setBusyWorkOrderId(workOrder.id);
    api.patchWorkOrder(workOrder.id, { status, note: status === "closed" ? "整改复核通过，闭环归档" : "按处置流程推进" })
      .then(refreshBoard)
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusyWorkOrderId(null));
  };

  const recheckWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrderId(workOrder.id);
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

  const selectedWorkOrderExists = Boolean(
    selectedAnomaly && workOrders.some(item => item.anomalyId === selectedAnomaly.id),
  );

  const pageContent = {
    workspace: (
      <WorkspacePage
        stats={stats}
        aiStatus={aiStatus}
        aiBriefing={aiBriefing}
        tasks={tasks}
        onSelectAnomaly={selectAnomaly}
        onNavigateTask={navigateTask}
      />
    ),
    anomalies: (
      <AnomaliesPage
        records={records}
        anomalies={anomalies}
        selectedDetail={selectedDetail}
        selectedAnomaly={selectedAnomaly}
        investigating={investigating}
        challenging={challenging}
        reporting={reporting}
        creatingWorkOrder={creatingWorkOrder}
        workOrderExists={selectedWorkOrderExists}
        investigateResult={investigateResult}
        challengeResult={challengeResult}
        aiReport={aiReport}
        onSelectRecord={selectRecord}
        onInvestigate={investigateSelected}
        onChallenge={challengeSelected}
        onReport={reportSelected}
        onCreateWorkOrder={createWorkOrderFromReport}
      />
    ),
    "work-orders": (
      <WorkOrdersPage
        board={board}
        recheckMap={recheckMap}
        busyWorkOrderId={busyWorkOrderId}
        selectedWorkOrderId={selectedWorkOrderId}
        onAdvanceWorkOrder={advanceWorkOrder}
        onRecheckWorkOrder={recheckWorkOrder}
      />
    ),
    recheck: (
      <RecheckPage
        board={board}
        recheckMap={recheckMap}
        busyWorkOrderId={busyWorkOrderId}
        onAdvanceWorkOrder={advanceWorkOrder}
        onRecheckWorkOrder={recheckWorkOrder}
      />
    ),
    "data-rules": <DataRulesPage />,
  } satisfies Record<PageKey, React.ReactNode>;

  return (
    <div className="flex min-h-[100dvh] text-sentinel-ink">
      <SideNav activePage={activePage} onNavigate={setActivePage} />
      <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            {(["workspace", "anomalies", "work-orders", "recheck", "data-rules"] as PageKey[]).map(page => (
              <button key={page} className={page === activePage ? "shrink-0 rounded bg-sentinel-ink px-3 py-2 text-sm text-white" : "shrink-0 rounded border border-sentinel-line bg-white px-3 py-2 text-sm text-[#40564d]"} onClick={() => setActivePage(page)}>
                {page === "workspace" ? "工作台" : page === "anomalies" ? "异常" : page === "work-orders" ? "工单" : page === "recheck" ? "复核" : "数据规则"}
              </button>
            ))}
          </div>
          {pageContent[activePage]}
        </div>
      </main>
      <CopilotSidebar
        activePage={activePage}
        selectedAnomalyId={selectedAnomaly?.id ?? null}
        selectedWorkOrderId={selectedWorkOrderId}
        onNavigateTask={navigateTask}
      />
    </div>
  );
}