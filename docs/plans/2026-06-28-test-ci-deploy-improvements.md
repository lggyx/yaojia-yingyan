# 药价鹰眼 — 基础设施与质量改进计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为药价鹰眼补齐测试、CI/CD 流水线和 Docker 部署能力，使项目达到生产就绪状态。

**Architecture:** 在现有 monorepo 结构上增量添加——测试复用 Bun 内置 test runner，CI 用 GitHub Actions，Docker 用于 Railway 部署。不改动现有业务代码。

**Tech Stack:** Bun (test runner), GitHub Actions, Docker multi-stage build

**Branch:** `improve/test-ci-deploy`

---

## 文件改动总览

```
docs/plans/2026-06-28-test-ci-deploy-improvements.md  ← 本计划文件
.github/workflows/ci.yml                               ← CI 流水线（新建）
Dockerfile                                              ← 生产镜像（新建）
apps/api/src/routes/anomalies.test.ts                  ← 异常路由测试（新建）
apps/api/src/routes/agent.test.ts                      ← AI Agent 路由测试（新建）
apps/api/src/rules/engine.test.ts                      ← 规则引擎测试（新建）
apps/api/src/rules/dimensions.test.ts                  ← 各维度检测函数测试（新建）
```

---

### Task 1: 规则引擎单元测试 — 维度检测

**Files:**
- Create: `apps/api/src/rules/dimensions.test.ts`

**Interfaces:**
- Consumes: `tenderDim`, `historyDim`, `regionalDim`, `volumeDim`, `alternativeDim` 函数签名（从 `apps/api/src/rules/dimensions.ts`）
- Produces: 5 组独立测试用例，覆盖命中/未命中/边界情况

- [ ] **Step 1: 写 `tenderDim` 测试**

```typescript
import { describe, expect, test } from "bun:test";
import { tenderDim, historyDim, regionalDim, volumeDim, alternativeDim } from "./dimensions";
import type { PriceRecord, PriceHistoryPoint, Thresholds } from "@shared/types";

const T: Thresholds = { tenderRatio: 1.3, historyMoM: 0.15, regionalDev: 0.15, volumeRate: 0.8 };
const baseRecord = (overrides: Partial<PriceRecord> = {}): PriceRecord => ({
  id: "R1", miCode: "M001", generic: "阿莫西林", brand: "品牌A", manufacturer: "厂A",
  spec: "0.25g", form: "片剂", category: "drug",
  price: 10, tenderPrice: 8, agreedVolume: 1000, actualVolume: 900,
  listingPrice: 12, hospital: "县医院", region: "安徽", date: "2026-06-01",
  ...overrides,
});

describe("tenderDim", () => {
  test("hits when price/tenderPrice exceeds threshold", () => {
    const r = baseRecord({ price: 12, tenderPrice: 8 }); // dev = 12/8 = 1.5 > 1.3
    const result = tenderDim(r, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
    expect(result!.deviation).toBeCloseTo(1.5, 3);
  });

  test("misses when price/tenderPrice is within threshold", () => {
    const r = baseRecord({ price: 10, tenderPrice: 8 }); // dev = 10/8 = 1.25 < 1.3
    const result = tenderDim(r, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(false);
  });

  test("returns null when no tenderPrice", () => {
    const r = baseRecord({ tenderPrice: null });
    expect(tenderDim(r, T)).toBeNull();
  });

  test("returns null when tenderPrice is 0", () => {
    const r = baseRecord({ tenderPrice: 0 });
    expect(tenderDim(r, T)).toBeNull();
  });
});
```

- [ ] **Step 2: Verify test fails then implement — same pattern for remaining dims**

Run: `cd apps/api && bun test src/rules/dimensions.test.ts`
Expected: 4 PASS

- [ ] **Step 3: 写 `historyDim` 测试**

