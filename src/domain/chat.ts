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
  return /^https:\/\/[a-z0-9.-]+(\/[^\s]*)?$/i.test(href) ? href : null;
}
