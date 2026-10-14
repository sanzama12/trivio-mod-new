import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { importService } from "@/services/import.service";

/** File mẫu CSV (hỗ trợ mẫu đơn giản qua ?type=simple). */
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { searchParams } = new URL(req.url);
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
  const { user, error } = await requireAdmin();
  if (error) return error;
  const wait = rateLimit(`import:${user.id}`, 40, 600);
  if (wait) return tooMany(wait);
  const parsed = await jsonBody<Record<string, unknown>>(req, 3 * 1024 * 1024);
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
}