```typescript
describe("historyDim", () => {
  const hist: PriceHistoryPoint[] = [
    { miCode: "M001", region: "安徽", date: "2026-01-01", price: 8 },
    { miCode: "M001", region: "安徽", date: "2026-02-01", price: 8 },
    { miCode: "M001", region: "安徽", date: "2026-03-01", price: 8 },
    { miCode: "M001", region: "安徽", date: "2026-04-01", price: 8 },
    { miCode: "M001", region: "安徽", date: "2026-05-01", price: 8 },
    { miCode: "M001", region: "安徽", date: "2026-06-01", price: 10 },
  ];

  test("hits when MoM exceeds threshold", () => {
    const r = baseRecord({ price: 10 });
    // avg of prev = 8, mom = (10-8)/8 = 0.25 > 0.15
    const result = historyDim(r, hist, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
  });

  test("misses when MoM is within threshold", () => {
    const flat: PriceHistoryPoint[] = [
      { miCode: "M001", region: "安徽", date: "2026-04-01", price: 9 },
      { miCode: "M001", region: "安徽", date: "2026-05-01", price: 9 },
      { miCode: "M001", region: "安徽", date: "2026-06-01", price: 10 },
    ];
    // avg of prev = 9, mom = (10-9)/9 = 0.11 < 0.15
    const r = baseRecord({ price: 10 });
    const result = historyDim(r, flat, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(false);
  });

  test("returns null when fewer than 3 history points", () => {
    const short: PriceHistoryPoint[] = [
      { miCode: "M001", region: "安徽", date: "2026-05-01", price: 8 },
      { miCode: "M001", region: "安徽", date: "2026-06-01", price: 10 },
    ];
    const r = baseRecord({ price: 10 });
    expect(historyDim(r, short, T)).toBeNull();
  });
});
```

- [ ] **Step 4: 写 `regionalDim` 测试**

```typescript
describe("regionalDim", () => {
  const peers: PriceRecord[] = [
    baseRecord({ id: "R2", region: "江苏", price: 8 }),
    baseRecord({ id: "R3", region: "浙江", price: 7 }),
    baseRecord({ id: "R4", region: "上海", price: 9 }),
  ];

  test("hits when price significantly above regional avg", () => {
    const r = baseRecord({ price: 12 }); // avg of peers = 8, dev = (12-8)/8 = 0.5 > 0.15
    const result = regionalDim(r, [...peers, r], T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
  });

  test("misses when price close to regional avg", () => {
    const r = baseRecord({ price: 8.5 }); // dev = (8.5-8)/8 = 0.0625 < 0.15
    const result = regionalDim(r, [...peers, r], T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(false);
  });

  test("returns null when no peers in other regions", () => {
    const r = baseRecord({ region: "安徽" });
    expect(regionalDim(r, [r], T)).toBeNull();
  });
});
```

- [ ] **Step 5: 写 `volumeDim` 测试**

```typescript
describe("volumeDim", () => {
  test("hits when volume rate below threshold", () => {
    const r = baseRecord({ agreedVolume: 1000, actualVolume: 500 }); // rate = 0.5 < 0.8
    const result = volumeDim(r, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
  });

  test("misses when volume rate above threshold", () => {
    const r = baseRecord({ agreedVolume: 1000, actualVolume: 900 }); // rate = 0.9 >= 0.8
    const result = volumeDim(r, T);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(false);
  });

  test("returns null when no agreedVolume or tenderPrice", () => {
    const noAgreed = baseRecord({ agreedVolume: null });
    expect(volumeDim(noAgreed, T)).toBeNull();
    const noTender = baseRecord({ tenderPrice: null });
    expect(volumeDim(noTender, T)).toBeNull();
  });
});
```

- [ ] **Step 6: 写 `alternativeDim` 测试**

```typescript
describe("alternativeDim", () => {
  const r = baseRecord({ tenderPrice: 8, price: 8, actualVolume: 100 });
  const alt = baseRecord({ id: "R-ALT", brand: "高价替代品牌", tenderPrice: null, price: 20, actualVolume: 500 });

  test("hits when higher-price alternative has more volume", () => {
    const result = alternativeDim(r, [r, alt, baseRecord({ id: "R3" })]);
    expect(result).not.toBeNull();
    expect(result!.hit).toBe(true);
    expect(result!.detail).toContain("高价替代药");
  });

  test("returns null when no alternative found", () => {
    const result = alternativeDim(r, [r]);
    expect(result).toBeNull();
  });

  test("returns null when record has no tenderPrice", () => {
    const noTender = baseRecord({ tenderPrice: null });
    expect(alternativeDim(noTender, [noTender])).toBeNull();
  });
});
```

- [ ] **Step 7: 运行全部维度测试并提交**

```bash
cd apps/api && bun test src/rules/dimensions.test.ts
# Expected: all PASS

git add apps/api/src/rules/dimensions.test.ts
git commit -m "test: add dimension detection unit tests"
```

