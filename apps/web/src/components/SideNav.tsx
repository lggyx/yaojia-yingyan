import type { PageKey } from "../types";

const navItems: Array<{ page: PageKey; label: string; description: string }> = [
  { page: "workspace", label: "今日工作台", description: "任务总览" },
  { page: "anomalies", label: "异常研判", description: "取证与结论" },
  { page: "work-orders", label: "处置工单", description: "状态流转" },
  { page: "recheck", label: "复核闭环", description: "整改复核" },
  { page: "data-rules", label: "数据与规则", description: "维护校验" },
];

export function SideNav({ activePage, onNavigate }: {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[208px] shrink-0 border-r border-sentinel-line bg-[#10231d] px-3 py-4 text-white shadow-[16px_0_50px_rgba(11,23,20,0.18)] md:flex md:flex-col">
      <div className="rounded-md border border-white/10 bg-white/5 p-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9fb9ad]">Price Sentinel</div>
        <div className="mt-2 text-lg font-semibold">药价鹰眼</div>
      </div>
      <nav className="mt-5 grid gap-1" aria-label="主导航">
        {navItems.map(item => {
          const active = item.page === activePage;
          return (
            <button
              key={item.page}
              type="button"
              className={active
                ? "grid grid-cols-[auto_1fr] items-center gap-3 rounded-md border border-[#b9d7c8] bg-[#e7f4eb] px-3 py-2.5 text-left text-sentinel-ink shadow-sm"
                : "grid grid-cols-[auto_1fr] items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left text-[#c7d8cf] hover:border-white/10 hover:bg-white/8 hover:text-white"}
              onClick={() => onNavigate(item.page)}
            >
              <span className={active ? "h-2.5 w-2.5 rounded-full bg-sentinel-risk" : "h-2.5 w-2.5 rounded-full border border-[#7f978b]"} />
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={active ? "mt-0.5 block text-[11px] text-[#60746b]" : "mt-0.5 block text-[11px] text-[#8ca296]"}>{item.description}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}