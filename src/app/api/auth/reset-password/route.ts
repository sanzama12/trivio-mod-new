import { NextResponse } from "next/server";
import { authService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ token?: unknown; password?: unknown }>(req, 8 * 1024);
  if (error) return error;
  const wait = rateLimit(`reset:ip:${clientIp(req)}`, 10, 900);
  if (wait) return tooMany(wait);
  const result = await authService.resetPassword(String(body?.token ?? "").slice(0, 1000), String(body?.password ?? "").slice(0, 200));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
