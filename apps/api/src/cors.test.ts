import { expect, test } from "bun:test";
import server from "./index";

test("api allows cross-origin preflight requests", async () => {
  const res = await server.fetch(new Request("http://localhost/api/agent/investigate/A-S1", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, authorization",
    },
  }));

  expect(res.status).toBe(204);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  expect(res.headers.get("Access-Control-Allow-Methods")?.split(",").map(method => method.trim()))
    .toContain("OPTIONS");
  expect(res.headers.get("Access-Control-Allow-Headers")?.toLowerCase()).toContain("authorization");
  expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
});