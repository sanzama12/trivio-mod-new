/** Database-backed staging and SQL restore checks. All writes roll back. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { stagingPool, saveStagingEntry, closeStaging } from "../database/staging";
import { snapshotSql, parseSnapshotSql } from "../database/snapshot";

async function main() {
  const client = await stagingPool().connect();
  const key = randomUUID();
  const table = `storage_verification_${key.replaceAll("-", "")}`;
  try {
    await client.query("BEGIN");
    assert.equal(await saveStagingEntry("storage-verification", key, { test: "Database only" }, { client }), true);
    assert.equal(await saveStagingEntry("storage-verification", key, { test: "Must not overwrite" }, { client, onlyMissing: true }), false);
    const staged = await client.query("SELECT payload FROM trovio.app_documents WHERE collection='etl-staging' AND id=$1", [`storage-verification:${key}`]);
    assert.deepEqual(staged.rows[0].payload.value, { test: "Database only" });
    await client.query(`CREATE TABLE trovio."${table}" (id int GENERATED ALWAYS AS IDENTITY, name text, details jsonb, calculated int GENERATED ALWAYS AS (id+1) STORED)`);
    await client.query(`INSERT INTO trovio."${table}" (name,details) VALUES ($1,$2::jsonb)`, ["Đại học O'Brien", JSON.stringify({ values: [1, "A"] })]);
    const original = (await client.query(`SELECT * FROM trovio."${table}"`)).rows;
    const snapshot = { format: 1, createdAt: new Date().toISOString(), applied: [], tables: { [table]: original } };
    const sql = snapshotSql(snapshot, { [table]: ["id", "name", "details"] });
    assert.deepEqual(parseSnapshotSql(sql), snapshot);
    await client.query(`DELETE FROM trovio."${table}"`);
    await client.query(sql.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
    assert.deepEqual((await client.query(`SELECT * FROM trovio."${table}"`)).rows, original);
    console.log("PASS: PostgreSQL staging, no-overwrite import, SQL snapshot restore including identity/generated columns. All test writes rolled back.");
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await closeStaging();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
