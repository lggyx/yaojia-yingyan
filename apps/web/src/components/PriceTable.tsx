import type { Anomaly, PriceRecord } from "../types";

const riskText = { high: "高", mid: "中", low: "低" };

export function PriceTable({ records, anomalies, selectedId, onSelect }: {
  records: PriceRecord[];
  anomalies: Anomaly[];
  selectedId: string | null;
  onSelect: (id: string, anomalyId?: string) => void;
}) {
  const byRecord = new Map(anomalies.map(item => [item.recordId, item]));

  return (
    <section className="overflow-hidden rounded-md border border-sentinel-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-sentinel-line px-4 py-3">
        <h2 className="text-base font-semibold">价格监测明细</h2>
        <span className="font-mono text-xs text-[#60746b]">{records.length} / current page</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#edf3ef] text-xs text-[#60746b]">
            <tr>
              <Th>品种</Th>
              <Th>医院/地区</Th>
              <Th>采购价</Th>
              <Th>中标价</Th>
              <Th>风险</Th>
              <Th>日期</Th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => {
              const anomaly = byRecord.get(record.id);
              const active = selectedId === record.id;
              return (
                <tr
                  key={record.id}
                  className={active ? "cursor-pointer bg-[#f8e8e4]" : "cursor-pointer border-t border-[#e3ebe6] hover:bg-[#f5f8f6]"}
                  onClick={() => onSelect(record.id, anomaly?.id)}
                >
                  <Td>
                    <div className="font-medium">{record.generic}</div>
                    <div className="mt-1 text-xs text-[#60746b]">{record.brand} · {record.spec}</div>
                  </Td>
                  <Td>{record.hospital}<div className="mt-1 text-xs text-[#60746b]">{record.region}</div></Td>
                  <Td>¥{record.price.toFixed(2)}</Td>
                  <Td>{record.tenderPrice == null ? "-" : `¥${record.tenderPrice.toFixed(2)}`}</Td>
                  <Td>
                    {anomaly ? <div className="grid gap-1"><RiskBadge level={anomaly.riskLevel} /><span className="text-xs text-sentinel-risk">查看异常</span></div> : <span className="text-[#60746b]">正常</span>}
                  </Td>
                  <Td>{record.date}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3 align-top">{children}</td>;
}

function RiskBadge({ level }: { level: "high" | "mid" | "low" }) {
  const cls = level === "high" ? "border-sentinel-risk bg-[#fff4f2] text-sentinel-risk" : level === "mid" ? "border-sentinel-amber bg-[#fff8ec] text-sentinel-amber" : "border-[#b8c9bf] bg-[#f3f7f4] text-[#60746b]";
  return <span className={`inline-flex min-w-10 justify-center rounded border px-2 py-1 text-xs ${cls}`}>{riskText[level]}</span>;
}