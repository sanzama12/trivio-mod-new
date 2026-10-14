/**
 * Tiện ích thuần cho mốc tuyển sinh (dùng được ở client): đếm ngày, tạo file .ics, link Google Calendar.
 */
import type { TimelineEvent } from "@/domain/types";

const DAY = 86_400_000;
/** Ngày theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy. */
const vnDate = (iso: string) => Date.parse(`${iso}T00:00:00+07:00`);

export function daysUntil(ev: TimelineEvent, now = Date.now()): number {
  return Math.ceil((vnDate(ev.start) - now) / DAY);
}

export function eventStatus(ev: TimelineEvent, now = Date.now()): "past" | "ongoing" | "upcoming" {
  const start = vnDate(ev.start);
  const end = vnDate(ev.end ?? ev.start) + DAY;
  if (now >= end) return "past";
  if (now >= start) return "ongoing";
  return "upcoming";
}

export function formatRange(ev: TimelineEvent): string {
  const f = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  return ev.end && ev.end !== ev.start ? `${f(ev.start)} – ${f(ev.end)}` : f(ev.start);
}

/** Mốc sắp tới trong `withinDays` ngày (hoặc đang diễn ra) trong số các mốc được chọn. */
export function upcomingReminders(events: TimelineEvent[], ids: string[], withinDays = 14, now = Date.now()) {
  return events
    .filter((e) => ids.includes(e.id))
    .map((e) => ({ event: e, days: daysUntil(e, now), status: eventStatus(e, now) }))
    .filter((x) => x.status === "ongoing" || (x.status === "upcoming" && x.days <= withinDays))
    .sort((a, b) => a.days - b.days);
}

const compact = (iso: string) => iso.replaceAll("-", "");
const addDays = (iso: string, n: number) => new Date(vnDate(iso) + n * DAY + 7 * 3600_000).toISOString().slice(0, 10);
/** Escape theo RFC 5545. */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Nội dung file .ics (sự kiện cả ngày, nhắc trước 3 ngày và 1 ngày). */
export function buildIcs(events: TimelineEvent[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Trovio//Moc tuyen sinh//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@trovio.vn`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.end ?? e.start, 1))}`,
      `SUMMARY:${icsText(e.title)}`,
      `DESCRIPTION:${icsText(`${e.desc}\n(Mốc minh hoạ từ Trovio — đối chiếu lịch chính thức của Bộ GD&ĐT.)`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P3D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Còn 3 ngày: ${e.title}`)}`,
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Ngày mai: ${e.title}`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(e: TimelineEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.start)}/${compact(addDays(e.end ?? e.start, 1))}`,
    details: `${e.desc}\n(Mốc minh hoạ từ Trovio — đối chiếu lịch chính thức của Bộ GD&ĐT.)`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
