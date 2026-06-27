import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { rmSync } from "node:fs";
import copilot from "./copilot";
import workorders from "./workorders";
import { getDb } from "../db/client";
import { seedDb } from "../db/seed";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceHistoryPoint, PriceRecord } from "@shared/types";

const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

function setupApp() {
  process.env.MOCK_LLM = "1";
  process.env.DB_PATH = `data/copilot-routes-${crypto.randomUUID()}.test.sqlite`;
  rmSync(process.env.DB_PATH, { force: true });
  const db = getDb();
  seedDb(db);
  const records = db.query(SEL).all() as PriceRecord[];
  const history = db.query("SELECT mi_code miCode,region,date,price FROM price_history").all() as PriceHistoryPoint[];
  const anomaly = detectAll(records, history, DEFAULT_THRESHOLDS).find(item => item.id === "A-S1");
  expect(anomaly).toBeDefined();
  db.prepare(`INSERT INTO anomalies
    (id,record_id,dimensions,risk_score,risk_level,confidence,status,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(anomaly!.id, anomaly!.recordId, JSON.stringify(anomaly!.dimensions), anomaly!.riskScore, anomaly!.riskLevel, anomaly!.confidence, anomaly!.status, anomaly!.createdAt);

  const app = new Hono();
  app.route("/api", copilot);
  app.route("/api", workorders);
  return { app, db };
}

describe("copilot routes", () => {
  test("context returns regulator dashboard data and actionable tasks", async () => {
    const { app } = setupApp();

    const response = await app.request("/api/copilot/context");
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.stats.anomalyCount).toBeGreaterThan(0);
    expect(json.data.modelStatus).toMatchObject({ mode: "mock", provider: "openai-compatible" });
    expect(json.data.pendingAnomalyCount).toBeGreaterThan(0);
    expect(json.data.tasks).toContainEqual(expect.objectContaining({
      type: "investigate",
      targetPage: "anomalies",
      targetId: "A-S1",
      anomalyId: "A-S1",
    }));
  });

  test("chat answers with citations and suggested navigation", async () => {
    const { app } = setupApp();
    await app.request("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyId: "A-S1", type: "inquiry", assignee: "监管一组" }),
    });

    const response = await app.request("/api/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "今天先做什么？",
        page: "anomalies",
        selected: { type: "anomaly", id: "A-S1" },
      }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.answer).toContain("建议");
    expect(json.data.citations).toContainEqual({ type: "anomaly", id: "A-S1", label: "异常 A-S1" });
    expect(json.data.suggestedLinks[0]).toMatchObject({ page: expect.any(String), id: expect.any(String) });
  });

  test("chat rejects empty messages", async () => {
    const { app } = setupApp();

    const response = await app.request("/api/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    });

    expect(response.status).toBe(400);
  });
});