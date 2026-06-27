const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.msg ?? "request failed");
  return json.data as T;
}

export const api = {
  getStats: () => call("/stats/overview"),
  getPrices: (query = "") => call(`/prices${query}`),
  getPrice: (id: string) => call(`/prices/${id}`),
  detect: () => call("/detect", jsonInit("POST", {})),
  getAnomalies: (query = "") => call(`/anomalies${query}`),
  getAnomaly: (id: string) => call(`/anomalies/${id}`),
  getAiStatus: () => call("/agent/status"),
  getAiBriefing: () => call("/agent/briefing"),
  investigate: (id: string) => call(`/agent/investigate/${id}`, jsonInit("POST")),
  challenge: (id: string) => call(`/agent/challenge/${id}`, jsonInit("POST")),
  getAiReport: (id: string) => call(`/agent/report/${id}`, jsonInit("POST")),
  standardize: (records: unknown[]) => call("/tools/standardize", jsonInit("POST", { records })),
  createWorkOrder: (body: unknown) => call("/work-orders", jsonInit("POST", body)),
  patchWorkOrder: (id: string, body: unknown) => call(`/work-orders/${id}`, jsonInit("PATCH", body)),
  recheck: (id: string) => call(`/work-orders/${id}/recheck`, jsonInit("POST", {})),
  getBoard: () => call("/board"),
  getCopilotContext: () => call("/copilot/context"),
  postCopilotChat: (body: unknown) => call("/copilot/chat", jsonInit("POST", body)),
  createPrice: (body: unknown) => call("/prices", jsonInit("POST", body)),
  updatePrice: (id: string, body: unknown) => call(`/prices/${id}`, jsonInit("PATCH", body)),
  deletePrice: (id: string) => call(`/prices/${id}`, jsonInit("DELETE")),
  getRulesConfig: () => call("/rules/config"),
  patchRulesConfig: (body: unknown) => call("/rules/config", jsonInit("PATCH", body)),
  patchAnomaly: (id: string, body: unknown) => call(`/anomalies/${id}`, jsonInit("PATCH", body)),
  detectWithThresholds: (thresholds: unknown) => call("/detect", jsonInit("POST", { thresholds })),
};