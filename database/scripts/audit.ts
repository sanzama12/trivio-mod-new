import { config } from "dotenv";
import { Client } from "pg";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: ".env.local", quiet: true });
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
async function main() {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  try {
    const checks: Record<string, string> = {
      tables: `SELECT relname AS name, n_live_tup AS estimated_rows FROM pg_stat_user_tables WHERE schemaname='trovio' ORDER BY relname`,
      migrations: `SELECT name FROM trovio.schema_migrations ORDER BY name`,
      constraints: `SELECT c.conrelid::regclass::text AS table_name, c.conname AS name, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='trovio' AND c.conrelid IN ('trovio.schools'::regclass,'trovio.majors'::regclass,'trovio.programs'::regclass,'trovio.app_documents'::regclass) ORDER BY 1,2`,
      indexes: `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='trovio' AND tablename IN ('schools','majors','programs','app_documents','users') ORDER BY 1,2`,
      catalogCounts: `SELECT (SELECT count(*) FROM trovio.schools) AS schools, (SELECT count(*) FROM trovio.majors) AS majors, (SELECT count(*) FROM trovio.programs) AS programs, (SELECT count(*) FROM trovio.program_cutoffs) AS cutoffs`,
      documents: `SELECT collection, count(*) AS count, count(*) FILTER (WHERE payload ? 'id' AND payload->>'id' <> id) AS mismatched_ids FROM trovio.app_documents GROUP BY collection ORDER BY collection`,
      duplicateSchoolCodes: `SELECT upper(btrim(code)) AS code, array_agg(id ORDER BY id) AS ids FROM trovio.schools GROUP BY 1 HAVING count(*)>1`,
      duplicateMajorCodes: `SELECT upper(btrim(code)) AS code, array_agg(id ORDER BY id) AS ids FROM trovio.majors WHERE code IS NOT NULL GROUP BY 1 HAVING count(*)>1`,
      nonstandardMajorCodes: `SELECT count(*) AS count FROM trovio.majors WHERE code !~ '^[0-9]{7}$' OR code LIKE '799%'`,
      duplicateProgramCodes: `SELECT school_id, upper(btrim(admission_code)) AS code, array_agg(id ORDER BY id) AS ids FROM trovio.programs GROUP BY 1,2 HAVING count(*)>1`,
      duplicateProgramNames: `SELECT school_id, lower(btrim(name)) AS name, array_agg(id ORDER BY id) AS ids FROM trovio.programs GROUP BY 1,2 HAVING count(*)>1`,
      orphanPatches: `SELECT count(*) AS count FROM trovio.app_documents d LEFT JOIN trovio.programs p ON p.id=d.id WHERE d.collection='program-patch' AND p.id IS NULL`,
      patchKeys: `SELECT key, count(*) FROM trovio.app_documents d, LATERAL jsonb_object_keys(d.payload) key WHERE d.collection='program-patch' GROUP BY key ORDER BY key`,
      orphanOwnedDocuments: `SELECT d.collection, count(*) AS count FROM trovio.app_documents d LEFT JOIN trovio.users u ON u.id=d.owner_id WHERE d.owner_id IS NOT NULL AND u.id IS NULL GROUP BY d.collection`,
      programExamples: `SELECT id, school_id, major_id, admission_code, name, campus, training_type FROM trovio.programs ORDER BY id LIMIT 15`,
      majorExamples: `SELECT id, code, name FROM trovio.majors WHERE code LIKE '799%' OR code !~ '^[0-9]{7}$' ORDER BY code LIMIT 20`,
    };
    const report: Record<string, unknown> = { checkedAt: new Date().toISOString() };
    for (const [name, sql] of Object.entries(checks)) report[name] = (await client.query(sql)).rows;
    const output = resolve("database/audit-report.json");
    writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ checkedAt: report.checkedAt, counts: report.catalogCounts,
      duplicateSchoolCodes: (report.duplicateSchoolCodes as unknown[]).length,
      duplicateMajorCodes: (report.duplicateMajorCodes as unknown[]).length,
      duplicateProgramCodes: (report.duplicateProgramCodes as unknown[]).length,
      nonstandardMajorCodes: report.nonstandardMajorCodes, orphanPatches: report.orphanPatches, report: output }, null, 2));
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
