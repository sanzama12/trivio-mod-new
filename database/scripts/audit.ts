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
      invalidConstraints: `SELECT c.conrelid::regclass::text AS table_name, c.conname AS name FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='trovio' AND NOT c.convalidated ORDER BY 1,2`,
      invalidIndexes: `SELECT c.oid::regclass::text AS name FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='trovio' AND (NOT i.indisvalid OR NOT i.indisready) ORDER BY 1`,
      foreignKeysWithoutLeadingIndex: `WITH fk AS (
        SELECT c.conrelid, c.conname, c.conkey
        FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
        WHERE n.nspname='trovio' AND c.contype='f'
      )
      SELECT conrelid::regclass::text AS table_name, conname AS name
      FROM fk
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid=fk.conrelid AND i.indisvalid
          AND (i.indkey::smallint[])[0:cardinality(fk.conkey)-1]=fk.conkey
      ) ORDER BY 1,2`,
      orphanProgramYearActors: `SELECT count(*) AS count FROM trovio.program_year_data y LEFT JOIN trovio.users u ON u.id=y.updated_by WHERE y.updated_by IS NOT NULL AND u.id IS NULL`,
      orphanAiSourceActors: `SELECT count(*) AS count FROM trovio.ai_sources a LEFT JOIN trovio.users u ON u.id=a.created_by WHERE a.created_by IS NOT NULL AND u.id IS NULL`,
      programExamples: `SELECT id, school_id, major_id, admission_code, name, campus, training_type FROM trovio.programs ORDER BY id LIMIT 15`,
      majorExamples: `SELECT id, code, name FROM trovio.majors WHERE code LIKE '799%' OR code !~ '^[0-9]{7}$' ORDER BY code LIMIT 20`,
    };
    const report: Record<string, unknown> = { checkedAt: new Date().toISOString() };
    for (const [name, sql] of Object.entries(checks)) report[name] = (await client.query(sql)).rows;
    const outputFlag = process.argv.indexOf("--output");
    const output = outputFlag >= 0 ? resolve(process.argv[outputFlag + 1] || "database/audit-report.json") : undefined;
    if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    const summary = { checkedAt: report.checkedAt, counts: report.catalogCounts,
      duplicateSchoolCodes: (report.duplicateSchoolCodes as unknown[]).length,
      duplicateMajorCodes: (report.duplicateMajorCodes as unknown[]).length,
      duplicateProgramCodes: (report.duplicateProgramCodes as unknown[]).length,
      nonstandardMajorCodes: Number((report.nonstandardMajorCodes as { count: string }[])[0]?.count ?? 0),
      orphanPatches: Number((report.orphanPatches as { count: string }[])[0]?.count ?? 0),
      invalidConstraints: (report.invalidConstraints as unknown[]).length,
      invalidIndexes: (report.invalidIndexes as unknown[]).length,
      foreignKeysWithoutLeadingIndex: (report.foreignKeysWithoutLeadingIndex as unknown[]).length,
      orphanProgramYearActors: Number((report.orphanProgramYearActors as { count: string }[])[0]?.count ?? 0),
      orphanAiSourceActors: Number((report.orphanAiSourceActors as { count: string }[])[0]?.count ?? 0),
      ...(output ? { report: output } : {}),
    };
    console.log(JSON.stringify(summary, null, 2));
    if (Object.entries(summary).some(([key, value]) => !["checkedAt", "counts", "report"].includes(key) && Number(value) > 0)) {
      throw new Error("Database integrity audit failed; review the non-zero checks above.");
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
