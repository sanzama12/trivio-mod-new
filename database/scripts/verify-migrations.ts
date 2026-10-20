/** Rehearse against an isolated schema copied from the catalog. Always ROLLBACK. */
import { config } from "dotenv";
import { Client } from "pg";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

config({ path: ".env.local", quiet: true });
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const schema = `trovio_verify_${Date.now()}`;
const backupName = existsSync('database/backups') ? readdirSync('database/backups')
  .filter(n=>n.startsWith('before-migration-') && n.endsWith('.json')).sort().reverse()
  .find(n=>!JSON.parse(readFileSync(`database/backups/${n}`,'utf8')).applied?.includes('20261020_identity_integrity.sql')) : undefined;
const backup = backupName ? JSON.parse(readFileSync(`database/backups/${backupName}`,'utf8')).tables as Record<string, unknown[]> : undefined;
const sqlFile = (name: string) => readFileSync(`database/${name}`, "utf8")
  .replace(/^\s*BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, "")
  .replace(/\btrovio\b/g, schema);

async function main() {
  await client.connect();
  await client.query("BEGIN");
  try {
    console.log(backupName ? `Rehearsal data: database/backups/${backupName}` : 'Rehearsal data: live catalog (read only)');
    await client.query("SET LOCAL lock_timeout='5s'");
    // schema.sql contains leading comments, so remove transaction statements by line.
    await client.query(sqlFile("schema.sql").replace(/^BEGIN;\s*$/m, ""));
    const old = readdirSync("database/migrations").filter(n => n.endsWith(".sql") && n < "20261020").sort();
    for (const name of old) await client.query(sqlFile(`migrations/${name}`));
    // Match the actual pre-migration state: legacy DB does not enforce code uniqueness.
    await client.query(`DROP INDEX IF EXISTS ${schema}.majors_code_uq`);
    await client.query(`ALTER TABLE ${schema}.majors ALTER COLUMN code DROP NOT NULL`);
    const tables = ["regions","priority_regions","priority_groups","admission_methods","subjects","combos","combo_subjects","riasec_types","major_groups","schools","school_campuses","majors","major_riasec","programs","program_combos","program_admission_methods","program_cutoffs","program_verified_fields"];
    for (const table of tables) {
      const columns = await client.query<{ column_name: string }>(`SELECT a.column_name FROM information_schema.columns a JOIN information_schema.columns b USING(table_name,column_name)
        WHERE a.table_schema=$1 AND b.table_schema='trovio' AND a.table_name=$2 ORDER BY a.ordinal_position`,[schema,table]);
      const names=columns.rows.map(r=>`"${r.column_name}"`).join(',');
      // Some earlier migrations seed reference rows; copy catalog rows only once.
      if (backup) {
        await client.query(`INSERT INTO ${schema}.${table} (${names}) OVERRIDING SYSTEM VALUE SELECT ${names}
          FROM jsonb_populate_recordset(NULL::${schema}.${table},$1::jsonb) ON CONFLICT DO NOTHING`,[JSON.stringify(backup[table] ?? [])]);
      } else {
        await client.query(`INSERT INTO ${schema}.${table} (${names}) OVERRIDING SYSTEM VALUE SELECT ${names} FROM trovio.${table} ON CONFLICT DO NOTHING`);
      }
    }
    for (const table of ['school_campuses','program_admission_methods']) {
      await client.query(`SELECT setval(pg_get_serial_sequence('${schema}.${table}','id'), COALESCE((SELECT max(id) FROM ${schema}.${table}),1))`);
    }
    if (backup) await client.query(`INSERT INTO ${schema}.app_documents SELECT *
      FROM jsonb_populate_recordset(NULL::${schema}.app_documents,$1::jsonb) WHERE collection='program-patch'`,[JSON.stringify(backup.app_documents ?? [])]);
    else await client.query(`INSERT INTO ${schema}.app_documents SELECT * FROM trovio.app_documents WHERE collection='program-patch'`);
    const before = (await client.query(`SELECT count(*)::int AS count FROM ${schema}.programs`)).rows[0].count;
    const patches = (await client.query(`SELECT id,payload FROM ${schema}.app_documents WHERE collection='program-patch' ORDER BY id`)).rows;
    for (const name of readdirSync("database/migrations").filter(n=>n.startsWith('20261020') && n.endsWith('.sql')).sort()) {
      await client.query(sqlFile(`migrations/${name}`));
      console.log(`PASS migration ${name}`);
    }
    assert.equal((await client.query(`SELECT count(*)::int AS count FROM ${schema}.programs`)).rows[0].count, before);
    assert.equal((await client.query(`SELECT count(*)::int AS count FROM ${schema}.app_documents WHERE collection='program-patch'`)).rows[0].count,0);
    assert.equal((await client.query(`SELECT count(*)::int AS count FROM (SELECT code FROM ${schema}.majors WHERE code IS NOT NULL GROUP BY code HAVING count(*)>1) d`)).rows[0].count,0);
    for (const patch of patches) {
      const actual=(await client.query(`SELECT ${schema}.program_snapshot($1) AS data`,[patch.id])).rows[0].data;
      for (const [key,value] of Object.entries(patch.payload)) {
        if (key==='combos') assert.deepEqual([...actual[key]].sort(),[...(value as string[])].sort());
        else if (key==='cutoffs') assert.deepEqual(actual[key].map(({year,score}:any)=>({year,score})),value);
        else assert.deepEqual(actual[key],value,`Patch ${patch.id} field ${key}`);
      }
    }
    console.log(`PASS preserved ${before} program IDs and materialized ${patches.length} patches`);
    const sample=(await client.query(`SELECT id,school_id,admission_code FROM ${schema}.programs ORDER BY id LIMIT 1`)).rows[0];
    const snapshot=(await client.query(`SELECT ${schema}.program_snapshot($1) AS data`,[sample.id])).rows[0].data;
    await client.query(`SELECT ${schema}.save_program_patch($1,'{"hidden":true}'::jsonb)`,[sample.id]);
    assert.equal((await client.query(`SELECT count(*)::int AS count FROM ${schema}.public_programs WHERE id=$1`,[sample.id])).rows[0].count,0);
    await client.query(`SELECT ${schema}.save_program_patch($1,NULL)`,[sample.id]);
    // Existing baseline may predate current snapshot: select an untouched program for exact reset test below.
    const untouched=(await client.query(`SELECT id FROM ${schema}.programs WHERE id NOT IN (SELECT program_id FROM ${schema}.program_baselines) AND id<>$1 LIMIT 1`,[sample.id])).rows[0];
    const original=(await client.query(`SELECT ${schema}.program_snapshot($1) AS data`,[untouched.id])).rows[0].data;
    await client.query(`SELECT ${schema}.save_program_patch($1,'{"quota":123,"cutoffs":[{"year":2025,"score":22}],"combos":["A00"]}'::jsonb)`,[untouched.id]);
    await client.query(`SELECT ${schema}.save_program_patch($1,NULL)`,[untouched.id]);
    assert.deepEqual((await client.query(`SELECT ${schema}.program_snapshot($1) AS data`,[untouched.id])).rows[0].data, original);
    async function rejects(sql:string, params:unknown[], code?:string) {
      await client.query('SAVEPOINT expected_failure');
      let error:any;
      try { await client.query(sql,params); } catch(e) { error=e; }
      await client.query('ROLLBACK TO SAVEPOINT expected_failure');
      assert.ok(error,'Expected database to reject invalid data');
      if(code) assert.equal(error.code,code);
    }
    await rejects(`UPDATE ${schema}.programs SET id=id||'-changed' WHERE id=$1`,[sample.id]);
    await rejects(`SELECT ${schema}.save_program_patch($1,'{"cutoffs":[{"year":2025,"score":31}]}'::jsonb)`,[sample.id]);
    await rejects(`SELECT ${schema}.save_program_patch($1,'{"combos":["ZZ9"]}'::jsonb)`,[sample.id],'23503');
    await rejects(`SELECT ${schema}.save_program_patch($1,'{"cutoffs":[{"year":2025,"score":22},{"year":2025,"score":23}]}'::jsonb)`,[sample.id],'23505');
    await rejects(`SELECT ${schema}.save_program_patch('nonexistent','{}'::jsonb)`,[]);
    await rejects(`UPDATE ${schema}.majors SET code='7991234' WHERE id=(SELECT id FROM ${schema}.majors LIMIT 1)`,[],'23514');
    await client.query('SET LOCAL search_path = public');
    await client.query(`INSERT INTO ${schema}.program_cutoffs(program_id,method_code,year,score) VALUES ($1,'thpt',2099,22)`,[sample.id]);
    console.log('PASS trigger schema resolution without session search_path');
    console.log('PASS immutable IDs, public visibility, reset, foreign keys, cutoff uniqueness and scale');
    console.log('Review queue:',(await client.query(`SELECT reason,count(*) FROM ${schema}.major_code_review GROUP BY reason`)).rows);
    const plan=(await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) SELECT id FROM ${schema}.public_programs WHERE school_id=$1`,[sample.school_id])).rows[0]['QUERY PLAN'][0];
    console.log(`Scoped public lookup: ${plan['Execution Time']}ms (isolated rehearsal; not an end-to-end benchmark)`);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
    console.log('ROLLBACK complete; verification schema was not retained.');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
