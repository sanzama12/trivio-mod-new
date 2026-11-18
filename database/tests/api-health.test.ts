import assert from "node:assert/strict";
import { test } from "node:test";
import { V1CatalogController } from "../../src/controllers/v1/catalog.controller";
import { systemService } from "../../src/services/system.service";

test("readiness returns 503 when the database ping fails", async (t) => {
  t.mock.method(systemService, "checkDatabase", async () => ({
    ok: false, latencyMs: -1, pool: { total: 0, idle: 0, waiting: 0 },
  }));
  const response = await V1CatalogController.health();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "DATABASE_UNAVAILABLE");
});

test("readiness returns 200 when the database responds", async (t) => {
  t.mock.method(systemService, "checkDatabase", async () => ({
    ok: true, latencyMs: 12, pool: { total: 1, idle: 1, waiting: 0 },
  }));
  const response = await V1CatalogController.health();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, {
    status: "ready", database: "ready", latencyMs: 12, pool: { total: 1, idle: 1, waiting: 0 },
  });
});
