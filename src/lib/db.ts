import dns from "node:dns";
import { Pool, type PoolClient } from "pg";
import { serverEnvironment } from "./server-env";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | null | undefined;
}

/**
 * Singleton PostgreSQL connection pool cho ứng dụng Trovio.
 */
export function getPool(): Pool {
  if (!global.__pgPool) {
    const { databaseUrl: connectionString } = serverEnvironment();

    const pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production" || connectionString.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });

    pool.on("error", (err) => {
      console.warn("[pg] idle client error:", err?.message || err);
    });

    global.__pgPool = pool;
  }

  const pool = global.__pgPool;
  if (!pool) {
    throw new Error("PostgreSQL pool chưa sẵn sàng");
  }
  return pool;
}

/**
 * Thực thi câu lệnh SQL với search_path mặc định là 'trovio, public'
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  let client: PoolClient | null = null;
  try {
    client = await getPool().connect();
    await client.query("SET search_path TO trovio, public");
    const result = await client.query(text, params);
    return result.rows as T[];
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pg] query failed:", message);
    throw new Error(`[PostgreSQL] Truy vấn thất bại: ${message}`, { cause: err });
  } finally {
    if (client) {
      try {
        client.release();
      } catch {}
    }
  }
}

/**
 * Thực thi một khối tác vụ trong một ACID Transaction an toàn (GIAI ĐOẠN 9).
 * Tự động ROLLBACK khi có lỗi và COMMIT khi hoàn tất thành công.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET search_path TO trovio, public");
    const res = await fn(client);
    await client.query("COMMIT");
    return res;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw err;
  } finally {
    try {
      client.release();
    } catch {}
  }
}
