import type { AnomalyDetail as Detail, ChallengeResult, InvestigateResult } from "../types";
import { AgentTrace } from "./AgentTrace";
import { ChallengePanel } from "./ChallengePanel";

export function AnomalyDetail({ detail, investigating, challenging, investigateResult, challengeResult, onClose, onInvestigate, onChallenge }: {
  detail: Detail | null;
  investigating: boolean;
  challenging: boolean;
  investigateResult: InvestigateResult | null;
  challengeResult: ChallengeResult | null;
  onClose: () => void;
  onInvestigate: () => void;
  onChallenge: () => void;
}) {
  if (!detail) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-2xl flex-col border-l border-sentinel-line bg-[#f4f7f5] shadow-[-18px_0_55px_rgba(11,23,20,0.18)]">
      <header className="border-b border-sentinel-line bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-sentinel-risk">{detail.id}</div>
            <h2 className="mt-2 text-xl font-semibold">{detail.record.generic}</h2>
            <p className="mt-1 text-sm text-[#60746b]">{detail.record.hospital} · {detail.record.region} · ¥{detail.record.price.toFixed(2)}</p>
          </div>
          <button className="rounded border border-sentinel-line px-3 py-2 text-sm hover:bg-[#eef3ef]" onClick={onClose}>关闭</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded bg-sentinel-ink px-3 py-2 text-sm text-white disabled:opacity-50" disabled={investigating} onClick={onInvestigate}>
            {investigating ? "取证中" : "推理取证"}
          </button>
          <button className="rounded border border-sentinel-risk px-3 py-2 text-sm text-sentinel-risk disabled:opacity-50" disabled={challenging} onClick={onChallenge}>
            {challenging ? "校验中" : "红队校验"}
          </button>
        </div>
      </header>
      <div className="grid flex-1 gap-4 overflow-auto p-4">
        <section className="rounded-md border border-sentinel-line bg-white p-4">
          <h3 className="text-sm font-semibold">命中维度</h3>
          <div className="mt-3 grid gap-2">
            {detail.dimensions.filter(item => item.hit).map(item => (
              <div key={item.type} className="rounded border border-sentinel-line bg-[#fbfcfb] p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{item.type}</span>
                  <span className="font-mono text-sentinel-risk">+{item.deviation.toFixed(2)}</span>
                </div>
                <p className="mt-2 text-[#60746b]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold">Agent 推理轨迹</h3>
          <AgentTrace result={investigateResult} />
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold">对抗校验</h3>
          <ChallengePanel result={challengeResult} />
        </section>
      </div>
    </aside>
  );
}