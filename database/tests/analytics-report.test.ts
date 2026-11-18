import assert from "node:assert/strict";
import test from "node:test";
import { dateRange } from "../../src/services/analytics.service";

test("statistics ranges include today and the requested number of Vietnam calendar days", () => {
  const to = "2026-11-18";
  assert.deepEqual(dateRange(1, to), { from: to, to });
  assert.deepEqual(dateRange(7, to), { from: "2026-11-12", to });
  assert.deepEqual(dateRange(30, to), { from: "2026-10-20", to });
  assert.deepEqual(dateRange(365, to), { from: "2025-11-19", to });
});
