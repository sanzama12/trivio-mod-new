import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { classService } from "@/services/class.service";

/** GET /api/classes/:id — bảng tiến độ của lớp (chỉ giáo viên tạo lớp). DELETE — xoá lớp (giáo viên) hoặc rời lớp (?leave=1). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const dash = await classService.dashboard(user, id.slice(0, 80));
  return dash ? NextResponse.json({ ok: true, ...dash }) : NextResponse.json({ ok: false, message: "Không tìm thấy lớp." }, { status: 404 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const leave = new URL(req.url).searchParams.get("leave") === "1";
  const ok = leave ? await classService.leave(user, id.slice(0, 80)) : await classService.remove(user, id.slice(0, 80));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "Không tìm thấy lớp." }, { status: 404 });
}
