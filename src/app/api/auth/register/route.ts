import { NextResponse } from "next/server";
import { authService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { body, error } = await jsonBody(req, 8 * 1024);
  if (error) return error;
  const wait = rateLimit(`register:${clientIp(req)}`, 10, 3600);
  if (wait) return tooMany(wait);
  const b = body ?? {};
  const result = await authService.register({
    name: String(b.name ?? "").slice(0, 100),
    email: String(b.email ?? "").slice(0, 200),
    password: String(b.password ?? "").slice(0, 200),
    confirm: String(b.confirm ?? "").slice(0, 200),
    terms: b.terms === true,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
