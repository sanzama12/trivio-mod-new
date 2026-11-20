import assert from "node:assert/strict";
import test from "node:test";
import { readJson, BodyTooLargeError } from "../../src/lib/http";
import { rateLimit, getRateLimitStore, setRateLimitStore, MemoryRateLimitStore } from "../../src/lib/rate-limit";
import { databaseConnection } from "../tls";
import { sessionSecret } from "../../src/services/session.service";
import { sendWusRouterChat, withAiBudget } from "../../src/services/wusrouter-llm";
import ExcelJS from "exceljs";

test("Excel round-trip remains compatible with patched transitive dependencies", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Verification").addRow(["Tuition", 123456]);
  const bytes = await workbook.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(bytes);
  assert.equal(restored.worksheets[0].getCell("B1").value, 123456);
});

test("JSON reader cancels oversized streams before buffering the rest", async () => {
  let sent = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      sent++;
      controller.enqueue(new TextEncoder().encode("x".repeat(32)));
      if (sent === 100) controller.close();
    },
    cancel() { cancelled = true; },
  });
  const request = new Request("http://localhost/test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readJson(request, 10), BodyTooLargeError);
  assert.equal(cancelled, true);
  assert.ok(sent < 100);
  assert.deepEqual(await readJson(new Request("http://localhost/test", { method: "POST", body: JSON.stringify({ text: "Việt" }) }), 100), { text: "Việt" });
});

test("rateLimit awaits asynchronous adapters and keeps retry-after numeric", async () => {
  const previous = getRateLimitStore();
  try {
    setRateLimitStore({ async hit() { return 42; } });
    assert.equal(await rateLimit("test", 1, 60), 42);
    setRateLimitStore(new MemoryRateLimitStore());
    assert.equal(await rateLimit("test", 1, 60, 1000), 0);
    assert.equal(await rateLimit("test", 1, 60, 1001), 60);
    assert.equal(await rateLimit("test", 1, 60, 61_001), 0);
  } finally { setRateLimitStore(previous); }
});

test("remote database TLS verifies certificates even when URL requests require mode", () => {
  const options = databaseConnection("postgres://user:password@db.example.test/db?sslmode=require");
  assert.equal(options.ssl?.rejectUnauthorized, true);
  assert.equal(new URL(options.connectionString).searchParams.has("sslmode"), false);
  assert.throws(() => databaseConnection("postgres://user:password@db.example.test/db?sslmode=disable", true));
  assert.equal(databaseConnection("postgres://user:password@localhost/db", true).ssl, undefined);
});

test("production rejects missing or short signing keys consistently", () => {
  const env = { node: process.env.NODE_ENV, secret: process.env.SESSION_SECRET };
  try {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "too-short";
    assert.throws(sessionSecret, /32/);
    process.env.SESSION_SECRET = "x".repeat(32);
    assert.equal(sessionSecret(), "x".repeat(32));
  } finally {
    if (env.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env.node;
    if (env.secret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = env.secret;
  }
});

test("exhausted AI budget does not start another provider request", async () => {
  const previous = process.env.WUSROUTER_API_KEY;
  process.env.WUSROUTER_API_KEY = "test-key";
  let requests = 0;
  try {
    const result = await withAiBudget(() => sendWusRouterChat([], {}, async () => { requests++; return Response.json({}); }), 0);
    assert.equal(result, null);
    assert.equal(requests, 0);
  } finally {
    if (previous === undefined) delete process.env.WUSROUTER_API_KEY; else process.env.WUSROUTER_API_KEY = previous;
  }
});
