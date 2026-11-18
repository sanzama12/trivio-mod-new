import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { invalidateDiscoveryStats, postgresReferenceCatalogRepository as catalog } from "../repositories/postgres-catalog";

test("reference filters share one database read and refresh after an admin edit", async () => {
  const previous = global.__pgPool;
  let calls = 0;
  global.__pgPool = { query: async () => {
    calls++;
    return { rows: [{ subjects: [{ id: "math", name: `Math ${calls}`, short: "M" }], combos: [{ code: "A00", subjects: ["math", "physics", "chemistry"] }] }] };
  } } as unknown as Pool;
  invalidateDiscoveryStats();
  try {
    const [subjects, combos] = await Promise.all([catalog.findSubjects(), catalog.findCombos()]);
    assert.equal(calls, 1);
    assert.equal(subjects[0].name, "Math 1");
    assert.equal(combos[0].code, "A00");
    await catalog.findSubjects();
    assert.equal(calls, 1);
    invalidateDiscoveryStats();
    assert.equal((await catalog.findSubjects())[0].name, "Math 2");
  } finally {
    global.__pgPool = previous;
    invalidateDiscoveryStats();
  }
});

test("failed reference reads are retried instead of caching empty filters", async () => {
  const previous = global.__pgPool;
  let calls = 0;
  global.__pgPool = { query: async () => {
    if (++calls === 1) throw new Error("connection unavailable");
    return { rows: [{ subjects: [], combos: [] }] };
  } } as unknown as Pool;
  invalidateDiscoveryStats();
  try {
    await assert.rejects(catalog.findSubjects(), /connection unavailable/);
    assert.deepEqual(await catalog.findSubjects(), []);
    assert.equal(calls, 2);
  } finally {
    global.__pgPool = previous;
    invalidateDiscoveryStats();
  }
});
