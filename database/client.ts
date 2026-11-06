import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "pg";
import { serverEnvironment } from "@/lib/server-env";

declare global {
  var __pgPool: Pool | null | undefined;
}

type TransactionContext = { client: PoolClient; afterCommit: Set<() => void> };
const transaction = new AsyncLocalStorage<TransactionContext>();

// Ngưỡng cảnh báo truy vấn chậm (Slow Query Threshold) tính bằng ms
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.PG_SLOW_QUERY_MS) || 1200;

export function getPool(): Pool {
  if (!global.__pgPool) {
    const dbUrl = serverEnvironment().databaseUrl;
    const isCloud =
      dbUrl.includes("neon.tech") ||
      dbUrl.includes("supabase.co") ||
      dbUrl.includes("amazonaws.com") ||
      dbUrl.includes("sslmode=require");

    global.__pgPool = new Pool({
      connectionString: dbUrl,
      // Kích thước Pool chuẩn cho Node.js + Serverless
      max: Number(process.env.PG_POOL_MAX) || 16,
      min: Number(process.env.PG_POOL_MIN) || 2, // Duy trì kết nối ấm tránh cold-start 150ms
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 10000,

      // Ngắt truy vấn treo để bảo vệ pool không bị kẹt tài nguyên
      statement_timeout: 10000, // 10s server-side timeout
      query_timeout: 10000,     // 10s client-side timeout
      lock_timeout: 5000,       // 5s chống bế tắc (deadlock)

      // Duy trì kết nối TCP sống, chống đứt kết nối qua Cloud NAT / Firewalls
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // Định danh ứng dụng cho pg_stat_activity
      application_name: "trovio-web-api",

      // SSL an toàn cho môi trường Cloud
      ssl:
        isCloud || process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });

    global.__pgPool.on("error", (error) => {
      console.warn("[pg] idle client error:", error.message);
    });
  }
  return global.__pgPool;
}

/**
 * Đo lường hiệu năng kết nối và độ trễ Database (Ping Database)
 */
export async function pingDb(): Promise<{
  ok: boolean;
  latencyMs: number;
  pool: { total: number; idle: number; waiting: number };
}> {
  const pool = getPool();
  const start = performance.now();
  try {
    await pool.query("SELECT 1 AS ping");
    const latencyMs = Math.round((performance.now() - start) * 10) / 10;
    return {
      ok: true,
      latencyMs,
      pool: {
        total: pool.totalCount ?? 0,
        idle: pool.idleCount ?? 0,
        waiting: pool.waitingCount ?? 0,
      },
    };
  } catch {
    return {
      ok: false,
      latencyMs: -1,
      pool: {
        total: pool?.totalCount ?? 0,
        idle: pool?.idleCount ?? 0,
        waiting: pool?.waitingCount ?? 0,
      },
    };
  }
}

/**
 * Trả về thông số sức khỏe của Connection Pool
 */
export function getPoolMetrics() {
  const pool = getPool();
  return {
    total: pool?.totalCount ?? 0,
    idle: pool?.idleCount ?? 0,
    waiting: pool?.waitingCount ?? 0,
  };
}

/**
 * Thực thi câu lệnh SQL với hỗ trợ Transaction Context, Giám sát độ trễ & Tối ưu tham số
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const context = transaction.getStore();
  const runner = context?.client ?? getPool();
  const start = performance.now();

  try {
    const result = await runner.query(sql, params);
    const duration = performance.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS && process.env.NODE_ENV !== "test") {
      const snippet = sql.replace(/\s+/g, " ").trim().slice(0, 100);
      console.warn(`[pg:slow-query] ⚠️ ${duration.toFixed(1)}ms: ${snippet}...`);
    }

    return result.rows as T[];
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[pg:error]", error instanceof Error ? error.message : error);
    }
    throw error;
  }
}

export function afterCommit(callback: () => void): void {
  const context = transaction.getStore();
  if (context) context.afterCommit.add(callback);
  else callback();
}

/** Nested repositories share one connection and commit/rollback the entire workflow. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const active = transaction.getStore();
  if (active) return fn(active.client);
  const client = await getPool().connect();
  const context: TransactionContext = { client, afterCommit: new Set() };
  try {
    await client.query("BEGIN");
    const result = await transaction.run(context, () => fn(client));
    await client.query("COMMIT");
    for (const callback of context.afterCommit) callback();
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

class RejectedResult<T> {
  constructor(readonly result: T) {}
}

export async function withAtomicResult<T extends { ok: boolean }>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await withTransaction(async () => {
      const result = await fn();
      if (!result.ok) throw new RejectedResult(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RejectedResult) return error.result;
    throw error;
  }
}
