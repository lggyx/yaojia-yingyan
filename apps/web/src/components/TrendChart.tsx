import ReactECharts from "echarts-for-react";
import type { PriceDetail } from "../types";

export function TrendChart({ detail }: { detail: PriceDetail | null }) {
  const history = detail?.history ?? [];
  const option = {
    animationDuration: 420,
    color: ["#d63c32"],
    grid: { left: 40, right: 16, top: 28, bottom: 34 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: history.map(point => point.date), axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { formatter: "¥{value}" }, splitLine: { lineStyle: { color: "#e2ebe5" } } },
    series: [{ type: "line", smooth: true, symbolSize: 7, data: history.map(point => point.price), areaStyle: { opacity: 0.08 } }],
  };

  return (
    <section className="rounded-md border border-sentinel-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">价格趋势</h2>
          <p className="mt-1 text-xs text-[#60746b]">{detail ? `${detail.generic} · ${detail.region}` : "选择一条记录查看历史"}</p>
        </div>
        {detail?.tenderPrice == null ? null : <span className="rounded border border-sentinel-line px-2 py-1 text-xs">中标价 ¥{detail.tenderPrice.toFixed(2)}</span>}
      </div>
      <ReactECharts option={option} style={{ height: 280, width: "100%" }} notMerge />
    </section>
  );
}