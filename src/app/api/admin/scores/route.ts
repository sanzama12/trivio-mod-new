import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { dataOpsService } from "@/services/data-ops.service";

/** Xuất CSV bảng điểm & học phí. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const csv = dataOpsService.toCsv(await dataOpsService.scoreRows());
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trovio-diem-hoc-phi-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** { action: "verify", ids } | { action: "source", id, sourceUrl, sourceCheckedAt, sourceNote } | { action: "clear-year", id, year } */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<Record<string, unknown>>(req, 32 * 1024);
  if (parsed.error) return parsed.error;
  const b = parsed.body ?? {};
  const id = typeof b.id === "string" ? b.id : "";
  const res =
    b.action === "verify"
      ? await dataOpsService.bulkVerify(user, b.ids)
      : b.action === "source"
        ? await dataOpsService.saveSource(user, id, b)
        : b.action === "clear-year"
          ? await dataOpsService.clearYear(user, id, b.year)
          : ({ ok: false, status: 400, message: "Thao tác không hợp lệ." } as const);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
