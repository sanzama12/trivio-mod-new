import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { schoolPortalService } from "@/services/school-portal.service";

/** Cổng trường: { action: "request", schoolId } | { action: "confirm", programId, field } | { action: "submit", programId, field, proposed, evidenceUrl, note } */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = rateLimit(`school-portal:${user.id}`, 120, 600);
  if (wait) return tooMany(wait);
  const parsed = await jsonBody<Record<string, unknown>>(req, 4096);
  if (parsed.error) return parsed.error;
  const b = parsed.body ?? {};
  const res =
    b.action === "request"
      ? await schoolPortalService.request(user, b.schoolId)
      : b.action === "confirm"
        ? await schoolPortalService.confirm(user, b.programId, b.field)
        : b.action === "submit"
          ? await schoolPortalService.submit(user, b)
          : ({ ok: false, status: 400, message: "Thao tác không hợp lệ." } as const);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
