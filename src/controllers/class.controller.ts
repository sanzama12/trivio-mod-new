/**
 * CONTROLLER LAYER — ClassController (giáo viên chủ nhiệm)
 * Bao quanh class.service: list/create/join/leave/dashboard/remind...
 */
import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { classService } from "@/services/class.service";

export class ClassController {
  static async list(req: Request): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ classes: [], joined: [] });
    const [classes, joined] = await Promise.all([classService.listMine(user), classService.joined(user)]);
    return NextResponse.json({ classes, joined });
  }

  static async create(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const wait = rateLimit(`class:create:${user.id}`, 10, 600);
    if (wait) return tooMany(wait);
    const { body, error: bad } = await jsonBody(req, 4 * 1024);
    if (bad) return bad;
    const res = await classService.create(user, body ?? {});
    return NextResponse.json(res, { status: res.ok ? 201 : res.status });
  }

  static async getOne(_req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const data = await classService.dashboard(user, params.id);
    if (!data) return NextResponse.json({ ok: false, message: "Không tìm thấy lớp." }, { status: 404 });
    return NextResponse.json({ ok: true, ...data });
  }

  static async join(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const wait = Math.max(rateLimit(`class:join:${clientIp(req)}`, 10, 600), rateLimit(`class:join:u:${user.id}`, 20, 3600));
    if (wait) return tooMany(wait);
    const { body, error: bad } = await jsonBody(req, 2 * 1024);
    if (bad) return bad;
    const res = await classService.join(user, (body as Record<string, unknown>)?.code);
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  }

  static async remind(req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const { body, error: bad } = await jsonBody(req, 4 * 1024);
    if (bad) return bad;
    const res = await classService.remind(user, params.id, body ?? {});
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  }

  static async deleteOne(_req: Request, params: { id: string }): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const ok = await classService.remove(user, params.id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  }
}
