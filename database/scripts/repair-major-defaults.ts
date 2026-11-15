import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { getPool, withTransaction } from "../client";
import { postgresCatalogAdminRepository } from "../repositories/postgres-catalog";
import { readMigration } from "./migration-source";
import type { Major } from "../../src/domain/types";

config({ path: ".env.local", quiet: true });
const migrationName = "20261114_legacy_major_defaults.sql";
const sql = readMigration(migrationName).replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "");
const rolledBack = new Error("Major persistence verification completed; roll back probes.");

async function main() {
  // Rehearse against the configured database through the real repository writers.
  // Both schema changes and probe records are always rolled back in this phase.
  try {
    await withTransaction(async (client) => {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(sql);
      await client.query(sql); // Must also be safe to run twice.
      const group = (await client.query<{ id: string }>("SELECT id FROM trovio.major_groups ORDER BY id LIMIT 1")).rows[0];
      assert.ok(group, "Cần ít nhất một nhóm ngành để kiểm tra lưu ngành.");
      const fixture = (): Major => {
        const id = randomUUID();
        return { id: `maj-${id}`, slug: `import-probe-${id}`, code: "", name: "Kiểm tra lưu ngành", groupId: group.id, riasec: [], summary: "", description: "", hidden: true, custom: true };
      };
      const single = fixture(), batch = [fixture(), fixture()];
      await postgresCatalogAdminRepository.saveMajor(single);
      await postgresCatalogAdminRepository.saveMajorsBatch(batch);
      const ids = [single.id, ...batch.map((major) => major.id)];
      const stored = (await client.query<{ row: Record<string, unknown> }>(
        "SELECT to_jsonb(m) AS row FROM trovio.majors m WHERE id = ANY($1::text[])", [ids],
      )).rows;
      assert.equal(stored.length, 3);
      for (const { row } of stored) {
        if ("demand" in row) assert.ok(row.demand != null);
        if ("growth" in row) assert.ok(row.growth != null);
      }
      // Updating an existing major must retain its stored legacy values.
      await postgresCatalogAdminRepository.saveMajor({ ...single, name: "Tên ngành đã cập nhật" });
      await postgresCatalogAdminRepository.saveMajorsBatch(batch.map((major) => ({ ...major, summary: "Đã cập nhật" })));
      const after = (await client.query<{ row: Record<string, unknown> }>(
        "SELECT to_jsonb(m) AS row FROM trovio.majors m WHERE id = ANY($1::text[])", [ids],
      )).rows;
      for (const { row } of after) {
        const before = stored.find((item) => item.row.id === row.id)!.row;
        assert.equal(row.demand, before.demand);
        assert.equal(row.growth, before.growth);
      }
      throw rolledBack;
    });
  } catch (error) {
    if (error !== rolledBack) throw error;
  }
  console.log("PASS: lưu mới/cập nhật đơn lẻ và hàng loạt; đã hoàn tác toàn bộ dữ liệu kiểm tra.");
  if (!process.argv.includes("--apply")) {
    console.log("Chưa áp dụng migration. Dùng --apply để bổ sung mặc định cho các cột cũ.");
    return;
  }
  // Apply only this additive repair, without running unrelated pending migrations.
  await withTransaction(async (client) => {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SELECT pg_advisory_xact_lock(70862020)");
    await client.query(sql);
    await client.query("CREATE TABLE IF NOT EXISTS trovio.schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    await client.query("INSERT INTO trovio.schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [migrationName]);
  });
  console.log(`Applied ${migrationName}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Không thể sửa mặc định bảng ngành.");
  process.exitCode = 1;
}).finally(async () => { await getPool().end(); });
