import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { outcomeSurveyService } from "@/services/community.service";

/** POST /api/outcome-survey — phản hồi sau 1 năm học (mỗi tài khoản 1 lần / chương trình). */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = rateLimit(`os:${clientIp(req)}`, 10, 3600);
  if (wait) return tooMany(wait);
  const { body, error: tooBig } = await jsonBody(req, 4 * 1024);
  if (tooBig) return tooBig;
  const res = await outcomeSurveyService.submit(user, body ?? {});
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
}
