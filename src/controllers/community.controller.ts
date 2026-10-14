/**
 * CONTROLLER LAYER — CommunityController
 * Hỏi đáp sinh viên, cảm nhận trường, khảo sát SUS. Parse/rateLimit/auth → service.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { qaService } from "@/services/community.service";
import { reviewService } from "@/services/review.service";
import { analyticsService } from "@/services/analytics.service";

const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export class CommunityController {
  // ---- QA ----
  static async listQa(req: Request): Promise<Response> {
    const programId = new URL(req.url).searchParams.get("programId") ?? "";
    if (!ID_RE.test(programId)) return NextResponse.json({ ok: false, message: "Thiếu chương trình." }, { status: 400 });
    const user = await getCurrentUser();
    const [items, perm] = await Promise.all([qaService.listForProgram(programId, user?.id ?? null), qaService.canAnswer(user, programId)]);
    return NextResponse.json({ ok: true, items, canAnswer: perm.ok, domain: perm.domain, loggedIn: !!user });
  }

  static async askQa(req: Request): Promise<Response> {
    const user = await getCurrentUser();
    const wait = Math.max(rateLimit(`qa-ask:${clientIp(req)}`, 5, 600), user ? rateLimit(`qa-ask:u:${user.id}`, 10, 86400) : 0);
    if (wait) return tooMany(wait);
    const { body, error } = await jsonBody(req, 4 * 1024);
    if (error) return error;
    const programId = typeof body?.programId === "string" && ID_RE.test(body.programId) ? body.programId : "";
    const res = await qaService.ask(user, programId, body ?? {});
    return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
  }

  static async answerQa(req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const wait = Math.max(rateLimit(`qa-ans:${clientIp(req)}`, 10, 600), rateLimit(`qa-ans:u:${user.id}`, 20, 86400));
    if (wait) return tooMany(wait);
    const { body, error: tooBig } = await jsonBody(req, 8 * 1024);
    if (tooBig) return tooBig;
    const res = await qaService.answer(user, params.id.slice(0, 80), body ?? {});
    return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
  }

  // ---- Reviews ----
  static async listReviews(req: NextRequest, params: { id: string }): Promise<Response> {
    const user = await getCurrentUser();
    const q = req.nextUrl.searchParams;
    const sort = q.get("sort") === "huu-ich" ? "huu-ich" : "moi-nhat";
    const major = q.get("major") ?? "";
    const majorId = /^[a-z0-9-]{1,60}$/.test(major) ? major : null;
    const cohortRaw = q.get("cohort") ?? "";
    const cohort = /^\d{4}$/.test(cohortRaw) ? Number(cohortRaw) : null;
    const [list, mine] = await Promise.all([
      reviewService.listPublic(params.id, { sort, viewerId: user?.id, majorId, cohort }),
      user ? reviewService.mine(user.id, params.id) : null,
    ]);
    return NextResponse.json({ ok: true, ...list, mine });
  }

  static async submitReview(req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const parsed = await jsonBody(req, 16 * 1024);
    if (parsed.error) return parsed.error;
    const wait = rateLimit(`review:${user.id}`, 5, 3600);
    if (wait) return tooMany(wait);
    const result = await reviewService.submit(user, params.id, parsed.body ?? {});
    return NextResponse.json(result, { status: result.ok ? 201 : result.status });
  }

  static async withdrawReview(_req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const ok = await reviewService.withdraw(user.id, params.id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  }

  static async voteAnswer(req: Request, params: { id: string; answerId: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const wait = rateLimit(`qa-vote:${user.id}`, 60, 600);
    if (wait) return tooMany(wait);
    const { body, error: tooBig } = await jsonBody<{ action?: unknown }>(req, 512);
    if (tooBig) return tooBig;
    const res = await qaService.voteAnswer(user, params.id.slice(0, 80), params.answerId.slice(0, 80), body?.action);
    return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
  }

  // ---- Survey (SUS) ----
  static async submitSurvey(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<Record<string, unknown>>(req, 4 * 1024);
    if (error) return error;
    const wait = rateLimit(`survey:${clientIp(req)}`, 10, 3600);
    if (wait) return tooMany(wait);
    if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ ok: true, score: 0, grade: "" });
    const result = await analyticsService.submitSurvey(body ?? {});
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  }
}
