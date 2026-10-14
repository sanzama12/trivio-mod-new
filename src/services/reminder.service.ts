/**
 * SERVICE LAYER — email nhắc hạn tuyển sinh.
 *
 * Người dùng bật "Nhắc tôi" cho từng mốc (lưu trong dữ liệu đồng bộ) và bật "Nhận nhắc qua email" (hồ sơ).
 * Hàm `sendDue` được gọi mỗi ngày bởi bộ lập lịch (VD Vercel Cron → POST /api/cron/reminders, có CRON_SECRET),
 * gửi email trước mốc 7 ngày và 1 ngày; nhật ký chống gửi trùng.
 */
import { repositories } from "../repositories";
import { timelineService } from "./timeline.service";
import { notificationService } from "./notification.service";
import { vnDay } from "./analytics.service";

export const REMIND_DAYS_BEFORE = [7, 1] as const;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);
const fmt = (iso: string) => iso.split("-").reverse().join("/");

export const reminderService = {
  /** Gửi các nhắc hạn đến hạn tại ngày `today` (mặc định hôm nay theo giờ Việt Nam). */
  async sendDue(today = vnDay()): Promise<{ checked: number; sent: number }> {
    const { events } = await timelineService.list();
    const due = events.flatMap((e) => {
      const d = daysBetween(today, e.start);
      return (REMIND_DAYS_BEFORE as readonly number[]).includes(d) ? [{ e, d }] : [];
    });
    if (due.length === 0) return { checked: 0, sent: 0 };
    const users = await repositories.users.list();
    let checked = 0;
    let sent = 0;
    for (const u of users) {
      if (!u.emailReminders || !u.verified || u.locked) continue;
      const data = await repositories.userData.get(u.id);
      const mine = due.filter(({ e }) => data?.reminders?.includes(e.id));
      if (mine.length === 0) continue;
      checked++;
      const keys = mine.map(({ e, d }) => `${u.id}:${e.id}:${d}`);
      const already = await repositories.reminderLog.sent(keys);
      for (const { e, d } of mine) {
        const key = `${u.id}:${e.id}:${d}`;
        if (already.has(key)) continue;
        await notificationService.notify({
          userId: u.id,
          kind: "reminder",
          title: d === 1 ? `Ngày mai: ${e.title}` : `Còn ${d} ngày: ${e.title}`,
          body: `${e.title} — ${e.end && e.end !== e.start ? `${fmt(e.start)} đến ${fmt(e.end)}` : fmt(e.start)}. ${e.desc}`,
          href: "/moc-tuyen-sinh",
          email: true,
        });
        await repositories.reminderLog.add([key]);
        sent++;
      }
    }
    return { checked, sent };
  },
};