---

### Task 2: 规则引擎集成测试 — 聚合检测

**Files:**
- Create: `apps/api/src/rules/engine.test.ts`

**Interfaces:**
- Consumes: `detectOne`, `detectAll`, `aggregateRisk` 函数签名
- Produces: 全流程集成测试，验证多维共振加成和风险等级输出

- [ ] **Step 1: 写 `aggregateRisk` 测试**

```typescript
import { describe, expect, test } from "bun:test";
import { aggregateRisk, detectOne, detectAll } from "./engine";
import type { DimensionResult } from "@shared/types";

const makeDim = (type: string, hit: boolean): DimensionResult => ({
  type: type as any, base: 10, actual: 15, deviation: 0.5, hit,
  detail: `test-${type}`,
});

describe("aggregateRisk", () => {
  test("returns low for no hits", () => {
    const r = aggregateRisk([makeDim("tender", false)]);
    expect(r).toEqual({ score: 0, level: "low" });
  });

  test("single tender hit", () => {
    const r = aggregateRisk([makeDim("tender", true)]);
    expect(r.score).toBeGreaterThan(0);
    expect(r.level).toBe("high"); // tender has DIM_SCORE=50
  });

  test("two hits get resonance bonus +10", () => {
    const r = aggregateRisk([
      makeDim("tender", true),
      makeDim("history", true),
    ]);
    expect(r.score).toBe(50 + 25 + 10); // tender(50) + history(25) + resonance(10)
  });

  test("score capped at 100", () => {
    const many = Array.from({ length: 5 }, (_, i) => makeDim(`dim${i}`, true));
    const r = aggregateRisk(many);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: 写 `detectOne` 集成测试**

```typescript
describe("detectOne", () => {
  test("returns anomaly when dimensions hit", () => {
    const r = {
      id: "R1", miCode: "M001", generic: "阿莫西林", brand: "A", manufacturer: "厂A",
      spec: "0.25g", form: "片剂", category: "drug" as const,
      price: 20, tenderPrice: 8, agreedVolume: 1000, actualVolume: 1000,
      listingPrice: null, hospital: "县医院", region: "安徽", date: "2026-06-01",
    };
    const ctx = { history: [], all: [r] };
    const t = { tenderRatio: 1.3, historyMoM: 0.15, regionalDev: 0.15, volumeRate: 0.8 };
    const result = detectOne(r, ctx, t);
    expect(result).not.toBeNull();
    expect(result!.recordId).toBe("R1");
    expect(result!.dimensions.some(d => d.hit)).toBe(true);
  });

  test("returns null when no dimension hits", () => {
    const r = {
      id: "R2", miCode: "M002", generic: "维生素C", brand: "B", manufacturer: "厂B",
      spec: "100mg", form: "片剂", category: "drug" as const,
      price: 5, tenderPrice: 5, agreedVolume: 1000, actualVolume: 1000,
      listingPrice: null, hospital: "县医院", region: "安徽", date: "2026-06-01",
    };
    const ctx = { history: [], all: [r] };
    const t = { tenderRatio: 1.3, historyMoM: 0.15, regionalDev: 0.15, volumeRate: 0.8 };
    expect(detectOne(r, ctx, t)).toBeNull();
  });
});
```

- [ ] **Step 3: 运行全部引擎测试并提交**

```bash
cd apps/api && bun test src/rules/engine.test.ts
# Expected: all PASS

git add apps/api/src/rules/engine.test.ts
git commit -m "test: add risk aggregation and detectOne tests"
```

---

### Task 3: 异常 API 路由测试

**Files:**
- Create: `apps/api/src/routes/anomalies.test.ts`
- Pattern: 复用 `workorders.test.ts` 的 `setupApp()` 模式

**Interfaces:**
- Consumes: 异常路由 (`apps/api/src/routes/anomalies.ts`) 的 `GET /api/anomalies`, `GET /api/anomalies/:id`, `PATCH /api/anomalies/:id`
- Produces: 覆盖 CRUD、状态变更、404 场景

- [ ] **Step 1: 写测试文件**

```typescript
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { rmSync } from "node:fs";
import anomalies from "./anomalies";
import { getDb } from "../db/client";
import { seedDb } from "../db/seed";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceHistoryPoint, PriceRecord } from "@shared/types";

const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

