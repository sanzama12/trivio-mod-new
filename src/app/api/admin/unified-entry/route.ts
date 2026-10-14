import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { unifiedEntryService } from "@/services/unified-entry.service";

/**
 * GET: Lấy danh sách tổng hợp Trường · Ngành · Điểm · Học phí
 * Query: ?status=all|missing_score|missing_tuition|complete & q=...
 */
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "all") as "all" | "missing_score" | "missing_tuition" | "complete";
  const q = searchParams.get("q") || "";

  const rows = await unifiedEntryService.listAll({ status, q });
  const allRows = status === "all" && !q ? rows : await unifiedEntryService.listAll();

  const stats = {
    total: allRows.length,
    missingScore: allRows.filter((r) => r.missingScore).length,
    missingTuition: allRows.filter((r) => r.missingTuition).length,
    complete: allRows.filter((r) => r.isComplete).length,
  };

  return NextResponse.json({ ok: true, rows, stats });
}

/**
 * POST: Nhập nhanh 1 bản ghi tích hợp (Trường + Cơ sở + Ngành + Điểm + Học phí)
 * Hỗ trợ thiếu thông tin vẫn cho lưu.
 */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const wait = rateLimit(`unified-entry:${user.id}`, 60, 60);
  if (wait) return tooMany(wait);

  const parsed = await jsonBody<Record<string, unknown>>(req, 1024 * 1024);
  if (parsed.error) return parsed.error;

  const res = await unifiedEntryService.save(user, parsed.body as any);
  return NextResponse.json(res, { status: res.ok ? 200 : (res as any).status || 400 });
}

/**
 * PATCH: Sửa nhanh điểm hoặc học phí trực tiếp từ bảng (In-Place Quick Edit)
 * Body: { id: programId, score, tuitionMin, tuitionMax, year }
 */
export async function PATCH(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const parsed = await jsonBody<{ id: string; score?: number | null; tuitionMin?: number | null; tuitionMax?: number | null; year?: number }>(req, 1024 * 64);
  if (parsed.error) return parsed.error;
  if (!parsed.body?.id) {
    return NextResponse.json({ ok: false, message: "Thiếu ID chương trình cần sửa." }, { status: 400 });
  }

  const res = await unifiedEntryService.quickUpdate(user, parsed.body.id, parsed.body);
  return NextResponse.json(res, { status: res.ok ? 200 : (res as any).status || 400 });
}
