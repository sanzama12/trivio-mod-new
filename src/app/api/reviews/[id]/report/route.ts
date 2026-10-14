import { NextResponse } from "next/server";
import { reviewService } from "@/services/review.service";
import { requireUser } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Báo cáo cảm nhận vi phạm. Cần đăng nhập bằng tài khoản đã xác thực email:
 * nếu cho khách báo cáo theo IP, kẻ xấu có thể giả mạo IP để ẩn hàng loạt cảm nhận.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await jsonBody<{ reason?: unknown }>(req, 2 * 1024);
  if (bodyError) return bodyError;
  const wait = rateLimit(`report:${user.id}`, 10, 3600);
  if (wait) return tooMany(wait);
  const { id } = await ctx.params;
  const result = await reviewService.report(id, user, body?.reason);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
