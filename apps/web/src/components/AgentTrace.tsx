import type { InvestigateResult } from "../types";

export function AgentTrace({ result }: { result: InvestigateResult | null }) {
  if (!result) return <Empty title="待取证" text="点击推理取证后展示工具调用链。" />;

  return (
    <section className="grid gap-3">
      <div className="rounded-md border border-sentinel-line bg-[#fbfcfb] p-3 text-sm leading-6 text-[#40564d]">
        {result.explanation}
      </div>
      <div className="grid gap-2">
        {result.trace.map(step => (
          <article key={`${step.step}-${step.tool}`} className="rounded-md border border-sentinel-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-sentinel-risk">#{step.step}</span>
              <span className="rounded border border-sentinel-line px-2 py-1 font-mono text-[11px] text-[#60746b]">{step.tool}</span>
            </div>
            <pre className="mt-3 max-h-32 overflow-auto rounded bg-[#eef3ef] p-2 text-[11px] leading-5 text-[#40564d]">
              {JSON.stringify({ input: step.input, output: step.output }, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-sentinel-line bg-[#fbfcfb] p-4 text-sm text-[#60746b]">
      <div className="font-medium text-sentinel-ink">{title}</div>
      <p className="mt-1">{text}</p>
    </div>
  );
}