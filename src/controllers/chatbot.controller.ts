/**
 * CONTROLLER LAYER (MVC Architecture) — ChatbotController
 * Tiếp nhận tin nhắn hỏi đáp tuyển sinh, kiểm soát tần suất (Rate Limiting),
 * điều phối Chatbot Service và trả về câu trả lời có kiểm chứng.
 */
import { NextResponse } from "next/server";
import { chatbotService } from "../services/chatbot.service";
import { withAiBudget } from "../services/wusrouter-llm";
import { clientIp, jsonBody, tooMany } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";
import { getCurrentUser, requireUser } from "../lib/auth";
import { attachChatGuestCookie, chatQuotaIdentity } from "../lib/chat-guest";
import { chatQuotaService } from "../services/chat-quota.service";
import { MAX_QUESTION } from "../domain/chat";
import { isChatImageMime, matchesChatImageSignature, MAX_CHAT_IMAGE_BYTES, type ChatImageInput } from "../domain/chat-image";
import sharp from "sharp";

const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;

async function boundedFormData(req: Request): Promise<FormData | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_MULTIPART_BYTES) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_MULTIPART_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const contentType = req.headers.get("content-type") ?? "";
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(req.url, { method: "POST", headers: { "content-type": contentType }, body: new Blob([bytes.buffer]) }).formData();
}

export class ChatbotController {
  /**
   * Xử lý yêu cầu POST /api/chat
   */
  static async handleChat(req: Request): Promise<Response> {
    const withImage = req.headers.get("content-type")?.startsWith("multipart/form-data") ?? false;
    const ip = clientIp(req);
    const wait = Math.max(...await Promise.all([
      rateLimit(`chat:min:${ip}`, 20, 60),
      rateLimit(`chat:day:${ip}`, 300, 86400),
      withImage ? rateLimit(`chat:image:min:${ip}`, 5, 60) : 0,
      withImage ? rateLimit(`chat:image:day:${ip}`, 50, 86400) : 0,
    ]));
    if (wait) return tooMany(wait);

    let body: { message?: unknown; context?: Record<string, unknown>; conversationId?: unknown } | null;
    let imageInput: ChatImageInput | undefined;
    if (withImage) {
      const form = await boundedFormData(req).catch(() => null);
      if (!form) return NextResponse.json({ ok: false, message: "Ảnh hoặc yêu cầu quá lớn. Hãy chọn ảnh dưới 3 MB." }, { status: 413 });
      const image = form.get("image");
      if (!(image instanceof File) || !isChatImageMime(image.type) || image.size === 0 || image.size > MAX_CHAT_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, message: "Chỉ nhận ảnh JPG, PNG hoặc WebP dưới 3 MB." }, { status: 400 });
      }
      const bytes = new Uint8Array(await image.arrayBuffer());
      if (!matchesChatImageSignature(bytes, image.type)) {
        return NextResponse.json({ ok: false, message: "Tệp ảnh không hợp lệ." }, { status: 400 });
      }
      let normalized: Buffer;
      try {
        normalized = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
          .rotate()
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        return NextResponse.json({ ok: false, message: "Không đọc được ảnh này. Hãy chọn ảnh khác." }, { status: 400 });
      }
      if (normalized.byteLength > MAX_CHAT_IMAGE_BYTES) {
        return NextResponse.json({ ok: false, message: "Ảnh sau xử lý vẫn quá lớn. Hãy chọn ảnh khác." }, { status: 413 });
      }
      imageInput = { mime: "image/webp", dataUrl: `data:image/webp;base64,${normalized.toString("base64")}` };
      let context: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(String(form.get("context") ?? "{}"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) context = parsed;
      } catch { /* Ignore malformed optional context. */ }
      body = { message: form.get("message"), context, conversationId: form.get("conversationId") };
    } else {
      const parsed = await jsonBody<{ message?: unknown; context?: Record<string, unknown>; conversationId?: unknown }>(req, 8 * 1024);
      if (parsed.error) return parsed.error;
      body = parsed.body;
    }

    const ctx = body?.context && typeof body.context === "object" ? body.context : {};
    const question = typeof body?.message === "string" ? body.message.trim() : "";
    if (question.length < 2 || question.length > MAX_QUESTION) {
      return NextResponse.json({ ok: false, message: question.length > MAX_QUESTION ? `Câu hỏi tối đa ${MAX_QUESTION} ký tự.` : "Bạn hãy nhập câu hỏi nhé." }, { status: 400 });
    }
    const kind = withImage ? "image" : "text";
    let reservation: Awaited<ReturnType<typeof chatQuotaService.take>> = null;
    let identity: Awaited<ReturnType<typeof chatQuotaIdentity>> | null = null;
    try {
      const user = await getCurrentUser();
      identity = await chatQuotaIdentity(user?.id);
      reservation = await chatQuotaService.take(identity.subject, kind);
      if (!reservation) {
        const quota = await chatQuotaService.status(identity.subject);
        const resetsAt = quota[kind].resetsAt;
        const retryAfter = resetsAt ? Math.max(1, Math.ceil((Date.parse(resetsAt) - Date.now()) / 1000)) : 60;
        const message = kind === "image" ? "Bạn đã dùng hết 3 lượt hỏi bằng ảnh. Lượt ảnh sẽ được cấp lại sau 7 ngày." : "Bạn đã dùng hết 5 câu hỏi hôm nay. Lượt chat sẽ được cấp lại lúc 00:00.";
        return attachChatGuestCookie(NextResponse.json({ ok: false, message, quota }, { status: 429, headers: { "Retry-After": String(retryAfter) } }), identity.guestToken);
      }
      const result = await withAiBudget(() => chatbotService.ask(question, {
        majorId: ctx.majorId,
        schoolId: ctx.schoolId,
        page: ctx.page,
      }, user ? { userId: user.id, conversationId: typeof body?.conversationId === "string" ? body.conversationId : null } : undefined, imageInput));
      if (!result.ok) {
        await chatQuotaService.refund(identity.subject, kind, reservation);
        reservation = null;
      }
      const quota = await chatQuotaService.status(identity.subject);
      return attachChatGuestCookie(NextResponse.json({ ...result, quota }, { status: result.ok ? 200 : result.status ?? 400 }), identity.guestToken);
    } catch (e) {
      if (identity && reservation) await chatQuotaService.refund(identity.subject, kind, reservation).catch(() => undefined);
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

  static async quota(): Promise<Response> {
    try {
      const user = await getCurrentUser();
      const identity = await chatQuotaIdentity(user?.id);
      const quota = await chatQuotaService.status(identity.subject);
      return attachChatGuestCookie(NextResponse.json({ ok: true, quota }, { headers: { "Cache-Control": "private, no-store" } }), identity.guestToken);
    } catch {
      return NextResponse.json({ ok: false, message: "Chưa tải được hạn mức chat." }, { status: 503 });
    }
  }

  static async history(): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    return NextResponse.json({ ok: true, items: await chatbotService.history(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  }

  static async deleteHistory(req: Request): Promise<Response> {
    const { user, error } = await requireUser();
    if (error) return error;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
    const deleted = await chatbotService.deleteHistory(user.id, id);
    return NextResponse.json({ ok: deleted }, { status: deleted ? 200 : 404 });
  }
}
