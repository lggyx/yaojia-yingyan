export interface LlmStatus {
  mode: "mock" | "remote";
  model: string;
  provider: "openai-compatible";
  baseConfigured: boolean;
  keyConfigured: boolean;
}

export function getLlmStatus(): LlmStatus {
  const baseConfigured = Boolean(process.env.LLM_BASE_URL);
  const keyConfigured = Boolean(process.env.LLM_API_KEY);
  return {
    mode: process.env.MOCK_LLM === "1" || !baseConfigured ? "mock" : "remote",
    model: process.env.LLM_MODEL ?? "gpt-5.5",
    provider: "openai-compatible",
    baseConfigured,
    keyConfigured,
  };
}

export async function chat(system: string, user: string): Promise<{ content: string; usedMock: boolean }> {
  const base = process.env.LLM_BASE_URL;
  if (process.env.MOCK_LLM === "1" || !base) return { content: mockReply(system, user), usedMock: true };
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 8000);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model: getLlmStatus().model,
        temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (content) return { content, usedMock: false };
    return { content: mockReply(system, user), usedMock: true };
  } catch { return { content: mockReply(system, user), usedMock: true }; }
}
function mockReply(system: string, user: string): string {
  if (system.includes("红队") || system.includes("反驳"))
    return "已逐项检验：规格/剂型一致、无政策调价、非特殊采购、单位口径正确——未发现可解释为合理的理由，异常成立。";
  return "依据多维比价证据，该价格显著偏离合理基准，疑似未按中标价采购/地区价差异常，建议核查并约谈。风险等级：高。";
}
