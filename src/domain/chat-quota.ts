export type ChatQuotaKind = "text" | "image";

export const CHAT_QUOTA_LIMITS: Record<ChatQuotaKind, number> = { text: 5, image: 3 };
export const CHAT_IMAGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface ChatQuotaRecord {
  used: number;
  resetsAt: string;
}

export interface ChatQuotaBalance {
  limit: number;
  remaining: number;
  resetsAt: string | null;
}

export type ChatQuotaView = Record<ChatQuotaKind, ChatQuotaBalance>;

export function nextChatQuotaReset(kind: ChatQuotaKind, now: number): string {
  if (kind === "image") return new Date(now + CHAT_IMAGE_WINDOW_MS).toISOString();
  const dayMs = 24 * 60 * 60 * 1000;
  const vietnamOffsetMs = 7 * 60 * 60 * 1000;
  const nextMidnight = (Math.floor((now + vietnamOffsetMs) / dayMs) + 1) * dayMs - vietnamOffsetMs;
  return new Date(nextMidnight).toISOString();
}
