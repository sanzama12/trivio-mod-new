import { NextResponse } from "next/server";
import { outcomeService } from "@/services/outcome.service";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

/** Thêm nguồn dữ liệu (bắt buộc đường dẫn https; mức tin cậy suy ra từ loại nguồn). */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const result = await outcomeService.addSource(user, parsed.body ?? {});
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
