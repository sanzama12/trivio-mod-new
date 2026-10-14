/**
 * (TUỲ CHỌN, MẶC ĐỊNH TẮT) Diễn đạt lại câu trả lời của chatbot bằng mô hình ngôn ngữ.
 *
 * Bật bằng biến môi trường:
 *   CHATBOT_LLM=anthropic
 *   ANTHROPIC_API_KEY=...
 *   ANTHROPIC_MODEL=<tên model hiện hành, xem https://docs.claude.com/en/docs/about-claude/models>
 *
 * Kiểm soát: mô hình chỉ nhận DỮ KIỆN đã truy xuất; câu trả lời bị loại (dùng bản gốc) nếu
 * - chứa con số không có trong dữ kiện, - chứa đường link, - quá dài, - lỗi/timeout.
 */
import type { ChatAnswer } from "../domain/chat";

const SYSTEM = [
  "Bạn là trợ lý tuyển sinh của Trovio, trả lời học sinh Việt Nam bằng tiếng Việt thân thiện, ngắn gọn (tối đa 4 câu).",
  "CHỈ được diễn đạt lại DỮ KIỆN được cung cấp. Không thêm con số, tên trường, ngày tháng, quy định hay khẳng định mới.",
  "Không dự đoán điểm chuẩn, không hứa hẹn khả năng trúng tuyển. Giữ nguyên mọi con số như trong dữ kiện.",
  "Không chèn đường link. Nếu dữ kiện có ghi chú (minh hoạ, cần đối chiếu), phải giữ ý đó.",
].join("\n");

export function llmEnabled(): boolean {
  return process.env.CHATBOT_LLM === "anthropic" && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
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

/** Kiểm tra câu trả lời của mô hình: mọi con số phải có trong dữ kiện, không có link. */
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
  return [answer.text, ...answer.items.map((i) => `- ${i.title}${i.meta ? `: ${i.meta}` : ""}`), answer.note ? `Ghi chú: ${answer.note}` : ""].filter(Boolean).join("\n");
}

export async function polishWithLlm(question: string, answer: ChatAnswer, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!llmEnabled()) return null;
  const facts = factsOf(answer);
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
