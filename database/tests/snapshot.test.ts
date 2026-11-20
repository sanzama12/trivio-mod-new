import assert from "node:assert/strict";
import test from "node:test";
import { snapshotSql, parseSnapshotSql, type DatabaseSnapshot } from "../snapshot";

test("SQL snapshots preserve metadata, Unicode, quotes and nested values", () => {
  const snapshot: DatabaseSnapshot = {
    format: 1, createdAt: "2026-11-20T00:00:00.000Z", applied: ["migration-one.sql"],
    tables: { schools: [{ id: "test", name: "Đại học O'Brien", details: { text: "line\nnext", tags: ["A", "B"] } }] },
  };
  const sql = snapshotSql(snapshot, { schools: ["id", "name", "details"] });
  assert.ok(sql.includes("O''Brien"));
  assert.ok(sql.includes("OVERRIDING SYSTEM VALUE"));
  assert.deepEqual(parseSnapshotSql(sql), snapshot);
});

test("SQL snapshots omit generated columns from inserts and reject missing column metadata", () => {
  const snapshot: DatabaseSnapshot = { format: 1, createdAt: "now", applied: [], tables: { sample: [{ id: 1, computed: 2 }] } };
  const sql = snapshotSql(snapshot, { sample: ["id"] });
  assert.ok(sql.includes('("id") OVERRIDING SYSTEM VALUE SELECT "id"'));
  assert.throws(() => snapshotSql(snapshot, {}), /column metadata/);
  assert.throws(() => parseSnapshotSql("SELECT 1"), /Not a Trovio/);
});
