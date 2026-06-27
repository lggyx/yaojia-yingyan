import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { rmSync } from "node:fs";
import workorders from "./workorders";
import board from "./board";
import { getDb } from "../db/client";
import { seedDb } from "../db/seed";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceHistoryPoint, PriceRecord } from "@shared/types";

const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

function setupApp() {
  process.env.DB_PATH = `data/workorders-${crypto.randomUUID()}.test.sqlite`;
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
  app.route("/api", workorders);
  app.route("/api", board);
  return { app, db };
}

describe("work order routes", () => {
  test("create, advance, recheck, close, and show on board", async () => {
    const { app, db } = setupApp();

    const created = await app.request("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyId: "A-S1", type: "inquiry", assignee: "监管一组" }),
    });
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({ code: 0, data: { id: "WO-A-S1", status: "pending" } });
    expect(db.query("SELECT status FROM anomalies WHERE id='A-S1'").get()).toEqual({ status: "disposing" });

    const processing = await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing", note: "已发起核查" }),
    });
    expect(processing.status).toBe(200);

    const detail = await app.request("/api/work-orders/WO-A-S1");
    const detailJson = await detail.json();
    expect(detailJson.data.events).toContainEqual(expect.objectContaining({ fromStatus: "pending", toStatus: "processing" }));

    const notCorrected = await app.request("/api/work-orders/WO-A-S1/recheck", { method: "POST" });
    expect(await notCorrected.json()).toMatchObject({ code: 0, data: { corrected: false, canClose: false } });

    const done = await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done", correctedPrice: 6.6, note: "价格已修正" }),
    });
    expect(done.status).toBe(200);

    const recheck = await app.request("/api/work-orders/WO-A-S1/recheck", { method: "POST" });
    expect(await recheck.json()).toMatchObject({ code: 0, data: { corrected: true, latestPrice: 6.6, canClose: true } });

    const closed = await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed", note: "AI复核通过，归档" }),
    });
    expect(closed.status).toBe(200);
    expect(db.query("SELECT status FROM anomalies WHERE id='A-S1'").get()).toEqual({ status: "closed" });

    const boardRes = await app.request("/api/board");
    const boardJson = await boardRes.json();
    expect(boardJson.data.columns.find((col: any) => col.status === "closed").cards)
      .toContainEqual(expect.objectContaining({
        id: "WO-A-S1",
        status: "closed",
        generic: "硫酸氢氯吡格雷片",
        hospital: "县人民医院",
        region: "安徽省",
        riskLevel: "high",
        currentStep: "已闭环",
        nextStep: "归档复盘",
        lastEvent: "AI复核通过，归档",
      }));
  });

  test("rejects missing anomalies, duplicate work orders, invalid transitions, and unverified closure", async () => {
    const { app } = setupApp();

    const missing = await app.request("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyId: "A-MISSING", type: "inquiry" }),
    });
    expect(missing.status).toBe(404);

    const created = await app.request("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyId: "A-S1", type: "inquiry" }),
    });
    expect(created.status).toBe(200);

    const duplicate = await app.request("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anomalyId: "A-S1", type: "inquiry" }),
    });
    expect(duplicate.status).toBe(409);

    const directClose = await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    expect(directClose.status).toBe(400);

    await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing" }),
    });
    await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    const unverifiedClose = await app.request("/api/work-orders/WO-A-S1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    expect(unverifiedClose.status).toBe(400);
  });
});