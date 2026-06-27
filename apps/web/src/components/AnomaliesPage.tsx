import type { AiInvestigationReport, Anomaly, AnomalyDetail as Detail, ChallengeResult, InvestigateResult, PriceDetail, PriceRecord } from "../types";
import { AgentTrace } from "./AgentTrace";
import { ChallengePanel } from "./ChallengePanel";
import { PriceTable } from "./PriceTable";
import { TrendChart } from "./TrendChart";

export function AnomaliesPage({ records, anomalies, selectedDetail, selectedAnomaly, investigating, challenging, reporting, creatingWorkOrder, workOrderExists, investigateResult, challengeResult, aiReport, onSelectRecord, onInvestigate, onChallenge, onReport, onCreateWorkOrder }: {
  records: PriceRecord[];
  anomalies: Anomaly[];
  selectedDetail: PriceDetail | null;
  selectedAnomaly: Detail | null;
  investigating: boolean;
  challenging: boolean;
  reporting: boolean;
  creatingWorkOrder: boolean;
  workOrderExists: boolean;
  investigateResult: InvestigateResult | null;
  challengeResult: ChallengeResult | null;
  aiReport: AiInvestigationReport | null;
  onSelectRecord: (id: string, anomalyId?: string) => void;
  onInvestigate: () => void;
  onChallenge: () => void;
  onReport: () => void;
  onCreateWorkOrder: () => void;
}) {
  return (
    <div className="grid gap-4">
      <header className="rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Anomaly Review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">异常研判</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60746b]">先定位异常，再按命中规则、AI 取证、红队校验、研判结论和创建工单推进。</p>
      </header>
      <div className="grid gap-4 2xl:grid-cols-[1.1fr_420px]">
        <div className="grid gap-4">
          <PriceTable records={records} anomalies={anomalies} selectedId={selectedDetail?.id ?? null} onSelect={onSelectRecord} />
          <TrendChart detail={selectedDetail} />
        </div>
        <InvestigationRail
          detail={selectedAnomaly}
          investigating={investigating}
          challenging={challenging}
          reporting={reporting}
          creatingWorkOrder={creatingWorkOrder}
          workOrderExists={workOrderExists}
          investigateResult={investigateResult}
          challengeResult={challengeResult}
          aiReport={aiReport}
          onInvestigate={onInvestigate}
          onChallenge={onChallenge}
          onReport={onReport}
          onCreateWorkOrder={onCreateWorkOrder}
        />
      </div>
    </div>
  );
}

function InvestigationRail({ detail, investigating, challenging, reporting, creatingWorkOrder, workOrderExists, investigateResult, challengeResult, aiReport, onInvestigate, onChallenge, onReport, onCreateWorkOrder }: {
  detail: Detail | null;
  investigating: boolean;
  challenging: boolean;
  reporting: boolean;
  creatingWorkOrder: boolean;
  workOrderExists: boolean;
  investigateResult: InvestigateResult | null;
  challengeResult: ChallengeResult | null;
  aiReport: AiInvestigationReport | null;
  onInvestigate: () => void;
  onChallenge: () => void;
  onReport: () => void;
  onCreateWorkOrder: () => void;
}) {
  return (
    <aside className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">研判步骤流</h2>
          <p className="mt-1 text-xs text-[#60746b]">{detail ? `${detail.id} · ${detail.record.generic}` : "选择一条异常开始研判"}</p>
        </div>
        {detail ? <span className="rounded border border-sentinel-line px-2 py-1 font-mono text-[11px] uppercase text-sentinel-risk">{detail.riskLevel}</span> : null}
      </div>
      <div className="mt-4 grid gap-3">
        <StepCard title="1. 命中规则" active={Boolean(detail)}>
          {detail ? detail.dimensions.filter(item => item.hit).map(item => <p key={item.type} className="text-xs leading-5 text-[#60746b]">{item.type}: {item.detail}</p>) : <p className="text-xs text-[#60746b]">等待选择异常</p>}
        </StepCard>
        <StepCard title="2. AI 取证" active={Boolean(investigateResult)}>
          <button className="rounded bg-sentinel-ink px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!detail || investigating} onClick={onInvestigate}>{investigating ? "取证中" : "推理取证"}</button>
          <div className="mt-3"><AgentTrace result={investigateResult} /></div>
        </StepCard>
        <StepCard title="3. 红队校验" active={Boolean(challengeResult)}>
          <button className="rounded border border-sentinel-risk px-3 py-2 text-sm text-sentinel-risk disabled:opacity-50" disabled={!detail || challenging} onClick={onChallenge}>{challenging ? "校验中" : "红队校验"}</button>
          <div className="mt-3"><ChallengePanel result={challengeResult} /></div>
        </StepCard>
        <StepCard title="4. 研判结论" active={Boolean(aiReport)}>
          <button className="rounded bg-sentinel-risk px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!detail || reporting} onClick={onReport}>{reporting ? "生成中" : "生成 AI 研判报告"}</button>
          {aiReport ? <p className="mt-3 text-sm leading-6 text-[#40564d]">{aiReport.conclusion.summary}</p> : null}
        </StepCard>
        <StepCard title="5. 创建工单" active={workOrderExists}>
          <button className="rounded bg-sentinel-ink px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!aiReport || creatingWorkOrder || workOrderExists} onClick={onCreateWorkOrder}>{workOrderExists ? "已进入看板" : creatingWorkOrder ? "创建中" : "按 AI 建议创建工单"}</button>
        </StepCard>
      </div>
    </aside>
  );
}

function StepCard({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <section className={active ? "rounded-md border border-[#b8c9bf] bg-[#f7fbf8] p-3" : "rounded-md border border-sentinel-line bg-[#fbfcfb] p-3"}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}