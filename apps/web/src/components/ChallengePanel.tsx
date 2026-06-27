import type { ChallengeResult } from "../types";

const verdictText = { confirmed: "确认异常", review: "转人工复核", dismissed: "误报排除" };

export function ChallengePanel({ result }: { result: ChallengeResult | null }) {
  if (!result) {
    return <div className="rounded-md border border-dashed border-sentinel-line bg-[#fbfcfb] p-4 text-sm text-[#60746b]">等待红队校验结果。</div>;
  }

  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Metric label="置信度" value={`${result.confidence}%`} tone={result.verdict === "dismissed" ? "muted" : "risk"} />
        <Metric label="判定" value={verdictText[result.verdict]} tone={result.verdict === "dismissed" ? "muted" : "risk"} />
        <Metric label="调整风险" value={result.adjustedRiskLevel.toUpperCase()} tone={result.adjustedRiskLevel === "high" ? "risk" : "muted"} />
      </div>
      <div className="grid gap-2">
        {result.rebuttals.map(item => (
          <article key={item.hypothesis} className="rounded-md border border-sentinel-line bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{item.hypothesis}</div>
              <span className={item.refuted ? "rounded border border-[#b8c9bf] px-2 py-1 text-xs text-[#60746b]" : "rounded border border-sentinel-risk px-2 py-1 text-xs text-sentinel-risk"}>
                {item.refuted ? "解释成立" : "反驳失败"}
              </span>
            </div>
            <p className="mt-2 leading-6 text-[#60746b]">{item.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "risk" | "muted" }) {
  return (
    <div className="rounded-md border border-sentinel-line bg-white p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#60746b]">{label}</div>
      <div className={tone === "risk" ? "mt-2 font-semibold text-sentinel-risk" : "mt-2 font-semibold text-sentinel-ink"}>{value}</div>
    </div>
  );
}