import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { reminderService } from "@/services/reminder.service";

/**
 * GET|POST /api/cron/reminders — gửi email nhắc hạn đến hạn hôm nay + thông báo xét tuyển bổ sung phù hợp.
 * Gọi mỗi ngày bởi bộ lập lịch (VD Vercel Cron) với header `Authorization: Bearer <CRON_SECRET>`.
 * Chưa đặt CRON_SECRET → tắt (503).
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "Chưa cấu hình CRON_SECRET." }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await reminderService.sendDue();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
