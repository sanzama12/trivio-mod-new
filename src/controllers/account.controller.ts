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
    const version = req.headers.get("if-unmodified-since");
    if (!version || Number.isNaN(Date.parse(version))) return NextResponse.json({ ok: false, message: "Cần tải lại phiên bản dữ liệu trước khi lưu." }, { status: 428 });
    const data = await userDataService.replace(user.id, body, version);
    if (!data) return NextResponse.json({ ok: false, message: "Dữ liệu đã thay đổi trên thiết bị khác. Bản thay đổi trên máy này vẫn được giữ; hãy tải lại để đồng bộ." }, { status: 409 });
    return NextResponse.json({ ok: true, data });
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
