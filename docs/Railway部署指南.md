# 药价鹰眼 Railway 部署指南

## 方案概述

前后端合并部署到一个 Railway 服务上，API 同时托管前端静态文件。

| 组件 | 部署方式 |
|---|---|
| 整个应用 | **Railway**（一个服务搞定） |

无额外后端，无 Netlify，一个 `railway.app` 域名即可使用。

---

## 部署步骤

### 1. 推送到 GitHub

Railway 从 GitHub 仓库拉代码部署，确保代码已推送。

### 2. 在 Railway 创建项目

1. 打开 [railway.app](https://railway.app)，登录
2. 点击 **New Project** → **Deploy from GitHub**
3. 选择你的仓库
4. Railway 会自动检测 `package.json`，不需要手动配置

### 3. 添加 Volume（持久化 SQLite 数据库）

Railway 免费套餐每次重启会丢失文件，所以需要挂载 Volume：

1. 在项目页面点击 **+ Add** → **Volume**
2. 挂载路径设为 `/data`
3. 选择大小（1GB 足够）

### 4. 设置环境变量

在项目设置 → Variables 中添加：

```
MOCK_LLM=1
DB_PATH=/data/yaojia.sqlite
```

如果有真实 LLM API，额外添加：

```
LLM_BASE_URL=https://your-llm-api.com
LLM_API_KEY=your-key
LLM_MODEL=deepseek-chat
```

### 5. 设置启动命令

在项目设置 → Settings 中，将 **Start Command** 设为：

```
bun install && bun run build:web && bun run --cwd apps/api src/index.ts
```

这条命令会：
1. 安装所有依赖
2. 构建前端静态文件
3. 启动 API 服务器（同时托管前端）

### 6. 部署

点击 **Deploy**，等待构建完成。Railway 会自动分配一个域名，如 `https://yaojia-yingyan.up.railway.app`。

---

## 最终效果

- 访问 `https://你的项目名.up.railway.app` 打开前端页面
- 所有 `fetch('/api/...')` 请求自动到同域名的 API，无需 CORS 配置
- SQLite 数据持久化在 `/data` 挂载的 Volume 中，重启不丢失

---

## 原理说明

`apps/api/src/index.ts` 做了两件事：

1. `/api/*` 路由 → Hono API 处理
2. `/*` 路由 → `serveStatic` 托管 `apps/web/dist` 前端静态文件

```typescript
// 生产环境托管前端静态文件
const staticDir = "../web/dist";
app.get("/*", serveStatic({ root: staticDir }));
app.get("/*", serveStatic({ root: staticDir, path: "index.html" }));
```

这样前端构建产物（`apps/web/dist`）被打包到 API 服务中，一个端口同时提供 API 和前端页面。

---

## 本地预览生产模式

```powershell
# 构建前端
bun run build:web

# 启动 API（会同时托管前端）
bun run --cwd apps/api src/index.ts

# 打开 http://localhost:8787
```

---

## 更新部署

代码 push 到 GitHub 后，Railway 会自动重新部署。如果没有自动触发，手动点击 **Deploy**。