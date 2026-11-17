/**
 * LỚP TÍCH HỢP MÔ HÌNH NGÔN NGỮ (LLM LAYER) CHO CHATBOT TRIOVO
 *
 * Hỗ trợ 2 nhà cung cấp:
 * 1. WusRouter (https://wusrouter.com/v1 - OpenAI compatible) - ĐƯỢC ƯU TIÊN
 * 2. Anthropic (api.anthropic.com/v1 - Claude Messages)
 */
import type { ChatAnswer } from "../domain/chat";
import { isWusRouterConfigured, sendWusRouterChat } from "./wusrouter-llm";

const SYSTEM = [
  "Bạn là trợ lý tuyển sinh thông minh của TriOVO, trả lời học sinh và phụ huynh bằng tiếng Việt thân thiện, ân cần, súc tích (tối đa 4-5 câu).",
  "CHỈ được diễn đạt lại DỮ KIỆN được cung cấp. Không bịa đặt con số, tên trường, ngày tháng hay quy định sai lệch.",
  "Không cam kết chắc chắn trúng tuyển 100%. Giữ nguyên tính chính xác của các con số điểm chuẩn và học phí trong dữ kiện.",
  "Sử dụng định dạng Markdown rõ ràng, dễ đọc.",
].join("\n");

export function llmEnabled(): boolean {
  return (
    isWusRouterConfigured() ||
    (process.env.CHATBOT_LLM === "anthropic" && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL)
  );
}

/** Tập số xuất hiện trong văn bản (chuẩn hoá dấu thập phân). */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    out.add(raw);
    out.add(raw.replace(/\./g, "").replace(",", ".")); // 1.200 → 1200 ; 8,4 → 8.4
    out.add(raw.replace(",", "."));
  }
  return out;
}

/** Kiểm tra câu trả lời của mô hình: mọi con số phải có trong dữ kiện, không có link lạ. */
export function isFaithful(output: string, facts: string): boolean {
  if (!output.trim() || output.length > 1200) return false;
  if (/https?:\/\/|www\./i.test(output)) return false;
  const allowed = numbersIn(facts);
  for (const m of output.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    const variants = [raw, raw.replace(/\./g, "").replace(",", "."), raw.replace(",", ".")];
    if (!variants.some((v) => allowed.has(v))) return false;
  }
  return true;
}

export function factsOf(answer: Pick<ChatAnswer, "text" | "items" | "note">): string {
  return [
    answer.text,
    ...answer.items.map((i) => `- ${i.title}${i.meta ? `: ${i.meta}` : ""}`),
    answer.note ? `Ghi chú: ${answer.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function polishWithLlm(
  question: string,
  answer: ChatAnswer,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!llmEnabled()) return null;
  const facts = factsOf(answer);

  // 1. Ưu tiên sử dụng WusRouter nếu đã được cấu hình
  if (isWusRouterConfigured()) {
    try {
      const text = await sendWusRouterChat(
        [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `CÂU HỎI CỦA HỌC SINH: ${question}\n\nDỮ KIỆN XÁC THỰC CỦA HỆ THỐNG:\n${facts}\n\nHãy viết lại phần mở đầu câu trả lời sao cho ấm áp, tự nhiên, truyền cảm hứng và súc tích (không liệt kê lại danh sách).`,
          },
        ],
        { maxTokens: 450, temperature: 0.4 },
        fetchImpl
      );
      if (text && isFaithful(text, facts)) return text;
    } catch (e) {
      console.warn("[wusrouter] Lỗi khi polish câu trả lời:", e);
    }
  }

  // 2. Dự phòng Anthropic nếu WusRouter không bật nhưng có Anthropic
  if (process.env.CHATBOT_LLM === "anthropic" && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL,
          max_tokens: 400,
          system: SYSTEM,
          messages: [{ role: "user", content: `CÂU HỎI: ${question}\n\nDỮ KIỆN:\n${facts}\n\nViết lại phần mở đầu câu trả lời (không liệt kê lại danh sách).` }],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
      return isFaithful(text, facts) ? text : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
