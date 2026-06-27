import { useCallback, useEffect, useRef, useState } from "react";
import type { CopilotChatResponse, CopilotContext, CopilotMessage, PageKey, SuggestedLink, TaskItem } from "../types";
import { api } from "../lib/api";

type Citation = CopilotChatResponse["citations"][number];

export function CopilotSidebar({
  activePage,
  selectedAnomalyId,
  selectedWorkOrderId,
  onNavigateTask,
}: {
  activePage: PageKey;
  selectedAnomalyId: string | null;
  selectedWorkOrderId: string | null;
  onNavigateTask: (page: PageKey, id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [suggestedTasks, setSuggestedTasks] = useState<TaskItem[]>([]);
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setContextLoading(true);
    api.getCopilotContext()
      .then(result => {
        if (!active) return;
        const context = result as CopilotContext;
        setSuggestedTasks(context.tasks.slice(0, 4));
        setSuggestedLinks(context.tasks.slice(0, 3).map(task => ({
          label: task.label,
          page: task.targetPage,
          id: task.targetId,
        })));
      })
      .catch(() => {
        if (active) setSuggestedTasks([]);
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: CopilotMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const selected: { type?: string; id?: string } = {};
      if (selectedAnomalyId) { selected.type = "anomaly"; selected.id = selectedAnomalyId; }
      else if (selectedWorkOrderId) { selected.type = "work_order"; selected.id = selectedWorkOrderId; }

      const res = await api.postCopilotChat({
        message: text,
        page: activePage,
        selected: Object.keys(selected).length ? selected : undefined,
        history: messages.slice(-6),
      }) as CopilotChatResponse;

      const assistantMsg: CopilotMessage = { role: "assistant", content: res.answer };
      setMessages(prev => [...prev, assistantMsg]);
      setCitations(res.citations ?? []);
      setSuggestedTasks(res.suggestedTasks ?? []);
      setSuggestedLinks(res.suggestedLinks ?? []);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，暂时无法回应，请稍后重试。" }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activePage, selectedAnomalyId, selectedWorkOrderId, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTaskClick = (task: TaskItem) => {
    onNavigateTask(task.targetPage, task.targetId);
    setOpen(false);
  };

  const handleLinkClick = (link: SuggestedLink) => {
    onNavigateTask(link.page, link.id);
    setOpen(false);
  };

  const handleCitationClick = (citation: Citation) => {
    if (citation.type === "anomaly") onNavigateTask("anomalies", citation.id);
    if (citation.type === "work_order") onNavigateTask("work-orders", citation.id);
    setOpen(false);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`fixed right-0 top-4 z-50 rounded-l-lg border border-r-0 border-sentinel-line bg-sentinel-panel px-2 py-3 text-sentinel-ink shadow-md transition-all hover:bg-white ${
          open ? "translate-x-0" : ""
        }`}
        style={{ right: open ? 360 : 0 }}
        title={open ? "收起助手" : "展开助手"}
      >
        <span className="text-sm font-mono">{open ? "→" : "←"}</span>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-[360px] flex-col border-l border-sentinel-line bg-white shadow-[-8px_0_30px_rgba(11,23,20,0.08)] transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-sentinel-line bg-sentinel-panel px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-sentinel-ink">AI 助手</h2>
              <p className="mt-0.5 text-xs text-[#60746b]">药价鹰眼智能调度</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-[#60746b] hover:bg-white hover:text-sentinel-ink"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-[#60746b]">你好！我是药价鹰眼智能助手</p>
              <p className="mt-2 text-xs text-[#8ca296]">可以问我"今天先做什么"、"这条为什么异常"或"下一步建议"</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.role === "user" ? "flex justify-end" : ""}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-sentinel-ink text-white"
                    : "border border-sentinel-line bg-[#f7fbf8] text-sentinel-ink"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="mb-3">
              <div className="inline-block max-w-[85%] rounded-lg border border-sentinel-line bg-[#f7fbf8] px-3 py-2 text-sm text-[#60746b]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sentinel-risk" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sentinel-risk" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sentinel-risk" style={{ animationDelay: "0.4s" }} />
                </span>
              </div>
            </div>
          )}

          {contextLoading && messages.length === 0 && (
            <div className="mb-3 rounded-md border border-sentinel-line bg-[#f7fbf8] px-3 py-2 text-xs text-[#60746b]">
              正在读取今日任务上下文...
            </div>
          )}

          {citations.length > 0 && (
            <div className="mb-4 mt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#60746b]">引用依据</p>
              <div className="flex flex-wrap gap-2">
                {citations.map(citation => (
                  <button
                    key={`${citation.type}-${citation.id}`}
                    type="button"
                    onClick={() => handleCitationClick(citation)}
                    className="rounded-full border border-sentinel-line bg-[#f7fbf8] px-3 py-1 text-xs text-sentinel-ink hover:border-[#b9d7c8] hover:bg-[#e7f4eb]"
                  >
                    {citation.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested tasks */}
          {suggestedTasks.length > 0 && (
            <div className="mt-3 mb-4">
              <p className="mb-2 text-xs font-semibold text-[#60746b] uppercase tracking-wider">建议操作</p>
              <div className="grid gap-2">
                {suggestedTasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskClick(task)}
                    className="flex items-center gap-2 rounded-md border border-sentinel-line bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-[#b9d7c8] hover:bg-[#e7f4eb]"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${
                      task.priority === "high" ? "bg-sentinel-risk" : task.priority === "mid" ? "bg-[#e6a817]" : "bg-[#60746b]"
                    }`} />
                    <span className="text-sentinel-ink">{task.label}</span>
                    <span className="ml-auto font-mono text-[11px] text-[#8ca296]">
                      {task.type === "investigate" ? "研判" : task.type === "create_work_order" ? "建单" : task.type === "advance" ? "推进" : task.type === "recheck" ? "复核" : "闭环"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested links */}
          {suggestedLinks.length > 0 && (
            <div className="mt-3 mb-4">
              <p className="mb-2 text-xs font-semibold text-[#60746b] uppercase tracking-wider">快速跳转</p>
              <div className="flex flex-wrap gap-2">
                {suggestedLinks.map((link, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleLinkClick(link)}
                    className="rounded-full border border-sentinel-line bg-white px-3 py-1 text-xs text-sentinel-ink hover:border-[#b9d7c8] hover:bg-[#e7f4eb]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-sentinel-line bg-white px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，如「今天先做什么」"
              disabled={loading}
              className="flex-1 rounded-md border border-sentinel-line bg-white px-3 py-2 text-sm text-sentinel-ink placeholder-[#8ca296] outline-none transition-colors focus:border-[#b9d7c8] focus:ring-1 focus:ring-[#b9d7c8] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-md bg-sentinel-ink px-4 py-2 text-sm text-white transition-colors hover:bg-[#1a3a2e] disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}