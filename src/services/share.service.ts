/**
 * SERVICE LAYER — chia sẻ danh sách nguyện vọng cho phụ huynh bằng link chỉ xem.
 *
 * Bảo mật:
 * - id link = 18 byte ngẫu nhiên (144 bit, base64url) → không đoán được; có hạn dùng, thu hồi được.
 * - Mỗi tài khoản chỉ có 1 link đang hoạt động; tạo link mới tự thu hồi link cũ.
 * - Trang xem chỉ lộ tên (không email), danh sách NV; ghi chú và điểm chỉ hiện nếu chủ tài khoản cho phép.
 * - Góp ý không cần tài khoản nên giới hạn độ dài, số lượng mỗi link và tần suất (ở route handler).
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Share, ShareComment, StoredProfile } from "../domain/types";
import { repositories } from "../repositories";
import { programService, type ProgramView } from "./program.service";
import { userDataService } from "./user-data.service";
import { ADMISSION_METHODS, profileMethod, profileScore } from "./scoring.service";

export const SHARE_DAYS = [7, 30] as const;
export const MAX_COMMENTS_PER_SHARE = 30;
const MAX_NAME = 40;
const MAX_MESSAGE = 500;
const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

export interface SharedView {
  ownerName: string;
  expiresAt: string;
  items: { view: ProgramView; note: string | null }[];
  /** Chỉ có khi chủ tài khoản bật "hiện điểm". */
  profile: Pick<StoredProfile, "method" | "combo" | "priorityRegion" | "priorityGroup" | "budgetMax" | "admission"> | null;
  scoreLabel: string | null;
}

const isActive = (s: Share, now = Date.now()) => !s.revokedAt && Date.parse(s.expiresAt) > now;
/** Bỏ ký tự điều khiển, gộp khoảng trắng thừa. */
const cleanText = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);

export const shareService = {
  async getActive(userId: string): Promise<Share | null> {
    const list = await repositories.shares.listByUser(userId);
    return list.filter((s) => isActive(s)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  },

  async create(userId: string, opts: { days?: number; showNotes?: boolean; showScore?: boolean }): Promise<Share> {
    const days = SHARE_DAYS.includes(opts.days as 7 | 30) ? (opts.days as number) : 7;
    await this.revoke(userId);
    const now = new Date();
    return repositories.shares.create({
      id: randomBytes(18).toString("base64url"),
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + days * 86400_000).toISOString(),
      revokedAt: null,
      showNotes: opts.showNotes === true,
      showScore: opts.showScore === true,
    });
  },

  async revoke(userId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const s of await repositories.shares.listByUser(userId)) if (!s.revokedAt) await repositories.shares.update(s.id, { revokedAt: now });
  },

  /** Link hợp lệ còn hạn → dữ liệu chỉ xem; ngược lại null. */
  async resolve(id: string): Promise<Share | null> {
    if (!ID_RE.test(id)) return null;
    const share = await repositories.shares.findById(id);
    return share && isActive(share) ? share : null;
  },

  async view(id: string): Promise<SharedView | null> {
    const share = await this.resolve(id);
    if (!share) return null;
    const owner = await repositories.users.findById(share.userId);
    if (!owner) return null;
    const data = await userDataService.get(owner.id);
    const views = await programService.lookup(data.wishlist.map((w) => w.id));
    const byId = new Map(views.map((v) => [v.program.id, v]));
    const items = data.wishlist
      .map((w) => ({ view: byId.get(w.id), note: share.showNotes ? w.note || null : null }))
      .filter((x): x is { view: ProgramView; note: string | null } => !!x.view);
    const profile = share.showScore && data.profile ? data.profile : null;
    let scoreLabel: string | null = null;
    if (profile) {
      const { method, total } = profileScore(profile);
      scoreLabel = `${total.toFixed(ADMISSION_METHODS[method].decimals)} điểm · ${ADMISSION_METHODS[profileMethod(profile)].short}${profile.combo ? ` · ${profile.combo}` : ""}`;
    }
    return {
      ownerName: owner.name.split(" ").slice(-1)[0] || "Học sinh",
      expiresAt: share.expiresAt,
      items,
      profile: profile
        ? { method: profile.method, combo: profile.combo, priorityRegion: profile.priorityRegion, priorityGroup: profile.priorityGroup, budgetMax: profile.budgetMax, admission: profile.admission }
        : null,
      scoreLabel,
    };
  },

  async addComment(
    id: string,
    input: { name?: unknown; message?: unknown; programId?: unknown },
  ): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
    const share = await this.resolve(id);
    if (!share) return { ok: false, status: 404, message: "Link đã hết hạn hoặc không còn hiệu lực." };
    const name = cleanText(input.name, MAX_NAME);
    const message = cleanText(input.message, MAX_MESSAGE);
    if (name.length < 1) return { ok: false, status: 400, message: "Vui lòng nhập tên hoặc cách xưng hô (VD: Mẹ, Bố)." };
    if (message.length < 2) return { ok: false, status: 400, message: "Vui lòng nhập nội dung góp ý." };
    let programId: string | null = null;
    if (typeof input.programId === "string" && input.programId) {
      const data = await userDataService.get(share.userId);
      if (!data.wishlist.some((w) => w.id === input.programId)) return { ok: false, status: 400, message: "Nguyện vọng không có trong danh sách." };
      programId = input.programId;
    }
    if ((await repositories.comments.countByShare(share.id)) >= MAX_COMMENTS_PER_SHARE) {
      return { ok: false, status: 429, message: "Link này đã nhận đủ số góp ý tối đa." };
    }
    const comment: ShareComment = { id: randomUUID(), shareId: share.id, ownerId: share.userId, name, message, programId, createdAt: new Date().toISOString(), read: false };
    await repositories.comments.add(comment);
    return { ok: true };
  },

  listComments(ownerId: string) {
    return repositories.comments.listByOwner(ownerId);
  },

  deleteComment(ownerId: string, commentId: string) {
    return repositories.comments.delete(commentId, ownerId);
  },

  markRead(ownerId: string) {
    return repositories.comments.markAllRead(ownerId);
  },
};
