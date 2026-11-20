/** ETL working data lives in PostgreSQL; it never becomes a public catalog automatically. */
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";
import { databaseConnection } from "./tls";

config({ path: ".env.local", quiet: true });
let pool: Pool | undefined;
export function stagingPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required for ETL storage.");
    pool = new Pool({ ...databaseConnection(url), max: 4, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
  }
  return pool;
}

function entryId(dataset: string, key: string): string {
  if (!/^[a-z0-9-]+$/.test(dataset) || !key || key.length > 200) throw new Error("Invalid staging entry.");
  return `${dataset}:${key}`;
}

export async function stagingEntries<T>(dataset: string): Promise<Record<string, T>> {
  entryId(dataset, "validation");
  const rows = await stagingPool().query<{ id: string; payload: { value: T } }>(
    "SELECT id,payload FROM trovio.app_documents WHERE collection='etl-staging' AND parent_id=$1 ORDER BY id", [dataset]);
  return Object.fromEntries(rows.rows.map((row) => [row.id.slice(dataset.length + 1), row.payload.value]));
}

export async function saveStagingEntry(dataset: string, key: string, value: unknown, options: { onlyMissing?: boolean; client?: PoolClient } = {}): Promise<boolean> {
  if (value === undefined) throw new Error("Staging value must be defined.");
  const result = await (options.client ?? stagingPool()).query(
    `INSERT INTO trovio.app_documents(collection,id,parent_id,payload)
     VALUES ('etl-staging',$1,$2,$3::jsonb)
     ON CONFLICT(collection,id) ${options.onlyMissing ? "DO NOTHING" : "DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()"}
     RETURNING id`, [entryId(dataset, key), dataset, JSON.stringify({ value })]);
  return result.rowCount === 1;
}

export async function closeStaging(): Promise<void> {
  if (pool) { const current = pool; pool = undefined; await current.end(); }
}
