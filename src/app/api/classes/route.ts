import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { classService } from "@/services/class.service";

/** GET /api/classes — lớp tôi dạy (giáo viên) + lớp tôi tham gia. POST — tạo lớp (giáo viên). */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const [mine, joined] = await Promise.all([classService.listMine(user), classService.joined(user)]);
  return NextResponse.json({ ok: true, role: user.role, mine, joined });
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = rateLimit(`cls-create:${user.id}:${clientIp(req)}`, 10, 3600);
  if (wait) return tooMany(wait);
  const { body, error: tooBig } = await jsonBody(req, 2 * 1024);
  if (tooBig) return tooBig;
  const res = await classService.create(user, body ?? {});
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
}
