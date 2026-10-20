import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "pg";
import { serverEnvironment } from "@/lib/server-env";

declare global { var __pgPool: Pool | null | undefined; }
type TransactionContext = { client: PoolClient; afterCommit: Set<() => void> };
const transaction = new AsyncLocalStorage<TransactionContext>();

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: serverEnvironment().databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 15000,
    });
    global.__pgPool.on("error", (error) => console.warn("[pg] idle connection:", error.message));
  }
  return global.__pgPool;
}

/** All SQL uses schema-qualified names. No SET round-trip or replay of uncertain writes. */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const context = transaction.getStore();
  const result = await (context?.client ?? getPool()).query(sql, params);
  return result.rows as T[];
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

class RejectedResult<T> { constructor(readonly result: T) {} }
export async function withAtomicResult<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T> {
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
