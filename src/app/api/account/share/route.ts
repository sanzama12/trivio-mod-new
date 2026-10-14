import { NextResponse } from "next/server";
import { shareService } from "@/services";
import { appOrigin, requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

const toJson = (req: Request, s: Awaited<ReturnType<typeof shareService.getActive>>) =>
  s ? { id: s.id, url: `${appOrigin(req)}/chia-se/${s.id}`, expiresAt: s.expiresAt, showNotes: s.showNotes, showScore: s.showScore } : null;

/** Link chia sẻ đang hoạt động của tài khoản. */
export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json({ ok: true, share: toJson(req, await shareService.getActive(user.id)) });
}

/** Tạo link mới (thu hồi link cũ). Body: { days: 7 | 30, showNotes, showScore } */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const parsed = await jsonBody(req, 2 * 1024);
  if (parsed.error) return parsed.error;
  const b = parsed.body ?? {};
  const share = await shareService.create(user.id, { days: Number(b.days), showNotes: b.showNotes === true, showScore: b.showScore === true });
  return NextResponse.json({ ok: true, share: toJson(req, share) }, { status: 201 });
}

/** Thu hồi link: người đang giữ link sẽ không xem được nữa. */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;
  await shareService.revoke(user.id);
  return NextResponse.json({ ok: true });
}
