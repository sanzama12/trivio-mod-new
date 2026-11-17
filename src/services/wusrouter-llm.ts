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

  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${getWusRouterBaseUrl()}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "TriOVO-Portal/1.0",
        },
        body: JSON.stringify({
          model: options.model || getWusRouterModel(),
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 240,
        }),
      });

      if (!res.ok) {
        if (res.status >= 500 && attempt < maxRetries) {
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.warn(`[wusrouter] API returned ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (!answer || /^upstream temporarily unavailable|^service unavailable|^please retry/i.test(answer)) {
        return null;
      }
      return answer;
    } catch (error) {
      if (attempt < maxRetries) {
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.warn("[wusrouter] Request failed:", error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

export async function answerWithWusRouter(params: {
  question: string;
  evidence?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!isWusRouterConfigured()) return null;

  const systemContent = buildLlmSystemPrompt({
    evidence: params.evidence,
  });

  const messages: WusRouterMessage[] = [
    { role: "system", content: systemContent },
  ];

  if (params.history?.length) {
    for (const h of params.history.slice(-4)) {
      if (h.role === "user" && h.text) {
        messages.push({ role: "user", content: h.text });
      } else if (h.role === "assistant" && h.text) {
        messages.push({ role: "assistant", content: h.text });
      }
    }
  }

  messages.push({ role: "user", content: params.question });

  return sendWusRouterChat(messages, {
    temperature: 0.4,
    maxTokens: 750,
  }, fetchImpl);
}
