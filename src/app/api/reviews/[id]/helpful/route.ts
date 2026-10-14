import { NextResponse } from "next/server";
import { reviewService } from "@/services/review.service";
import { requireUser } from "@/lib/auth";
import { tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** Bật/tắt "Hữu ích" (cần đăng nhập, mỗi người 1 lượt). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = rateLimit(`helpful:${user.id}`, 60, 600);
  if (wait) return tooMany(wait);
  const { id } = await ctx.params;
  const result = await reviewService.toggleHelpful(user.id, id);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
