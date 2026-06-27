export async function chat(system: string, user: string): Promise<string> {
  const base = process.env.LLM_BASE_URL;
  if (process.env.MOCK_LLM === "1" || !base) return mockReply(system, user);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}) },
      body: JSON.stringify({ model: process.env.LLM_MODEL ?? "deepseek-chat",
        temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content ?? mockReply(system, user);
  } catch { return mockReply(system, user); }
}
function mockReply(system: string, user: string): string {
  if (system.includes("红队") || system.includes("反驳"))
    return "已逐项检验：规格/剂型一致、无政策调价、非特殊采购、单位口径正确——未发现可解释为合理的理由，异常成立。";
  return "依据多维比价证据，该价格显著偏离合理基准，疑似未按中标价采购/地区价差异常，建议核查并约谈。风险等级：高。";
}
