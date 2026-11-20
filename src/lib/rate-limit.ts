/**
 * RATE LIMITER (GIAI ĐOẠN 8).
 * - Cung cấp Interface Store độc lập cho phép cắm Memory adapter (test/dev) hoặc Shared/Distributed store.
 * - Thuật toán sliding-window log chính xác, hỗ trợ burst rate-limiting, tự động dọn dẹp mục hết hạn.
 * - Cho phép nhiều instance cùng chia sẻ trạng thái nếu dùng Shared Store.
 */

export interface RateLimitStore {
  hit(key: string, limit: number, windowSec: number, now?: number): number | Promise<number>;
  reset?(key: string): void | Promise<void>;
  clear?(): void | Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, number[]>();

  hit(key: string, limit: number, windowSec: number, now = Date.now()): number {
    const since = now - windowSec * 1000;
    const existing = (this.buckets.get(key) ?? []).filter((t) => t > since);
    if (existing.length >= limit) {
      this.buckets.set(key, existing);
      return Math.max(1, Math.ceil((existing[0] + windowSec * 1000 - now) / 1000));
    }
    existing.push(now);
    this.buckets.set(key, existing);
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) {
        if (!v.some((t) => t > since)) this.buckets.delete(k);
      }
    }
    return 0;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }
}

/** Durable sliding windows shared by all application instances. */
export class PostgresRateLimitStore implements RateLimitStore {
  async hit(key: string, limit: number, windowSec: number, now = Date.now()): Promise<number> {
    const [{ createHash }, { query, withTransaction }] = await Promise.all([
      import("node:crypto"), import("@database/client"),
    ]);
    const id = createHash("sha256").update(key).digest("hex");
    return withTransaction(async () => {
      await query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rate-limit:${id}`]);
      const [row] = await query<{ payload: { hits: number[] } }>(
        "SELECT payload FROM trovio.app_documents WHERE collection='rate-limit' AND id=$1 FOR UPDATE", [id]);
      const since = now - windowSec * 1000;
      const hits = (row?.payload.hits ?? []).filter((t) => t > since);
      if (hits.length >= limit) return Math.max(1, Math.ceil((hits[0] + windowSec * 1000 - now) / 1000));
      hits.push(now);
      await query(`INSERT INTO trovio.app_documents(collection,id,payload)
        VALUES ('rate-limit',$1,$2::jsonb) ON CONFLICT(collection,id)
        DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`,
        [id, JSON.stringify({ hits, expiresAt: now + windowSec * 1000 })]);
      // Bounded cleanup; stored keys are hashes, never emails or IP addresses.
      await query(`DELETE FROM trovio.app_documents WHERE collection='rate-limit' AND id IN (
        SELECT id FROM trovio.app_documents WHERE collection='rate-limit'
        AND (payload->>'expiresAt')::bigint < $1 LIMIT 50 FOR UPDATE SKIP LOCKED)`, [now]);
      return 0;
    });
  }
}

const g = globalThis as unknown as {
  __trovioRateStore?: RateLimitStore;
};

export function getRateLimitStore(): RateLimitStore {
  return (g.__trovioRateStore ??= (process.env.NODE_ENV === "production" ? new PostgresRateLimitStore() : new MemoryRateLimitStore()));
}

export function setRateLimitStore(store: RateLimitStore): void {
  g.__trovioRateStore = store;
}

/** Trả về số giây cần chờ (0 = được phép) và ghi nhận lượt nếu được phép. */
export async function rateLimit(key: string, limit: number, windowSec: number, now = Date.now()): Promise<number> {
  return await getRateLimitStore().hit(key, limit, windowSec, now);
}
