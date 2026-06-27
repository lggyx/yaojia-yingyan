import type { AiBriefing, AiModelStatus, PageKey, StatsOverview, TaskItem } from "../types";
import { AiBriefingPanel } from "./AiBriefingPanel";
import { KpiCards } from "./KpiCards";

export function WorkspacePage({ stats, aiStatus, aiBriefing, tasks, onSelectAnomaly, onNavigateTask }: {
  stats: StatsOverview;
  aiStatus: AiModelStatus | null;
  aiBriefing: AiBriefing | null;
  tasks: TaskItem[];
  onSelectAnomaly: (anomalyId: string) => void;
  onNavigateTask: (page: PageKey, id?: string) => void;
}) {
  const firstTask = tasks[0];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Workspace"
        title="今日工作台"
        description="从 AI 简报、监管任务和快捷入口开始，先处理最重要的一项。"
        action={firstTask ? <button className="rounded bg-sentinel-risk px-3 py-2 text-sm text-white" onClick={() => onNavigateTask(firstTask.targetPage, firstTask.targetId)}>开始处理第一项</button> : null}
      />
      <KpiCards stats={stats} />
      <AiBriefingPanel status={aiStatus} briefing={aiBriefing} onSelectAnomaly={onSelectAnomaly} />
      <section className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">我的任务列表</h2>
            <p className="mt-1 text-xs text-[#60746b]">按风险、状态和复核条件生成的监管动作。</p>
          </div>
          <span className="font-mono text-xs text-[#60746b]">{tasks.length} TASKS</span>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {tasks.length === 0 ? <div className="rounded border border-dashed border-sentinel-line p-4 text-sm text-[#60746b]">暂无待处理任务</div> : null}
          {tasks.map(task => (
            <button key={task.id} type="button" className="rounded-md border border-sentinel-line bg-[#fbfcfb] p-3 text-left hover:border-sentinel-risk hover:bg-[#fff8f6]" onClick={() => onNavigateTask(task.targetPage, task.targetId)}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold">{task.label}</span>
                <span className="rounded border border-sentinel-line px-2 py-1 font-mono text-[11px] uppercase text-[#60746b]">{task.priority}</span>
              </div>
              <div className="mt-2 text-xs text-[#60746b]">{task.anomalyId ?? task.workOrderId ?? task.targetPage}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-3 rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)] md:flex-row md:items-end">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60746b]">{description}</p>
      </div>
      {action}
    </header>
  );
}