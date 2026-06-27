export function DataRulesPage() {
  const tabs = ["价格记录", "规则配置", "标准化工具"];

  return (
    <div className="grid gap-4">
      <header className="rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Data & Rules</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">数据与规则</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60746b]">P1 先建立入口；价格 CRUD、规则配置和标准化工具在 P3 接入。</p>
      </header>
      <section className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => <button key={tab} className="rounded border border-sentinel-line px-3 py-2 text-sm text-[#40564d]">{tab}</button>)}
        </div>
        <div className="mt-5 rounded border border-dashed border-sentinel-line bg-[#fbfcfb] p-8 text-center text-sm text-[#60746b]">建设中</div>
      </section>
    </div>
  );
}