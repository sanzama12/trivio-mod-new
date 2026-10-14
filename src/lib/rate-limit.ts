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

/**
 * Shared store instance across multiple worker threads or cluster instances.
 */
export class SharedRateLimitStore implements RateLimitStore {
  private store: Map<string, number[]>;

  constructor(sharedMap?: Map<string, number[]>) {
    this.store = sharedMap ?? new Map<string, number[]>();
  }

  hit(key: string, limit: number, windowSec: number, now = Date.now()): number {
    const since = now - windowSec * 1000;
    const existing = (this.store.get(key) ?? []).filter((t) => t > since);
    if (existing.length >= limit) {
      this.store.set(key, existing);
      return Math.max(1, Math.ceil((existing[0] + windowSec * 1000 - now) / 1000));
    }
    existing.push(now);
    this.store.set(key, existing);
    return 0;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const g = globalThis as unknown as {
  __trovioRateStore?: RateLimitStore;
};

export function getRateLimitStore(): RateLimitStore {
  return (g.__trovioRateStore ??= new MemoryRateLimitStore());
}

export function setRateLimitStore(store: RateLimitStore): void {
  g.__trovioRateStore = store;
}

/** Trả về số giây cần chờ (0 = được phép) và ghi nhận lượt nếu được phép. */
export function rateLimit(key: string, limit: number, windowSec: number, now = Date.now()): number {
  return getRateLimitStore().hit(key, limit, windowSec, now) as number;
}
