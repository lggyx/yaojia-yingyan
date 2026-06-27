import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { rmSync } from "node:fs";
import agent from "./agent";
import { getDb } from "../db/client";
import { seedDb } from "../db/seed";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceHistoryPoint, PriceRecord } from "@shared/types";

const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

function setupApp() {
  process.env.DB_PATH = "data/agent-routes.test.sqlite";
  rmSync(process.env.DB_PATH, { force: true });
  const db = getDb();
  seedDb(db);
  const records = db.query(SEL).all() as PriceRecord[];
  const history = db.query("SELECT mi_code miCode,region,date,price FROM price_history").all() as PriceHistoryPoint[];
  const anomaly = detectAll(records, history, DEFAULT_THRESHOLDS).find(a => a.id === "A-S1");
  expect(anomaly).toBeDefined();
  db.prepare(`INSERT INTO anomalies
    (id,record_id,dimensions,risk_score,risk_level,confidence,status,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(anomaly!.id, anomaly!.recordId, JSON.stringify(anomaly!.dimensions), anomaly!.riskScore, anomaly!.riskLevel, anomaly!.confidence, anomaly!.status, anomaly!.createdAt);

  const app = new Hono();
  app.route("/api", agent);
  return { app, db };
}

describe("agent routes", () => {
  test("agent status reports remote llm configuration without exposing secrets", async () => {
    const previous = {
      base: process.env.LLM_BASE_URL,
      key: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      mock: process.env.MOCK_LLM,
    };
    process.env.LLM_BASE_URL = "https://llm.example.com";
    process.env.LLM_API_KEY = "sk-test-secret";
    process.env.LLM_MODEL = "gpt-5.5";
    delete process.env.MOCK_LLM;

    try {
      const app = new Hono();
      app.route("/api", agent);
      const response = await app.request("/api/agent/status");

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        code: 0,
        data: {
          mode: "remote",
          model: "gpt-5.5",
          provider: "openai-compatible",
          baseConfigured: true,
          keyConfigured: true,
        },
        msg: "ok",
      });
      expect(JSON.stringify(json)).not.toContain("sk-test-secret");
    } finally {
      previous.base === undefined ? delete process.env.LLM_BASE_URL : process.env.LLM_BASE_URL = previous.base;
      previous.key === undefined ? delete process.env.LLM_API_KEY : process.env.LLM_API_KEY = previous.key;
      previous.model === undefined ? delete process.env.LLM_MODEL : process.env.LLM_MODEL = previous.model;
      previous.mock === undefined ? delete process.env.MOCK_LLM : process.env.MOCK_LLM = previous.mock;
    }
  });

  test("repeated investigate and challenge calls record traces without 500", async () => {
    const { app, db } = setupApp();

    expect((await app.request("/api/agent/investigate/A-S1", { method: "POST" })).status).toBe(200);
    expect((await app.request("/api/agent/investigate/A-S1", { method: "POST" })).status).toBe(200);
    expect((await app.request("/api/agent/challenge/A-S1", { method: "POST" })).status).toBe(200);
    expect((await app.request("/api/agent/challenge/A-S1", { method: "POST" })).status).toBe(200);

    expect(db.query("SELECT COUNT(*) count FROM agent_traces WHERE anomaly_id='A-S1'").get()).toEqual({ count: 4 });
  });
});