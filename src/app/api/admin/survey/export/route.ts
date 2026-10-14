import { requireAdmin } from "@/lib/auth";
import { analyticsService, SUS_ROLES } from "@/services/analytics.service";

/** Chặn "CSV injection": ô bắt đầu bằng = + - @ bị Excel hiểu là công thức. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/admin/survey/export — tải toàn bộ phiếu SUS dạng CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const list = await analyticsService.listSurveyResponses();
  const header = ["thoi_gian", "vai_tro", ...Array.from({ length: 10 }, (_, i) => `cau_${i + 1}`), "diem_sus", "gop_y"];
  const rows = list.map((r) => [r.at, r.role ? SUS_ROLES[r.role] ?? r.role : "", ...r.answers, r.score, r.comment ?? ""].map(cell).join(","));
  const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khao-sat-sus-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
