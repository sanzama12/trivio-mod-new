import { config } from "dotenv";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
const root = join(process.cwd(), "database");
const statusOnly = process.argv.includes("--status");
const fresh = process.argv.includes("--fresh");
const allowDestructive = process.argv.includes("--allow-destructive");
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const source = (path: string) => readFileSync(path, "utf8").replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "");
const ident = (value: string) => '"' + value.replaceAll('"', '""') + '"';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");
  if (fresh && !allowDestructive) throw new Error("--fresh cần --allow-destructive; thao tác này xoá schema trovio.");
  await client.connect();
  try {
    const tables = (await client.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables
      WHERE table_schema='trovio' AND table_type='BASE TABLE' ORDER BY table_name`)).rows.map(r=>r.table_name);
    const applied = tables.includes('schema_migrations')
      ? new Set((await client.query<{name:string}>("SELECT name FROM trovio.schema_migrations")).rows.map(r=>r.name)) : new Set<string>();
    const names=readdirSync(join(root,'migrations')).filter(n=>n.endsWith('.sql')).sort();
    const pending=names.filter(n=>fresh || !applied.has(n));
    if(statusOnly) {
      console.log(`Schema trovio: ${tables.length} bảng. Đã áp dụng: ${applied.size}. Còn thiếu: ${pending.length}.`);
      for(const name of names) console.log(`${applied.has(name)?'applied':'pending'} ${name}`);
      return;
    }
    if(!pending.length && !fresh) { console.log('Không có migration mới.'); return; }
    for(const name of pending) {
      const sql=source(join(root,'migrations',name));
      if(/\b(?:DROP\s+(?:TABLE|SCHEMA|COLUMN)|TRUNCATE|DELETE\s+FROM)\b/i.test(sql) && !allowDestructive)
        throw new Error(`Migration ${name} có thay đổi/xoá dữ liệu; cần --allow-destructive sau khi đọc migration và chạy db:verify.`);
    }
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      await client.query("SET LOCAL lock_timeout='10s'");
      await client.query("SELECT pg_advisory_xact_lock(70862020)");
      if (tables.length) {
        // Snapshot is consistent with the transaction and written before any schema/data change.
        await client.query(`LOCK TABLE ${tables.map(t=>'trovio.'+ident(t)).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
        const appliedNow=tables.includes('schema_migrations')
          ? (await client.query<{name:string}>("SELECT name FROM trovio.schema_migrations ORDER BY name")).rows.map(r=>r.name) : [];
        if(JSON.stringify([...applied].sort())!==JSON.stringify(appliedNow)) throw new Error('Migration khác vừa chạy; hãy chạy lại db:status.');
        const [snapshot] = (await client.query(`SELECT jsonb_object_agg(name, records) AS data FROM (${tables.map(t=>
          `SELECT '${t}' AS name, COALESCE(jsonb_agg(to_jsonb(row_data)),'[]'::jsonb) AS records FROM trovio.${ident(t)} row_data`
        ).join(' UNION ALL ')}) backup_tables`)).rows;
        const backupDir=join(root,'backups');
        mkdirSync(backupDir,{recursive:true});
        const file=join(backupDir,`before-migration-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
        writeFileSync(file,JSON.stringify({format:1,createdAt:new Date().toISOString(),applied:[...applied],tables:snapshot.data})+'\n',{flag:'wx'});
        console.log(`Đã lưu snapshot đầy đủ ${tables.length} bảng: ${file}`);
      }
      if(fresh) await client.query('DROP SCHEMA IF EXISTS trovio CASCADE');
      if(fresh || !tables.length) await client.query(source(join(root,'schema.sql')));
      else for(const table of ['schools','majors','programs','users']) if(!tables.includes(table)) throw new Error(`Thiếu bảng nền ${table}`);
      await client.query('CREATE TABLE IF NOT EXISTS trovio.schema_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      for(const name of pending) {
        await client.query(source(join(root,'migrations',name)));
        await client.query('INSERT INTO trovio.schema_migrations(name) VALUES ($1)',[name]);
        console.log(`Applied ${name}`);
      }
      await client.query('COMMIT');
      console.log('Migration hoàn tất; không nạp seed hoặc thay đổi ID hiện có.');
    } catch(error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally { await client.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
