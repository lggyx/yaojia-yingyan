import type { BoardResult, RecheckResult, WorkOrder } from "../types";
import { KanbanBoard } from "./KanbanBoard";

export function WorkOrdersPage({ board, recheckMap, busyWorkOrderId, selectedWorkOrderId, onAdvanceWorkOrder, onRecheckWorkOrder }: {
  board: BoardResult | null;
  recheckMap: Record<string, RecheckResult>;
  busyWorkOrderId: string | null;
  selectedWorkOrderId: string | null;
  onAdvanceWorkOrder: (workOrder: WorkOrder) => void;
  onRecheckWorkOrder: (workOrder: WorkOrder) => void;
}) {
  const workOrders = board?.columns.flatMap(column => column.cards) ?? [];
  const selected = workOrders.find(item => item.id === selectedWorkOrderId) ?? workOrders[0] ?? null;

  return (
    <div className="grid gap-4">
      <header className="rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Work Orders</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">处置工单</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60746b]">按 pending → processing → done → closed 状态机推进，闭环前必须完成复核。</p>
      </header>
      <div className="grid gap-4 2xl:grid-cols-[1fr_360px]">
        <KanbanBoard board={board} recheckMap={recheckMap} busyId={busyWorkOrderId} onAdvance={onAdvanceWorkOrder} onRecheck={onRecheckWorkOrder} />
        <aside className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">工单详情</h2>
          {selected ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-sentinel-risk">{selected.id}</div>
              <div className="text-lg font-semibold">{selected.generic ?? selected.anomalyId}</div>
              <p className="leading-6 text-[#60746b]">{selected.note ?? selected.lastEvent ?? "等待处置记录"}</p>
              <div className="rounded border border-sentinel-line bg-[#fbfcfb] p-3 text-xs leading-5 text-[#40564d]">当前阶段：{selected.currentStep ?? selected.status}<br />下一步：{selected.nextStep ?? "等待操作"}</div>
            </div>
          ) : <p className="mt-4 text-sm text-[#60746b]">暂无工单</p>}
        </aside>
      </div>
    </div>
  );
}