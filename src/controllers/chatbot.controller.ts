/**
 * CONTROLLER LAYER (MVC Architecture) — ChatbotController
 * Tiếp nhận tin nhắn hỏi đáp tuyển sinh, kiểm soát tần suất (Rate Limiting),
 * điều phối Chatbot Service và trả về câu trả lời có kiểm chứng.
 */
import { NextResponse } from "next/server";
import { chatbotService } from "../services/chatbot.service";
import { clientIp, jsonBody, tooMany } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";

export class ChatbotController {
  /**
   * Xử lý yêu cầu POST /api/chat
   */
  static async handleChat(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<{ message?: unknown; context?: Record<string, unknown> }>(req, 8 * 1024);
    if (error) return error;

    const ip = clientIp(req);
    const wait = Math.max(rateLimit(`chat:min:${ip}`, 20, 60), rateLimit(`chat:day:${ip}`, 300, 86400));
    if (wait) return tooMany(wait);

    const ctx = body?.context && typeof body.context === "object" ? body.context : {};
    try {
      const result = await chatbotService.ask(body?.message, {
        majorId: ctx.majorId,
        schoolId: ctx.schoolId,
        page: ctx.page,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    } catch (e) {
      console.error("[trovio:chat] lỗi khi trả lời:", e);
      return NextResponse.json(
        {
          ok: false,
          message: "Trợ lý gặp sự cố khi tra cứu dữ liệu. Bạn thử lại, nếu vẫn lỗi hãy báo cho quản trị viên.",
        },
        { status: 500 },
      );
    }
  }
}
