import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db/client";
import { seedDb } from "./db/seed";
import prices from "./routes/prices";
import anomalies from "./routes/anomalies";
import agent from "./routes/agent";
import workorders from "./routes/workorders";
import board from "./routes/board";

const db = getDb();
if ((db.query("SELECT COUNT(*) c FROM price_records").get() as { c: number }).c === 0) seedDb(db);

const app = new Hono();
app.use("*", cors({
	origin: "*",
	allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
	maxAge: 86400,
}));
app.get("/health", (c) => c.json({ code: 0, msg: "ok" }));
app.route("/api", prices);
app.route("/api", anomalies);
app.route("/api", agent);
app.route("/api", workorders);
app.route("/api", board);

export const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
export const fail = (msg: string) => ({ code: 1, msg });
export default { port: 8787, hostname: "0.0.0.0", fetch: app.fetch };
