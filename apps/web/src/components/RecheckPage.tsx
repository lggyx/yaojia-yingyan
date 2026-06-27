import type { BoardResult, RecheckResult, WorkOrder } from "../types";

export function RecheckPage({ board, recheckMap, busyWorkOrderId, onAdvanceWorkOrder, onRecheckWorkOrder, onReturnWorkOrder }: {
  board: BoardResult | null;
  recheckMap: Record<string, RecheckResult>;
  busyWorkOrderId: string | null;
  onAdvanceWorkOrder: (workOrder: WorkOrder) => void;
  onRecheckWorkOrder: (workOrder: WorkOrder) => void;
  onReturnWorkOrder: (workOrder: WorkOrder) => void;
}) {
  const workOrders = board?.columns.flatMap(column => column.cards) ?? [];
  const candidates = workOrders.filter(item => item.status === "done");

  return (
    <div className="grid gap-4">
      <header className="rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Recheck</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">复核闭环</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60746b]">整改后先运行 AI 复核，只有复核通过的工单才能闭环归档。</p>
      </header>
      <section className="grid gap-3">
        {candidates.length === 0 ? <div className="rounded-md border border-dashed border-sentinel-line bg-white p-8 text-center text-sm text-[#60746b]">暂无待复核工单</div> : null}
        {candidates.map(workOrder => {
          const result = recheckMap[workOrder.id];
          return (
            <article key={workOrder.id} className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-sentinel-risk">{workOrder.id}</div>
                  <h2 className="mt-2 text-lg font-semibold">{workOrder.generic ?? workOrder.anomalyId}</h2>
                  <p className="mt-1 text-sm text-[#60746b]">{workOrder.hospital ?? "未知机构"} · {workOrder.region ?? "未知地区"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded border border-sentinel-line px-3 py-2 text-sm disabled:opacity-50" disabled={busyWorkOrderId === workOrder.id} onClick={() => onRecheckWorkOrder(workOrder)}>AI 复核</button>
                  <button className="rounded bg-sentinel-ink px-3 py-2 text-sm text-white disabled:opacity-50" disabled={busyWorkOrderId === workOrder.id || !result?.canClose} onClick={() => onAdvanceWorkOrder(workOrder)}>闭环</button>
                  {result?.canClose === false && (
                    <button className="rounded border border-[#e6a817] px-3 py-2 text-sm text-[#e6a817] disabled:opacity-50" disabled={busyWorkOrderId === workOrder.id} onClick={() => onReturnWorkOrder(workOrder)}>退回处置</button>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded border border-sentinel-line bg-[#fbfcfb] p-3 text-sm text-[#40564d]">
                {result ? `复核价 ¥${result.latestPrice.toFixed(2)} · 偏离 ${result.deviationNow ?? "-"} · ${result.canClose ? "可闭环" : "需继续处置"}` : "尚未复核，无法闭环。"}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}