/**
 * Đo phễu hành vi ẩn danh phía trình duyệt.
 *
 * - Chỉ gửi (tên sự kiện, mã ngẫu nhiên của trình duyệt). Không gửi URL, nội dung, tài khoản.
 * - Mỗi sự kiện gửi tối đa 1 lần/ngày/trình duyệt.
 * - Chỉ gửi sau khi người dùng đồng ý ở thanh cookie (lib/consent.ts).
 * - Không gửi gì nếu trình duyệt bật "Do Not Track" / "Global Privacy Control" hoặc người dùng tắt
 *   ở trang Chính sách quyền riêng tư (khoá `trovio_no_stats`).
 * - Mọi lỗi (chế độ riêng tư chặn storage, mất mạng…) đều bị bỏ qua: đo lường không bao giờ làm hỏng tính năng.
 */
import type { FunnelEvent, UsageKind } from "@/domain/types";
import { readConsent, writeConsent } from "./consent";

const ANON_KEY = "trovio_anon";
const SENT_KEY = "trovio_ev";
export const OPT_OUT_KEY = "trovio_no_stats";

const vnDay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID chỉ có trong "secure context" (https/localhost); mở qua IP mạng LAN thì tự tạo.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Trình duyệt yêu cầu không theo dõi, hoặc người dùng đã tắt thống kê. */
export function trackingDisabled(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return true;
    if (window.localStorage.getItem(OPT_OUT_KEY) === "1") return true;
    // Chỉ đo sau khi người dùng bấm "Chấp nhận" (hoặc bật thống kê) ở thanh cookie.
    return readConsent() !== true;
  } catch {
    return true;
  }
}

/** Bật/tắt thống kê ẩn danh cho trình duyệt này. Tắt thì xoá luôn mã ẩn danh đã tạo. */
export function setTrackingOptOut(off: boolean) {
  try {
    writeConsent(!off);
    if (off) {
      window.localStorage.setItem(OPT_OUT_KEY, "1");
      window.localStorage.removeItem(ANON_KEY);
      window.localStorage.removeItem(SENT_KEY);
    } else {
      window.localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    /* storage bị chặn: không lưu được lựa chọn, nhưng khi storage bị chặn cũng không gửi gì */
  }
}

export function track(event: FunnelEvent): void {
  if (typeof window === "undefined") return;
  try {
    if (trackingDisabled()) return;
    let anon = window.localStorage.getItem(ANON_KEY);
    if (!anon || !/^[a-z0-9-]{8,40}$/i.test(anon)) {
      anon = randomId();
      window.localStorage.setItem(ANON_KEY, anon);
    }
    const day = vnDay();
    const raw = JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "null") as { day?: string; events?: string[] } | null;
    const sent = raw?.day === day && Array.isArray(raw.events) ? raw.events : [];
    if (sent.includes(event)) return;
    window.localStorage.setItem(SENT_KEY, JSON.stringify({ day, events: [...sent, event] }));
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, anon }),
      keepalive: true,
    }).catch(() => null);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Ghi nhận lượt quan tâm ẩn danh tới một trường / ngành / chương trình hoặc một lượt tìm kiếm.
 * Cùng quy tắc riêng tư như `track`: không gửi nội dung tìm kiếm, chỉ gửi loại sự kiện và mã đối tượng.
 * Lượt xem cùng một đối tượng chỉ gửi một lần mỗi ngày; tìm kiếm gửi tối đa 30 lần mỗi ngày.
 */
export function trackUsage(kind: UsageKind, id = ""): void {
  if (typeof window === "undefined") return;
  try {
    if (trackingDisabled()) return;
    let anon = window.localStorage.getItem(ANON_KEY);
    if (!anon || !/^[a-z0-9-]{8,40}$/i.test(anon)) {
      anon = randomId();
      window.localStorage.setItem(ANON_KEY, anon);
    }
    const key = "trovio_usage";
    const day = vnDay();
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "null") as { day?: string; seen?: string[]; searches?: number } | null;
    const state = raw?.day === day ? { seen: raw.seen ?? [], searches: raw.searches ?? 0 } : { seen: [] as string[], searches: 0 };
    if (kind === "search") {
      if (state.searches >= 30) return;
      state.searches += 1;
    } else {
      const mark = `${kind}:${id}`;
      if (state.seen.includes(mark)) return;
      state.seen = [...state.seen, mark].slice(-200);
    }
    window.localStorage.setItem(key, JSON.stringify({ day, ...state }));
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usage: kind, id, anon }),
      keepalive: true,
    }).catch(() => null);
  } catch {
    /* bỏ qua */
  }
}