function setupApp() {
  process.env.DB_PATH = `data/anomalies-${crypto.randomUUID()}.test.sqlite`;
  rmSync(process.env.DB_PATH, { force: true });
  const db = getDb();
  seedDb(db);
  const records = db.query(SEL).all() as PriceRecord[];
  const history = db.query("SELECT mi_code miCode,region,date,price FROM price_history").all() as PriceHistoryPoint[];
  for (const a of detectAll(records, history, DEFAULT_THRESHOLDS)) {
    db.prepare(`INSERT INTO anomalies
      (id,record_id,dimensions,risk_score,risk_level,confidence,status,created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(a.id, a.recordId, JSON.stringify(a.dimensions), a.riskScore, a.riskLevel, a.confidence, a.status, a.createdAt);
  }
  const app = new Hono();
  app.route("/api", anomalies);
  return { app, db };
}

describe("anomalies routes", () => {
  test("GET /api/anomalies returns list", async () => {
    const { app } = setupApp();
    const res = await app.request("/api/anomalies");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  test("GET /api/anomalies?status=pending filters by status", async () => {
    const { app } = setupApp();
    const res = await app.request("/api/anomalies?status=pending");
    const json = await res.json();
    expect(json.data.every((a: any) => a.status === "pending")).toBe(true);
  });

  test("GET /api/anomalies/:id returns detail", async () => {
    const { app } = setupApp();
    const list = await app.request("/api/anomalies");
    const { data } = await list.json();
    const id = data[0].id;
    const res = await app.request(`/api/anomalies/${id}`);
    const json = await res.json();
    expect(json.code).toBe(0);
    expect(json.data.id).toBe(id);
    expect(json.data.record).toBeDefined();
  });

  test("GET /api/anomalies/:id returns 404 for missing", async () => {
    const { app } = setupApp();
    const res = await app.request("/api/anomalies/nonexistent");
    expect(res.status).toBe(404);
  });

  test("PATCH /api/anomalies/:id updates status", async () => {
    const { app, db } = setupApp();
    const list = await app.request("/api/anomalies");
    const { data } = await list.json();
    const id = data[0].id;
    const res = await app.request(`/api/anomalies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed", note: "人工消解" }),
    });
    expect(res.status).toBe(200);
    const after = db.query("SELECT status FROM anomalies WHERE id=?").get(id) as any;
    expect(after.status).toBe("dismissed");
  });
});
```

- [ ] **Step 2: 运行并提交**

```bash
cd apps/api && bun test src/routes/anomalies.test.ts
# Expected: all PASS

git add apps/api/src/routes/anomalies.test.ts
git commit -m "test: add anomaly route CRUD tests"
```

---

### Task 4: AI Agent 路由测试

**Files:**
- Create: `apps/api/src/routes/agent.test.ts`

**Interfaces:**
- Consumes: Agent 路由中的 `GET /api/agent/status`, `POST /api/agent/investigate/:id`, `POST /api/agent/challenge/:id`, `POST /api/agent/report/:id`
- Produces: Mock 模式下的 AI 功能测试，验证返回结构正确

- [ ] **Step 1: 写测试文件**

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { Hono } from "hono";
import { rmSync } from "node:fs";
import agent from "./agent";
import { getDb } from "../db/client";
import { seedDb } from "../db/seed";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceHistoryPoint, PriceRecord } from "@shared/types";

function setupApp() {
  process.env.MOCK_LLM = "1"; // 强制 mock 模式，不依赖远程 API
  process.env.LLM_BASE_URL = "";
  process.env.DB_PATH = `data/agent-${crypto.randomUUID()}.test.sqlite`;
  rmSync(process.env.DB_PATH, { force: true });
  const db = getDb();
  seedDb(db);
  const records = db.query(`
    SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
      tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
      listing_price listingPrice,hospital,region,date FROM price_records
  `).all() as PriceRecord[];
  const history = db.query("SELECT mi_code miCode,region,date,price FROM price_history").all() as PriceHistoryPoint[];
  for (const a of detectAll(records, history, DEFAULT_THRESHOLDS)) {
    db.prepare(`INSERT OR IGNORE INTO anomalies
      (id,record_id,dimensions,risk_score,risk_level,confidence,status,created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(a.id, a.recordId, JSON.stringify(a.dimensions), a.riskScore, a.riskLevel, a.confidence, a.status, a.createdAt);
  }
  const app = new Hono();
  app.route("/api", agent);
  return { app, db };
}

