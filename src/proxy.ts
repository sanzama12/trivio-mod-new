/**
 * Proxy (Next.js 16, trước đây là middleware) — chạy trước mọi request:
 * 1. Chống CSRF cho API: request ghi (POST/PUT/PATCH/DELETE) phải đến từ chính site này.
 *    (Cookie phiên đã SameSite=Lax; đây là lớp bảo vệ thứ hai.)
 * 2. Gắn các header bảo mật cơ bản cho mọi trang.
 * Theo khuyến nghị của Next, file này tự chứa, không import module dùng chung.
 */
import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    let source: URL;
    try {
      source = new URL(origin);
    } catch {
      return false;
    }
    if (!['http:', 'https:'].includes(source.protocol) || source.origin !== origin) return false;
    if (process.env.APP_URL) {
      try {
        return source.origin === new URL(process.env.APP_URL).origin;
      } catch {
        return false;
      }
    }
    if (process.env.NODE_ENV === "production") return false;
    return source.origin === req.nextUrl.origin;
  }
  // Không có Origin (công cụ dòng lệnh, test): chặn nếu trình duyệt báo là request chéo site.
  return req.headers.get("sec-fetch-site") !== "cross-site";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // SePay authenticates server-to-server notifications with its API key in the route.
  const sepayWebhook = pathname === "/api/donations/sepay-webhook" && req.method === "POST";
  if (pathname.startsWith("/api/") && !SAFE_METHODS.has(req.method) && !sepayWebhook && !sameOrigin(req)) {
    return NextResponse.json({ ok: false, message: "Yêu cầu không hợp lệ (khác nguồn gốc)." }, { status: 403 });
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (pathname.startsWith("/chia-se/")) {
    // Link chia sẻ chứa mã bí mật: không gửi URL sang trang khác, không cho máy tìm kiếm lập chỉ mục.
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "private, no-store");
  } else {
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (pathname.startsWith("/quan-tri") || pathname.startsWith("/api/admin")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (/^\/(?:api\/(?:account|admin|auth|chat|notifications)(?:\/|$)|quan-tri(?:\/|$)|ho-so(?:\/|$))/.test(pathname)) {
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}

export const config = {
  // Bỏ qua file tĩnh và ảnh tối ưu.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
