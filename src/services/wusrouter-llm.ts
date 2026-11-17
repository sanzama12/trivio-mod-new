import "server-only";
import { buildLlmSystemPrompt } from "./ai-knowledge-base";

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
  return process.env.WUSROUTER_API_KEY?.trim() || null;
}

export function getWusRouterBaseUrl(): string {
  const url = process.env.WUSROUTER_API_URL?.trim() || "https://wusrouter.com/v1";
  return url.replace(/\/+$/, "");
}

export function getWusRouterModel(): string {
  return process.env.WUSROUTER_MODEL?.trim() || "deepseek-v4.1-flash";
}

export function isWusRouterConfigured(): boolean {
  return !!getWusRouterApiKey();
}

export async function sendWusRouterChat(
  messages: WusRouterMessage[],
  options: WusRouterOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const apiKey = getWusRouterApiKey();
  if (!apiKey) return null;

  const timeoutMs = options.timeoutMs ?? 7000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${getWusRouterBaseUrl()}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model || getWusRouterModel(),
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 240,
      }),
    });
    if (!res.ok) {
      console.warn(`[wusrouter] API returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer || /^upstream temporarily unavailable|^service unavailable|^please retry/i.test(answer)) return null;
    return answer;
  } catch (error) {
    console.warn("[wusrouter] Request failed:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function answerWithWusRouter(params: {
  question: string;
  evidence: string;
}, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const text = await sendWusRouterChat([
    { role: "system", content: buildLlmSystemPrompt() },
    { role: "user", content: `Câu hỏi: ${params.question}\n\nTài liệu đã truy xuất:\n${params.evidence}` },
  ], { maxTokens: 240 }, fetchImpl);
  return text;
}