describe("agent routes (mock mode)", () => {
  test("GET /api/agent/status returns mock mode", async () => {
    const { app } = setupApp();
    const res = await app.request("/api/agent/status");
    const json = await res.json();
    expect(json.data.mode).toBe("mock");
    expect(json.data.model).toBeDefined();
  });

  test("POST /api/agent/investigate/:id returns structured result", async () => {
    const { app, db } = setupApp();
    const anomaly = db.query("SELECT id FROM anomalies LIMIT 1").get() as any;
    const res = await app.request(`/api/agent/investigate/${anomaly.id}`, { method: "POST" });
    const json = await res.json();
    expect(json.code).toBe(0);
    expect(json.data.explanation).toBeDefined();
    expect(json.data.usedMock).toBe(true);
    expect(json.data.trace.length).toBeGreaterThanOrEqual(0);
    expect(json.data.suggestedDisposition).toBeDefined();
  });

  test("POST /api/agent/challenge/:id returns structured result", async () => {
    const { app, db } = setupApp();
    const anomaly = db.query("SELECT id FROM anomalies LIMIT 1").get() as any;
    const res = await app.request(`/api/agent/challenge/${anomaly.id}`, { method: "POST" });
    const json = await res.json();
    expect(json.code).toBe(0);
    expect(json.data.rebuttals.length).toBe(4);
    expect(typeof json.data.confidence).toBe("number");
    expect(["confirmed", "review", "dismissed"]).toContain(json.data.verdict);
  });

  test("POST /api/agent/report/:id returns combined report", async () => {
    const { app, db } = setupApp();
    const anomaly = db.query("SELECT id FROM anomalies LIMIT 1").get() as any;
    const res = await app.request(`/api/agent/report/${anomaly.id}`, { method: "POST" });
    const json = await res.json();
    expect(json.code).toBe(0);
    expect(json.data.investigation).toBeDefined();
    expect(json.data.challenge).toBeDefined();
    expect(json.data.conclusion).toBeDefined();
    expect(json.data.reasoningSteps.length).toBeGreaterThan(0);
  });

  test("POST /api/agent/investigate/:id returns 404 for missing anomaly", async () => {
    const { app } = setupApp();
    const res = await app.request("/api/agent/investigate/nonexistent", { method: "POST" });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行并提交**

```bash
cd apps/api && bun test src/routes/agent.test.ts
# Expected: all PASS

git add apps/api/src/routes/agent.test.ts
git commit -m "test: add agent route tests (mock mode)"
```

---

### Task 5: 运行所有测试 + CI 配置文件

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 确认所有已有测试和新测试全部通过**

```bash
cd apps/api && bun test
# Expected: all tests PASS (workorders + anomalies + agent + engine + dimensions)
```

- [ ] **Step 2: 创建 CI 配置文件**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master, "improve/**"]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - run: bun run --cwd apps/api test
        env:
          MOCK_LLM: "1"

      - run: bun run --cwd apps/web build
```

- [ ] **Step 3: 提交 CI 配置**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow with test + build"
```

---

### Task 6: Docker 多阶段构建

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: 创建 Dockerfile**

```dockerfile
# Dockerfile — 多阶段构建
# 构建阶段
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run --cwd apps/web build

# 运行阶段
FROM oven/bun:1 AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
ENV NODE_ENV=production
EXPOSE 8787
CMD ["bun", "run", "--cwd", "apps/api", "src/index.ts"]
```

- [ ] **Step 2: 本地验证 Docker 构建**

```bash
docker build -t yaojia-yingyan .
docker run -p 8787:8787 -e MOCK_LLM=1 -e DB_PATH=/data/yaojia.sqlite yaojia-yingyan
```

Expected: 容器启动，`http://localhost:8787/health` 返回 `{"code":0,"msg":"ok"}`

- [ ] **Step 3: 提交 Dockerfile**

```bash
git add Dockerfile
git commit -m "deploy: add multi-stage Dockerfile for production"
```

---

### Task 7: 推送到远程分支 + 创建 PR

- [ ] **Step 1: 推送到远程**

```bash
git push origin improve/test-ci-deploy
```

- [ ] **Step 2: 创建 Pull Request**

在 GitHub 上为 `improve/test-ci-deploy → master` 创建 PR，标题 "质量基建：测试 + CI + Docker"

---