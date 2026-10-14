import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reminderService } from "@/services/reminder.service";

/** POST /api/admin/reminders — quản trị viên chạy thử gửi nhắc hạn ngay (cùng logic với tác vụ hằng ngày). */
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const result = await reminderService.sendDue();
  return NextResponse.json({ ok: true, ...result });
}
