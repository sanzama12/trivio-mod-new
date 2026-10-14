import { NextResponse } from "next/server";
import { shareService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** Phụ huynh gửi góp ý qua link chia sẻ (không cần tài khoản). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { body, error } = await jsonBody<{ name?: unknown; message?: unknown; programId?: unknown; website?: unknown }>(req, 4 * 1024);
  if (error) return error;
  // Bẫy bot: trường ẩn "website" phải để trống.
  if (body?.website) return NextResponse.json({ ok: true });
  const wait = Math.max(rateLimit(`comment:ip:${clientIp(req)}`, 10, 600), rateLimit(`comment:share:${id}`, 15, 600));
  if (wait) return tooMany(wait);
  const result = await shareService.addComment(id, body ?? {});
  if (!result.ok) return NextResponse.json(result, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}
