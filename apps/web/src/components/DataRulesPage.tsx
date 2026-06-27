import { useEffect, useState } from "react";
import type { PriceRecord, RuleConfig } from "../types";
import { api } from "../lib/api";

export function DataRulesPage() {
  const [tab, setTab] = useState<"prices" | "rules" | "standardize">("prices");

  return (
    <div className="grid gap-4">
      <header className="rounded-lg border border-sentinel-line bg-sentinel-panel p-5 shadow-[0_24px_70px_rgba(11,23,20,0.12)]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-sentinel-risk">Data & Rules</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">数据与规则</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60746b]">管理价格记录、调整检测规则阈值、标准化药品描述。</p>
      </header>
      <section className="rounded-md border border-sentinel-line bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-sentinel-line px-4 pt-3">
          {(["prices", "rules", "standardize"] as const).map(t => (
            <button
              key={t}
              className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-x border-t border-sentinel-line bg-white text-sentinel-ink -mb-[1px]"
                  : "text-[#60746b] hover:text-sentinel-ink hover:bg-[#f7fbf8]"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "prices" ? "价格记录" : t === "rules" ? "规则配置" : "标准化工具"}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "prices" && <PriceRecordsTab />}
          {tab === "rules" && <RulesConfigTab />}
          {tab === "standardize" && <StandardizeTab />}
        </div>
      </section>
    </div>
  );
}

// ─── 价格记录 Tab ───

function PriceRecordsTab() {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PriceRecord | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.getPrices("?pageSize=50")
      .then((res: any) => setRecords(res.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该记录？")) return;
    try {
      await api.deletePrice(id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = async (data: Partial<PriceRecord>) => {
    try {
      if (editing) {
        await api.updatePrice(editing.id, data);
      } else {
        await api.createPrice({ ...data, id: `PR-${crypto.randomUUID()}` });
      }
      setEditing(null);
      setShowNew(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="h-32 animate-pulse rounded bg-[#fbfcfb]" />;

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-sentinel-risk bg-[#fff4f2] px-3 py-2 text-sm text-sentinel-risk">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[#60746b]">共 {records.length} 条</span>
        <button
          className="rounded bg-sentinel-ink px-3 py-1.5 text-sm text-white"
          onClick={() => setShowNew(true)}
        >新增记录</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sentinel-line text-left text-xs text-[#60746b]">
              <th className="pb-2 pr-2">医保编码</th>
              <th className="pb-2 pr-2">通用名</th>
              <th className="pb-2 pr-2">厂商</th>
              <th className="pb-2 pr-2">规格</th>
              <th className="pb-2 pr-2">价格</th>
              <th className="pb-2 pr-2">中标价</th>
              <th className="pb-2 pr-2">医院</th>
              <th className="pb-2 pr-2">地区</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-sentinel-line/50 hover:bg-[#f7fbf8]">
                <td className="py-2 pr-2 font-mono text-xs">{r.miCode}</td>
                <td className="py-2 pr-2">{r.generic}</td>
                <td className="py-2 pr-2 text-xs">{r.manufacturer}</td>
                <td className="py-2 pr-2 text-xs">{r.spec}</td>
                <td className="py-2 pr-2 font-mono">¥{r.price.toFixed(2)}</td>
                <td className="py-2 pr-2 font-mono">{r.tenderPrice != null ? `¥${r.tenderPrice.toFixed(2)}` : "-"}</td>
                <td className="py-2 pr-2 text-xs">{r.hospital}</td>
                <td className="py-2 pr-2 text-xs">{r.region}</td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button className="rounded border border-sentinel-line px-2 py-0.5 text-xs hover:bg-white" onClick={() => setEditing(r)}>编辑</button>
                    <button className="rounded border border-sentinel-risk px-2 py-0.5 text-xs text-sentinel-risk hover:bg-[#fff4f2]" onClick={() => handleDelete(r.id)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || showNew) && (
        <PriceFormModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function PriceFormModal({ initial, onSave, onCancel }: {
  initial?: PriceRecord;
  onSave: (data: Partial<PriceRecord>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<PriceRecord>>(initial ?? {});

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const fields: Array<[string, string, string]> = [
    ["miCode", "医保编码", "text"],
    ["generic", "通用名", "text"],
    ["brand", "品牌", "text"],
    ["manufacturer", "厂商", "text"],
    ["spec", "规格", "text"],
    ["form", "剂型", "text"],
    ["category", "类别 (drug/consumable)", "text"],
    ["price", "价格", "number"],
    ["tenderPrice", "中标价", "number"],
    ["hospital", "医院", "text"],
    ["region", "地区", "text"],
    ["date", "日期", "text"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-sentinel-line bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">{initial ? "编辑价格记录" : "新增价格记录"}</h3>
        <div className="mt-4 grid gap-3">
          {fields.map(([key, label, type]) => (
            <label key={key} className="grid gap-1">
              <span className="text-xs text-[#60746b]">{label}</span>
              <input
                type={type}
                className="rounded border border-sentinel-line px-3 py-2 text-sm outline-none focus:border-[#b9d7c8]"
                value={(form as any)[key] ?? ""}
                onChange={e => set(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border border-sentinel-line px-4 py-2 text-sm" onClick={onCancel}>取消</button>
          <button className="rounded bg-sentinel-ink px-4 py-2 text-sm text-white" onClick={() => onSave(form)}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── 规则配置 Tab ───

function RulesConfigTab() {
  const [config, setConfig] = useState<RuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    api.getRulesConfig()
      .then((res: any) => setConfig(res))
      .catch(() => setMsg("加载配置失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.patchRulesConfig(config);
      setMsg("保存成功");
    } catch {
      setMsg("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const reDetect = async () => {
    if (!config) return;
    setDetecting(true);
    try {
      await api.detectWithThresholds(config);
      setMsg("重新检测完成，请前往异常研判查看结果");
    } catch {
      setMsg("检测失败");
    } finally {
      setDetecting(false);
    }
  };

  if (loading) return <div className="h-32 animate-pulse rounded bg-[#fbfcfb]" />;

  return (
    <div className="max-w-md">
      <p className="mb-4 text-sm text-[#60746b]">调整检测阈值后点击"保存"，再点击"重新检测"即可使用新参数重新分析异常。</p>

      {msg && (
        <div className="mb-3 rounded border border-[#b9d7c8] bg-[#e7f4eb] px-3 py-2 text-sm text-sentinel-ink">
          {msg}
          <button className="ml-2 underline" onClick={() => setMsg(null)}>关闭</button>
        </div>
      )}

      <div className="grid gap-4">
        {([
          ["tenderRatio", "中标价比价阈值", "价格超过中标价 N 倍时触发"],
          ["historyMoM", "历史环比波动", "环比波动超过 N (如 0.3=30%) 触发"],
          ["regionalDev", "地区偏差阈值", "地区间价格偏差超过 N (如 0.5=50%) 触发"],
          ["volumeRate", "量价偏离率", "采购量与实际价格偏离超过 N 触发"],
        ] as const).map(([key, label, desc]) => (
          <label key={key} className="grid gap-1">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-[#60746b]">{desc}</span>
            <input
              type="number"
              step="0.01"
              className="rounded border border-sentinel-line px-3 py-2 text-sm outline-none focus:border-[#b9d7c8]"
              value={config?.[key] ?? ""}
              onChange={e => setConfig(prev => prev ? { ...prev, [key]: parseFloat(e.target.value) || 0 } : prev)}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="rounded bg-sentinel-ink px-4 py-2 text-sm text-white disabled:opacity-50" onClick={save} disabled={saving}>
          {saving ? "保存中" : "保存配置"}
        </button>
        <button className="rounded border border-sentinel-risk px-4 py-2 text-sm text-sentinel-risk disabled:opacity-50" onClick={reDetect} disabled={detecting}>
          {detecting ? "检测中" : "重新检测"}
        </button>
      </div>
    </div>
  );
}

// ─── 标准化工具 Tab ───

function StandardizeTab() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStandardize = async () => {
    const lines = input.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return;
    setLoading(true);
    try {
      const res: any = await api.standardize(lines.map(rawName => ({ rawName })));
      setResults(res.items);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-[#60746b]">输入药品/耗材原始描述（每行一条），AI 将标准化为医保编码、通用名、规格、剂型。</p>

      <textarea
        className="w-full rounded border border-sentinel-line px-3 py-2 text-sm outline-none focus:border-[#b9d7c8]"
        rows={5}
        placeholder={"阿莫西林胶囊 0.5g\n盐酸二甲双胍片 0.5g*30片"}
        value={input}
        onChange={e => setInput(e.target.value)}
      />

      <button
        className="mt-3 rounded bg-sentinel-ink px-4 py-2 text-sm text-white disabled:opacity-50"
        onClick={handleStandardize}
        disabled={loading || !input.trim()}
      >
        {loading ? "标准化中" : "开始标准化"}
      </button>

      {results && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sentinel-line text-left text-xs text-[#60746b]">
                <th className="pb-2 pr-2">原始描述</th>
                <th className="pb-2 pr-2">医保编码</th>
                <th className="pb-2 pr-2">通用名</th>
                <th className="pb-2 pr-2">剂型</th>
                <th className="pb-2 pr-2">规格</th>
                <th className="pb-2 pr-2">厂商</th>
                <th className="pb-2">置信度</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-sentinel-line/50">
                  <td className="py-2 pr-2">{r.raw}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{r.miCode}</td>
                  <td className="py-2 pr-2">{r.generic}</td>
                  <td className="py-2 pr-2">{r.form || "-"}</td>
                  <td className="py-2 pr-2">{r.spec || "-"}</td>
                  <td className="py-2 pr-2">{r.manufacturer || "-"}</td>
                  <td className="py-2">{r.confidence != null ? `${(r.confidence * 100).toFixed(0)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}