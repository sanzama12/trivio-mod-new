import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

function readEnv(): string {
  const c = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of c.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) return t.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("no DATABASE_URL");
}

const client = new Client({ connectionString: readEnv(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const r1 = await client.query('SELECT COUNT(*)::int as total, COUNT(DISTINCT region_code)::int as regions FROM trovio.schools WHERE NOT hidden');
  console.log('🏫 Schools total:', r1.rows[0].total, '| regions:', r1.rows[0].regions);

  const r2 = await client.query('SELECT region_code, COUNT(*)::int as cnt FROM trovio.schools WHERE NOT hidden GROUP BY region_code ORDER BY region_code');
  console.log('🌏 Theo miền:');
  r2.rows.forEach((r: any) => console.log('  -', r.region_code, ':', r.cnt));

  const r3 = await client.query('SELECT type, COUNT(*)::int as cnt FROM trovio.schools WHERE NOT hidden GROUP BY type ORDER BY type');
  console.log('🏛️  Theo loại hình:');
  r3.rows.forEach((r: any) => console.log('  -', r.type, ':', r.cnt));

  const r4 = await client.query('SELECT COUNT(*)::int as majors FROM trovio.majors WHERE NOT hidden');
  console.log('🎓 Majors:', r4.rows[0].majors);

  const r5 = await client.query('SELECT COUNT(*)::int as programs FROM trovio.programs WHERE NOT hidden');
  console.log('📋 Programs:', r5.rows[0].programs);

  const r6 = await client.query('SELECT COUNT(*)::int as cutoffs FROM trovio.program_cutoffs');
  console.log('📊 Cutoffs:', r6.rows[0].cutoffs);

  const r7 = await client.query('SELECT COUNT(*)::int as cnt FROM trovio.school_campuses');
  console.log('🏢 Campuses:', r7.rows[0].cnt);

  const r8 = await client.query('SELECT COUNT(*)::int as cnt FROM trovio.program_combos');
  console.log('🔢 Combos:', r8.rows[0].cnt);

  await client.end();
  process.exit(0);
})();
