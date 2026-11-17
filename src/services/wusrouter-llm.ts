import "server-only";
import { buildLlmSystemPrompt } from "./ai-knowledge-base";

/**
 * WUSROUTER LLM SERVICE
 * Tích hợp API Gateway https://wusrouter.com/v1 (OpenAI-compatible)
 * Đóng vai trò là bộ não AI phân tích sâu sắc cho Trợ lý tuyển sinh TriOVO.
 */

export interface WusRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface WusRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export function getWusRouterApiKey(): string | null {
  return (
    process.env.WUSROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.CHATBOT_API_KEY?.trim() ||
    null
  );
}

export function getWusRouterBaseUrl(): string {
  const url = process.env.WUSROUTER_API_URL?.trim() || "https://wusrouter.com/v1";
  return url.replace(/\/+$/, "");
}

export function getWusRouterModel(): string {
  return process.env.WUSROUTER_MODEL?.trim() || "gpt-4o-mini";
}

/**
 * Kiểm tra xem dịch vụ WusRouter đã được cấu hình khóa API hay chưa.
 */
export function isWusRouterConfigured(): boolean {
  return !!getWusRouterApiKey();
}

/**
 * Gửi yêu cầu hoàn thiện trò chuyện (Chat Completions) đến https://wusrouter.com/v1
 */
export async function sendWusRouterChat(
  messages: WusRouterMessage[],
  options: WusRouterOptions = {},
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const apiKey = getWusRouterApiKey();
  if (!apiKey) {
    return null;
  }

  const baseUrl = getWusRouterBaseUrl();
  const endpoint = `${baseUrl}/chat/completions`;
  const model = options.model || getWusRouterModel();
  const timeoutMs = options.timeoutMs ?? 25000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[wusrouter] API error ${res.status}:`, errText);
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const answer = data.choices?.[0]?.message?.content?.trim();
    return answer || null;
  } catch (err: unknown) {
    if ((err as Error)?.name === "AbortError") {
      console.warn("[wusrouter] Request timeout sau", timeoutMs, "ms");
    } else {
      console.error("[wusrouter] Lỗi kết nối API:", err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tạo câu trả lời chuyên sâu cho học sinh khi hỏi mở rộng hoặc hỏi sâu xa
 * Kết hợp System Prompt từ Knowledge Base và dữ liệu thời gian thực.
 */
export async function answerWithWusRouter(params: {
  question: string;
  specificFacts?: string;
  userScores?: string;
  currentPage?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<string | null> {
  if (!isWusRouterConfigured()) {
    return null;
  }

  const systemContent = buildLlmSystemPrompt({
    specificFacts: params.specificFacts,
    userScores: params.userScores,
    currentPage: params.currentPage,
  });

  const messages: WusRouterMessage[] = [
    { role: "system", content: systemContent },
  ];

  // Bổ sung lịch sử trò chuyện gần nhất (tối đa 4 lượt tương tác gần nhất)
  if (params.history?.length) {
    const recent = params.history.slice(-4);
    for (const h of recent) {
      if (h.role === "user" && h.text) {
        messages.push({ role: "user", content: h.text });
      } else if (h.role === "assistant" && h.text) {
        messages.push({ role: "assistant", content: h.text });
      }
    }
  }

  // Câu hỏi hiện tại
  messages.push({ role: "user", content: params.question });

  return sendWusRouterChat(messages, {
    temperature: 0.6,
    maxTokens: 1500,
  });
}
