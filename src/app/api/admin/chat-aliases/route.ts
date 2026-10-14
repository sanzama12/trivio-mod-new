import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { chatbotService } from "@/services/chatbot.service";

/** POST /api/admin/chat-aliases { alias, kind, targetId } — thêm cách gọi khác cho ngành/trường. */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { body, error: bodyError } = await jsonBody<Record<string, unknown>>(req, 2 * 1024);
  if (bodyError) return bodyError;
  const result = await chatbotService.addAlias(user, body ?? {});
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
