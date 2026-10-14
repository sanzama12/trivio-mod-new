import { NextResponse } from "next/server";
import { chatbotService } from "@/services/chatbot.service";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** POST /api/chat/feedback { logId, helpful } — người dùng đánh giá câu trả lời. */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ logId?: unknown; helpful?: unknown }>(req, 1024);
  if (error) return error;
  const wait = rateLimit(`chat-fb:${clientIp(req)}`, 60, 600);
  if (wait) return tooMany(wait);
  if (typeof body?.logId !== "string" || typeof body.helpful !== "boolean") return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await chatbotService.feedback(body.logId.slice(0, 64), body.helpful);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
