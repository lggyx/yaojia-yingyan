import type { AiBriefing, AiModelStatus } from "../types";

const phaseLabels: Record<string, string> = {
  collect: "采集",
  rank: "排序",
  recommend: "建议",
  challenge: "质询",
  conclude: "结论",
};

const targetLabels: Record<string, string> = {
  investigate: "进入研判",
  workorder: "生成工单",
  review: "人工复核",
};

export function AiBriefingPanel({ status, briefing, onSelectAnomaly }: {
  status: AiModelStatus | null;
  briefing: AiBriefing | null;
  onSelectAnomaly: (anomalyId: string) => void;
}) {
  const modelText = status ? `${status.model} / ${status.mode === "remote" ? "远程模型" : "本地模拟"}` : "模型连接中";

  return (
    <section className="grid gap-3 xl:grid-cols-[1fr_360px]">
      <article className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sentinel-risk">AI Copilot</p>
            <h2 className="mt-2 text-xl font-semibold">今日处置简报</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#41534b]">{briefing?.summary ?? "正在汇总异常优先级、处置建议和可追溯推理步骤。"}</p>
          </div>
          <div className="rounded-md border border-sentinel-line bg-[#f6faf7] px-3 py-2 text-xs text-[#41534b]">
            <div className="font-mono uppercase tracking-[0.16em] text-[#60746b]">Model</div>
            <div className="mt-1 font-semibold text-sentinel-ink">{modelText}</div>
            {status ? (
              <div className="mt-2 flex items-center gap-1">
                {status.mode === "remote" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d1f0e1] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1a5c3a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1a5c3a]" />
                    真实 AI
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#92400e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#92400e]" />
                    模拟数据
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(briefing?.priorities ?? []).map(priority => (
            <button
              key={priority.anomalyId}
              type="button"
              onClick={() => onSelectAnomaly(priority.anomalyId)}
              className="rounded-md border border-sentinel-line bg-[#fbfdfb] p-3 text-left transition hover:border-sentinel-risk hover:bg-[#fff8f6] focus:outline-none focus:ring-2 focus:ring-sentinel-risk/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#60746b]">{priority.level} / {priority.riskScore}</span>
                <span className="rounded-sm bg-[#ffe8df] px-2 py-1 text-[11px] text-sentinel-risk">{targetLabels[priority.target]}</span>
              </div>
              <div className="mt-3 text-sm font-semibold leading-5">{priority.title}</div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#60746b]">{priority.reason}</p>
            </button>
          ))}
        </div>
      </article>

      <article className="rounded-md border border-sentinel-line bg-sentinel-panel p-4 shadow-sm">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#60746b]">AI 思考过程</div>
        <div className="mt-4 space-y-3">
          {(briefing?.reasoningSteps ?? []).map((step, index) => (
            <div key={`${step.phase}-${index}`} className="grid grid-cols-[72px_1fr] gap-3 text-sm">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-sentinel-risk">{phaseLabels[step.phase]}</div>
              <div>
                <div className="font-semibold">{step.title}</div>
                <p className="mt-1 text-xs leading-5 text-[#60746b]">{step.detail}</p>
              </div>
            </div>
          ))}
          {!briefing ? <p className="text-sm leading-6 text-[#60746b]">等待 AI 生成可审计的分析步骤。</p> : null}
        </div>
      </article>
    </section>
  );
}
