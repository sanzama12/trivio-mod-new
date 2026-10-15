import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { importService } from "@/services/import.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tải file mẫu đầy đủ. Mặc định giữ CSV cũ; dùng ?format=xlsx cho mẫu Excel. */
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "xlsx") {
    const content = await importService.templateXlsx();
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=trovio-mau-nhap-du-lieu-theo-id.xlsx",
        "Cache-Control": "no-store",
      },
    });
  }
  const isSimple = searchParams.get("type") === "simple";
  const content = isSimple ? importService.templateSimpleCsv() : importService.templateCsv();
  const filename = isSimple ? "trovio-mau-nhap-de-nhat.csv" : "trovio-mau-nhap-du-lieu.csv";
  return new NextResponse(content, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}

/**
 * { step: "preview", fileName, content }  — content: văn bản CSV hoặc base64 của .xlsx (≤ 2 MB)
 * { step: "revalidate" | "publish", fileName, rows }
 */
export async function POST(req: Request) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;
    const wait = rateLimit(`import:${user.id}`, 40, 600);
    if (wait) return tooMany(wait);
    const parsed = await jsonBody<Record<string, unknown>>(req, 10 * 1024 * 1024);
    if (parsed.error) return parsed.error;
    const b = parsed.body ?? {};
    const res =
      b.step === "preview"
        ? await importService.previewFile(b.fileName, b.content)
        : b.step === "revalidate"
          ? await importService.revalidate(b.fileName, b.rows)
          : b.step === "publish"
            ? await importService.publish(user, b.fileName, b.rows)
            : ({ ok: false, status: 400, message: "Thao tác không hợp lệ." } as const);
    return NextResponse.json(res, { status: res.ok ? 200 : res.status });
  } catch (err: unknown) {
    console.error("[api/admin/import] Error:", err);
    const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xử lý dữ liệu tải lên.";
    return NextResponse.json({ ok: false, status: 500, message: `Lỗi hệ thống: ${message}` }, { status: 500 });
  }
}
