/**
 * DOMAIN — kiểu dữ liệu dùng chung giữa chatbot (server) và khung chat (client). Không phụ thuộc framework.
 */
export const MAX_QUESTION = 300;

export type ChatKind = "answer" | "refusal" | "clarify" | "unknown";

export interface ChatItem {
  title: string;
  meta?: string;
  href?: string;
  /** Có id chương trình → khung chat hiện nút Lưu / So sánh ngay tại chỗ. */
  programId?: string;
}

export interface ChatSource {
  label: string;
  href: string;
  external?: boolean;
}

export interface ChatAnswer {
  kind: ChatKind;
  intent: string;
  text: string;
  items: ChatItem[];
  sources: ChatSource[];
  suggestions: string[];
  /** Ghi chú bắt buộc (VD: số liệu minh hoạ, không dự đoán). */
  note?: string;
  context: { majorId?: string; schoolId?: string };
  /** true nếu câu chữ đã được LLM diễn đạt lại (đã qua kiểm tra số liệu). */
  polished?: boolean;
}

/** Keep Vietnamese and ordinary punctuation, removing invisible/control characters and broken Unicode. */
export function cleanChatText(text: string): string {
  return text.normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufffd]/g, " ")
    .replace(/[\u00a0\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanChatAnswer(answer: ChatAnswer): ChatAnswer {
  return {
    ...answer,
    text: cleanChatText(answer.text),
    note: answer.note ? cleanChatText(answer.note) : undefined,
    items: answer.items.map((item) => ({ ...item, title: cleanChatText(item.title), meta: item.meta ? cleanChatText(item.meta) : undefined })),
    sources: answer.sources.map((source) => ({ ...source, label: cleanChatText(source.label) })),
    suggestions: answer.suggestions.map(cleanChatText).filter(Boolean),
  };
}

export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  at: string;
  text?: string;
  answer?: ChatAnswer;
  logId?: string | null;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatHistoryMessage[];
}

/** DTO lịch sử gửi ra client; không lộ chủ sở hữu. */
export type ChatConversationView = Omit<ChatConversation, "userId">;

/** Chỉ cho phép link nội bộ ("/…") hoặc https — phòng thủ khi hiển thị link do server trả về. */
export function safeChatHref(href: unknown): string | null {
  if (typeof href !== "string" || href.length > 500) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password && !/\s/.test(href) ? href : null;
  } catch {
    return null;
  }
}
