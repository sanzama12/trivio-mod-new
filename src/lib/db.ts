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

/** Ghi nhớ connection nào đã cấu hình schema, tránh gửi SET trước mọi truy vấn. */
const initializedClients = new WeakSet<PoolClient>();

async function ensureSearchPath(client: PoolClient): Promise<void> {
  if (initializedClients.has(client)) return;
  await client.query("SET search_path TO trovio, public");
  initializedClients.add(client);
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
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 15000,
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

function isRetryableConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("timeout exceeded") ||
    message.includes("Connection terminated") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("connection reset")
  );
}

/**
 * Thực thi câu lệnh SQL với search_path mặc định là 'trovio, public'
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await getPool().connect();
      await ensureSearchPath(client);
      const result = await client.query(text, params);
      return result.rows as T[];
    } catch (err: any) {
      if (client) {
        try {
          client.release();
        } catch {}
        client = null;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries && isRetryableConnectionError(err)) {
        console.warn(`[pg] Kết nối tạm thời gián đoạn (${message}), thử lại lần ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
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
  throw new Error("[PostgreSQL] Truy vấn thất bại sau khi thử lại");
}

/**
 * Thực thi một khối tác vụ trong một ACID Transaction an toàn (GIAI ĐOẠN 9).
 * Tự động ROLLBACK khi có lỗi và COMMIT khi hoàn tất thành công.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient | null = null;
  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      client = await getPool().connect();
      break;
    } catch (err: any) {
      if (attempt < maxRetries && isRetryableConnectionError(err)) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[pg] Kết nối transaction gián đoạn (${message}), thử lại lần ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw err;
    }
  }

  if (!client) {
    throw new Error("[PostgreSQL] Không thể kết nối để thực hiện transaction");
  }

  try {
    await ensureSearchPath(client);
    await client.query("BEGIN");
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
