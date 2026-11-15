import "server-only";
import { randomUUID } from "node:crypto";
import { repositories } from "@database/repositories";
import type { AiSource, PublicUser } from "@/domain/types";
import { normalizeVi } from "@/lib/text";

type Fail = { ok: false; field: string; message: string };

const KINDS = ["faq", "note", "link"] as const;

export function validateAiSource(input: Record<string, unknown>): { ok: true; value: { id?: string; title: string; kind: AiSource["kind"]; keywords: string; content: string; url: string | null; enabled: boolean } } | Fail {
  const title = String(input.title ?? "").trim().replace(/\s+/g, " ");
  if (title.length < 3 || title.length > 120) return { ok: false, field: "title", message: "Tiêu đề cần từ 3 đến 120 ký tự." };
  const kind = String(input.kind ?? "") as AiSource["kind"];
  if (!(KINDS as readonly string[]).includes(kind)) return { ok: false, field: "kind", message: "Loại nguồn không hợp lệ." };
  const content = String(input.content ?? "").trim();
  if (!content || content.length > 1500) return { ok: false, field: "content", message: "Nội dung trả lời cần từ 1 đến 1500 ký tự." };
  const keywords = Array.from(new Set(String(input.keywords ?? "").split(/[,\n]/).map((k) => k.trim()).filter(Boolean))).slice(0, 20).join(", ").slice(0, 400);
  if (!keywords) return { ok: false, field: "keywords", message: "Cần ít nhất một từ khoá để trợ lý nhận ra câu hỏi liên quan." };
  const urlRaw = String(input.url ?? "").trim();
  if (urlRaw && !/^https:\/\/[^\s]+$/.test(urlRaw)) return { ok: false, field: "url", message: "Đường dẫn phải bắt đầu bằng https://" };
  if (kind === "link" && !urlRaw) return { ok: false, field: "url", message: "Nguồn dạng đường dẫn cần có địa chỉ https://" };
  const id = typeof input.id === "string" && /^[a-f0-9-]{36}$/i.test(input.id) ? input.id : undefined;
  return { ok: true, value: { id, title, kind, keywords, content, url: urlRaw || null, enabled: input.enabled !== false } };
}

/** Chọn nguồn khớp nhất với câu hỏi; trả null nếu không đủ chắc chắn để tránh trả lời lạc đề. */
export function matchAiSource<T extends Pick<AiSource, "keywords" | "title" | "enabled">>(question: string, sources: T[]): T | null {
  const q = ` ${normalizeVi(question).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  const qWords = new Set(q.trim().split(" ").filter((w) => w.length >= 3));
  let best: { source: T; score: number } | null = null;
  for (const source of sources) {
    if (!source.enabled) continue;
    let score = 0;
    for (const raw of source.keywords.split(",")) {
      const kw = normalizeVi(raw).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      if (kw.length < 3) continue;
      if (q.includes(` ${kw} `)) score += 3 + kw.split(" ").length;
    }
    const titleWords = normalizeVi(source.title).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w) => w.length >= 4);
    score += titleWords.filter((w) => qWords.has(w)).length >= 2 ? 1 : 0;
    if (score >= 4 && (!best || score > best.score)) best = { source, score };
  }
  return best?.source ?? null;
}

export const aiSourceService = {
  list: () => repositories.aiSources.list(false),

  /** Nguồn khớp với câu hỏi mà bộ trả lời có cấu trúc chưa có dữ liệu; ghi nhận lượt dùng. */
  async answerFor(question: string): Promise<AiSource | null> {
    const found = matchAiSource(question, await repositories.aiSources.list(true));
    if (found) await repositories.aiSources.addHit(found.id).catch(() => undefined);
    return found;
  },

  async save(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; source: AiSource } | Fail> {
    const parsed = validateAiSource(input);
    if (!parsed.ok) return parsed;
    const source = await repositories.aiSources.upsert(parsed.value, actor.id);
    if (!source) return { ok: false, field: "id", message: "Không tìm thấy nguồn cần sửa." };
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: source.id,
      targetType: "chat-alias",
      action: parsed.value.id ? "update" : "create",
      changes: [{ field: "Nguồn thông tin AI", before: parsed.value.id ? "đã có" : "chưa có", after: source.title }],
    });
    return { ok: true, source };
  },

  async remove(actor: PublicUser, id: string): Promise<boolean> {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !(await repositories.aiSources.remove(id))) return false;
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      targetType: "chat-alias",
      action: "delete",
      changes: [{ field: "Nguồn thông tin AI", before: "đã có", after: "đã xoá" }],
    });
    return true;
  },
};
