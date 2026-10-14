import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { quizAdminService } from "@/services/quiz-admin.service";

/** Xuất bộ câu hỏi (JSON). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const data = await quizAdminService.exportJson();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trovio-riasec-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/** { kind: "question", action: add|edit|hide|show|reset, id?, text?, type? } | { kind: "weights", weights } */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const b = parsed.body ?? {};
  const res = b.kind === "weights" ? await quizAdminService.saveWeights(user, b.weights) : b.kind === "question" ? await quizAdminService.question(user, b) : ({ ok: false, status: 400, message: "Thao tác không hợp lệ." } as const);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
