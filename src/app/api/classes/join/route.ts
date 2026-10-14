import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { classService } from "@/services/class.service";

/** POST /api/classes/join — học sinh nhập mã lớp (= đồng ý chia sẻ tiến độ với GVCN). Chống dò mã bằng giới hạn tần suất. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = Math.max(rateLimit(`cls-join:${clientIp(req)}`, 10, 600), rateLimit(`cls-join:u:${user.id}`, 10, 600));
  if (wait) return tooMany(wait);
  const { body, error: tooBig } = await jsonBody(req, 1024);
  if (tooBig) return tooBig;
  const res = await classService.join(user, body?.code);
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
}
