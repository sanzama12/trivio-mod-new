/**
 * SERVICE LAYER — token có chữ ký HMAC-SHA256 (phiên đăng nhập, liên kết đặt lại mật khẩu, state OAuth).
 * Không phụ thuộc Next.js; lớp presentation lo phần đọc/ghi cookie.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "trovio_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày

const g = globalThis as unknown as { __trovioEphemeralSecret?: string };

/**
 * Khoá ký token. Production mà quên đặt SESSION_SECRET → dùng khoá ngẫu nhiên theo tiến trình
 * (an toàn, chỉ là mọi phiên mất khi khởi động lại) thay vì một chuỗi mặc định ai cũng biết.
 */
const secret = () => {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) return env;
  if (process.env.NODE_ENV !== "production") return env || "trovio-dev-secret-change-me";
  if (!g.__trovioEphemeralSecret) {
    g.__trovioEphemeralSecret = randomBytes(32).toString("base64url");
    console.warn("[trovio] SESSION_SECRET chưa đặt hoặc quá ngắn (< 16 ký tự) — dùng khoá tạm thời, phiên sẽ mất khi khởi động lại.");
  }
  return g.__trovioEphemeralSecret;
};

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Ký một object bất kỳ kèm hạn dùng `exp` (epoch giây). */
/** Mã mờ ổn định cho một giá trị nội bộ (VD id học sinh trong lớp) — trình duyệt không suy ra được id thật. */
export function opaqueId(value: string): string {
  return sign(`opaque:${value}`).slice(0, 16);
}

export function signToken<T extends object>(data: T, maxAgeSec: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(now / 1000) + maxAgeSec })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Kiểm tra chữ ký + hạn dùng. Trả null nếu sai/hết hạn. */
export function verifyToken<T extends object>(token: string | undefined | null, now = Date.now()): (T & { exp: number }) | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  uid: string;
  /** Phiên bản phiên của tài khoản lúc đăng nhập; lệch với tài khoản → phiên đã bị thu hồi. */
  sv: number;
  exp: number; // epoch seconds
}

export function createSessionToken(uid: string, now = Date.now(), sessionVersion = 0): string {
  return signToken({ uid, sv: sessionVersion, typ: "session" }, SESSION_MAX_AGE, now);
}

export function readSessionToken(token: string | undefined | null, now = Date.now()): SessionPayload | null {
  const data = verifyToken<{ uid: string; sv?: number; typ?: string }>(token, now);
  if (!data || typeof data.uid !== "string" || data.typ !== "session") return null;
  return { uid: data.uid, sv: typeof data.sv === "number" ? data.sv : 0, exp: data.exp };
}
