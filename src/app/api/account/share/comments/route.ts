import { NextResponse, type NextRequest } from "next/server";
import { shareService } from "@/services";
import { requireUser } from "@/lib/auth";

/** Góp ý phụ huynh gửi qua link chia sẻ. ?markRead=1 để đánh dấu đã đọc. */
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const comments = await shareService.listComments(user.id);
  if (req.nextUrl.searchParams.get("markRead") === "1" && comments.some((c) => !c.read)) await shareService.markRead(user.id);
  return NextResponse.json({ ok: true, comments, unread: comments.filter((c) => !c.read).length });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const ok = await shareService.deleteComment(user.id, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
