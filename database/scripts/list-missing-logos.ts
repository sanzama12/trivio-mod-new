import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envContent = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) return trimmed.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("Không tìm thấy DATABASE_URL");
}

async function main() {
  const client = new Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = await client.query<{ code: string; name: string; short_name: string; website: string }>(`
    SELECT code, name, short_name, website
    FROM trovio.schools
    WHERE NOT hidden AND (logo_url IS NULL OR logo_url = '')
    ORDER BY code
  `);
  for (const row of rows.rows) {
    console.log([row.code, row.short_name, row.name, row.website].join("\t"));
  }
  console.error("missing", rows.rows.length);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
