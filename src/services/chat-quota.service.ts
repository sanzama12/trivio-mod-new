import "server-only";
import { repositories } from "@database/repositories";
import { CHAT_QUOTA_LIMITS, nextChatQuotaReset, type ChatQuotaBalance, type ChatQuotaKind, type ChatQuotaRecord, type ChatQuotaView } from "@/domain/chat-quota";

function balance(kind: ChatQuotaKind, record: ChatQuotaRecord | null, now: number): ChatQuotaBalance {
  const limit = CHAT_QUOTA_LIMITS[kind];
  const active = record && Date.parse(record.resetsAt) > now && record.used > 0;
  return {
    limit,
    remaining: active ? Math.max(0, limit - record.used) : limit,
    resetsAt: active ? record.resetsAt : kind === "text" ? nextChatQuotaReset(kind, now) : null,
  };
}

export const chatQuotaService = {
  async status(subject: string, now = Date.now()): Promise<ChatQuotaView> {
    const [text, image] = await Promise.all([
      repositories.chatQuota.get(subject, "text"),
      repositories.chatQuota.get(subject, "image"),
    ]);
    return { text: balance("text", text, now), image: balance("image", image, now) };
  },
  async take(subject: string, kind: ChatQuotaKind, now = Date.now()): Promise<ChatQuotaRecord | null> {
    return repositories.chatQuota.take(subject, kind, CHAT_QUOTA_LIMITS[kind], nextChatQuotaReset(kind, now), new Date(now).toISOString());
  },
  async refund(subject: string, kind: ChatQuotaKind, reservation: ChatQuotaRecord): Promise<void> {
    await repositories.chatQuota.refund(subject, kind, reservation.resetsAt);
  },
};
