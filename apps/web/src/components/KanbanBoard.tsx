import type { BoardResult, RecheckResult, WorkOrder, WorkOrderStatus } from "../types";

const columnNames: Record<WorkOrderStatus, string> = {
  pending: "待处置",
  processing: "处置中",
  done: "已整改",
  closed: "已闭环",
};

const nextStatus: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  pending: "processing",
  processing: "done",
  done: "closed",
};

export function KanbanBoard({ board, recheckMap, busyId, onAdvance, onRecheck }: {
  board: BoardResult | null;
  recheckMap: Record<string, RecheckResult>;
  busyId: string | null;
  onAdvance: (workOrder: WorkOrder) => void;
  onRecheck: (workOrder: WorkOrder) => void;
}) {
  if (!board) {
    return <section className="h-64 animate-pulse rounded-md border border-sentinel-line bg-white" />;
  }

  return (
    <section className="rounded-md border border-sentinel-line bg-[#fbfcfb] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">闭环处置看板</h2>
          <p className="mt-1 text-xs text-[#60746b]">工单状态流转与整改后复核</p>
        </div>
        <span className="font-mono text-xs text-[#60746b]">WORK ORDER BOARD</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {board.columns.map(column => (
          <div key={column.status} className="rounded-md border border-sentinel-line bg-[#eef3ef] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{columnNames[column.status]}</h3>
              <span className="rounded border border-sentinel-line bg-white px-2 py-1 font-mono text-[11px] text-[#60746b]">{column.cards.length}</span>
            </div>
            <div className="grid gap-2">
              {column.cards.length === 0 ? <div className="rounded border border-dashed border-sentinel-line p-4 text-center text-xs text-[#60746b]">暂无工单</div> : null}
              {column.cards.map(card => (
                <article key={card.id} className="rounded-md border border-sentinel-line bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{card.id}</div>
                      <div className="mt-1 text-xs text-[#60746b]">{card.anomalyId} · {card.type}</div>
                    </div>
                    <span className="rounded border border-sentinel-line px-2 py-1 text-[11px] text-[#60746b]">{card.assignee ?? "未分派"}</span>
                  </div>
                  {card.note ? <p className="mt-3 leading-6 text-[#60746b]">{card.note}</p> : null}
                  {recheckMap[card.id] ? <RecheckSummary result={recheckMap[card.id]} /> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextStatus[card.status] ? (
                      <button className="rounded bg-sentinel-ink px-2.5 py-1.5 text-xs text-white disabled:opacity-50" disabled={busyId === card.id} onClick={() => onAdvance(card)}>
                        推进
                      </button>
                    ) : null}
                    <button className="rounded border border-sentinel-line px-2.5 py-1.5 text-xs hover:bg-[#eef3ef] disabled:opacity-50" disabled={busyId === card.id} onClick={() => onRecheck(card)}>
                      复核
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function getNextStatus(status: WorkOrderStatus) {
  return nextStatus[status] ?? status;
}

function RecheckSummary({ result }: { result: RecheckResult }) {
  return (
    <div className={result.corrected ? "mt-3 rounded border border-[#b8c9bf] bg-[#f3f7f4] p-2 text-xs text-[#40564d]" : "mt-3 rounded border border-sentinel-risk bg-[#fff4f2] p-2 text-xs text-sentinel-risk"}>
      复核价 ¥{result.latestPrice.toFixed(2)} · 偏离 {result.deviationNow ?? "-"} · {result.canClose ? "可闭环" : "需继续处置"}
    </div>
  );
}