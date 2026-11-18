import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/services/session.service";

const COOKIE = "trovio_chat_guest";
const MAX_AGE = 365 * 24 * 60 * 60;
const secure = process.env.NODE_ENV === "production";

export async function chatQuotaIdentity(userId?: string | null): Promise<{ subject: string; guestToken?: string }> {
  if (userId) return { subject: `user:${userId}` };
  const store = await cookies();
  const existing = verifyToken<{ id: string; typ: string }>(store.get(COOKIE)?.value);
  if (existing?.typ === "chat-guest" && /^[a-f0-9-]{36}$/i.test(existing.id)) return { subject: `guest:${existing.id}` };
  const id = randomUUID();
  return { subject: `guest:${id}`, guestToken: signToken({ id, typ: "chat-guest" }, MAX_AGE) };
}

export function attachChatGuestCookie(response: Response, token?: string): Response {
  if (!token) return response;
  response.headers.append("Set-Cookie", `${COOKIE}=${token}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}
