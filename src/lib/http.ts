/**
 * Tiện ích cho route handler: đọc JSON có giới hạn kích thước, lấy IP client.
 */
import { NextResponse } from "next/server";

export class BodyTooLargeError extends Error {}

/** Đọc JSON body, từ chối nếu lớn hơn `maxBytes` (mặc định 64 KB). Body lỗi → null. */
export async function readJson<T = unknown>(req: Request, maxBytes = 64 * 1024): Promise<T | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  const text = await req.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new BodyTooLargeError();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const tooLarge = () => NextResponse.json({ ok: false, message: "Dữ liệu gửi lên quá lớn." }, { status: 413 });
export const tooMany = (retryAfterSec: number) =>
  NextResponse.json(
    { ok: false, message: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${Math.ceil(retryAfterSec / 60)} phút.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );

/** Đọc JSON; nếu quá lớn trả sẵn response 413. */
export async function jsonBody<T = Record<string, unknown>>(req: Request, maxBytes?: number): Promise<{ body: T | null; error: NextResponse | null }> {
  try {
    return { body: await readJson<T>(req, maxBytes), error: null };
  } catch (e) {
    if (e instanceof BodyTooLargeError) return { body: null, error: tooLarge() };
    throw e;
  }
}

/**
 * Trích xuất IP client an toàn cho mục đích rate limit (GIAI ĐOẠN 8).
 * - Khi TRUST_PROXY bật (hoặc production sau reverse proxy):
 *   Reverse proxy tin cậy nối IP thực của client vào cuối danh sách X-Forwarded-For.
 *   Attacker có thể tự đặt X-Forwarded-For: 1.2.3.4 giả mạo ở đầu chuỗi.
 *   Do đó, IP hợp lệ là IP ở vị trí (length - trustedProxyCount), ngăn spoofing.
 * - Khi TRUST_PROXY không bật: không tin X-Forwarded-For do client gửi lên.
 */
export function clientIp(req: Request, options?: { trustProxy?: boolean; trustedProxyCount?: number }): string {
  const trustProxy = options?.trustProxy ?? (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production");
  const trustedProxyCount = options?.trustedProxyCount ?? Math.max(1, parseInt(process.env.TRUSTED_PROXY_COUNT || "1", 10));

  if (trustProxy) {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) {
      const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const targetIdx = Math.max(0, parts.length - trustedProxyCount);
        const candidate = parts[targetIdx] || parts[0];
        const cleaned = candidate.replace(/[^a-fA-F0-9:.]/g, "").slice(0, 64);
        if (cleaned) return cleaned;
      }
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
      const cleaned = realIp.trim().replace(/[^a-fA-F0-9:.]/g, "").slice(0, 64);
      if (cleaned) return cleaned;
    }
  }

  // Fallback an toàn khi không ở sau proxy tin cậy
  return "127.0.0.1";
}

