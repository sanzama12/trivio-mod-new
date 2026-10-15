/**
 * CONTROLLER LAYER — AccountController
 * Hồ sơ, đổi mk, phiên, Google link, dữ liệu đồng bộ, chia sẻ.
 */
import { NextResponse } from "next/server";
import { authService, type ProfilePatch } from "@/services";
import { userDataService } from "@/services/user-data.service";
import { clearSession, requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

export class AccountController {
  static async getProfile(): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    return NextResponse.json({ ok: true, user });
  }

  static async patchProfile(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const parsed = await jsonBody(req, 8 * 1024);
    if (parsed.error) return parsed.error;
    const body = parsed.body ?? {};
    const patch: ProfilePatch = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (body.role === null || typeof body.role === "string") patch.role = body.role as ProfilePatch["role"];
    if (body.gradYear === null || typeof body.gradYear === "number") patch.gradYear = body.gradYear as number | null;
    if (body.province === null || typeof body.province === "string") patch.province = (body.province as string | null) || null;
    if (typeof body.under16 === "boolean") patch.under16 = body.under16;
    if (typeof body.parentConsent === "boolean") patch.parentConsent = body.parentConsent;
    if (typeof body.onboarded === "boolean") patch.onboarded = body.onboarded;
    if (typeof body.emailReminders === "boolean") patch.emailReminders = body.emailReminders;
    if (typeof body.surveyOptIn === "boolean") patch.surveyOptIn = body.surveyOptIn;
    const result = await authService.updateProfile(user.id, patch);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  static async deleteAccount(): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const deleted = await authService.deleteAccount(user.id);
    if (!deleted) return NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản để xoá." }, { status: 404 });
    return clearSession(NextResponse.json({ ok: true }));
  }

  static async getData(): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    return NextResponse.json({ ok: true, data: await userDataService.get(user.id) });
  }

  static async putData(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const { body, error: tooBig } = await jsonBody(req, 256 * 1024);
    if (tooBig) return tooBig;
    return NextResponse.json({ ok: true, data: await userDataService.replace(user.id, body) });
  }

  static async mergeData(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const { body, error: tooBig } = await jsonBody(req, 256 * 1024);
    if (tooBig) return tooBig;
    const { data, added } = await userDataService.mergeLocal(user.id, body);
    return NextResponse.json({ ok: true, data, added });
  }
}
