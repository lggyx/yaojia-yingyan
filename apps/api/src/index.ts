import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db/client";
import { seedDb } from "./db/seed";
import prices from "./routes/prices";

const db = getDb();
if ((db.query("SELECT COUNT(*) c FROM price_records").get() as { c: number }).c === 0) seedDb(db);

const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ code: 0, msg: "ok" }));
app.route("/api", prices);

export const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
export const fail = (msg: string) => ({ code: 1, msg });
export default { port: 8787, fetch: app.fetch };
