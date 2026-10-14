/**
 * SERVICE LAYER — cảm nhận sinh viên theo trường, KIỂM DUYỆT TRƯỚC khi hiển thị.
 *
 * Luồng: gửi (tài khoản đã xác thực email) → bộ lọc tự động gắn cờ → hàng chờ kiểm duyệt →
 * quản trị viên duyệt / từ chối (kèm lý do) → hiển thị công khai. Người dùng báo cáo ≥ 3 lần
 * → tự ẩn và quay lại hàng chờ. Mọi thao tác kiểm duyệt ghi nhật ký.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, ReviewCriterion, SchoolReview } from "../domain/types";
import { REJECT_REASONS, REPORT_REASONS, REVIEW_CRITERIA, REVIEW_LIMITS, type RejectReason, type ReportReason } from "../domain/reviews";
import { repositories } from "../repositories";
import { notificationService } from "./notification.service";
import { normalizeVi } from "../lib/text";

export const REPORTS_TO_HIDE = 3;
const CRITERIA = Object.keys(REVIEW_CRITERIA) as ReviewCriterion[];

export interface PublicReview {
  id: string;
  authorName: string;
  relation: SchoolReview["relation"];
  cohort: number | null;
  majorName: string | null;
  ratings: Record<ReviewCriterion, number>;
  overall: number;
  title: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  viewerHelpful: boolean;
  schoolEmail: boolean;
  demo: boolean;
  mine: boolean;
}

export interface ReviewSummary {
  count: number;
  overall: number | null;
  byCriterion: Record<ReviewCriterion, number | null>;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

type Fail = { ok: false; status: number; field?: string; message: string };

const round1 = (n: number) => Math.round(n * 10) / 10;
const overallOf = (r: Pick<SchoolReview, "ratings">) => round1(CRITERIA.reduce((s, c) => s + r.ratings[c], 0) / CRITERIA.length);
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

/** "Nguyễn Văn An" → "An N." (không lộ họ tên đầy đủ). */
export function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Người dùng";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

/** Email thuộc tên miền của trường (VD: st.ueh.edu.vn thuộc ueh.edu.vn). */
export function isSchoolEmail(email: string, website: string): boolean {
  try {
    const host = new URL(website).hostname.replace(/^www\./, "").replace(/^daihoc\./, "");
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    return !!domain && (domain === host || domain.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

const PROFANITY = ["dm", "dmm", "dcm", "dkm", "vcl", "vkl", "clgt", "cmm", "djt", "occho", "oc cho", "do ngu", "ngu nhu bo", "cho chet"];
const ADS = ["inbox", "ib minh", "gia re", "mua ban", "khuyen mai", "zalo", "lam ho", "ban tai lieu", "chiet khau", "dich vu"];
const ACCUSE = ["lua dao", "tham nhung", "an tien", "hoi lo", "ban diem", "rac ruoi", "vo dung", "te nhat"];

/** Bộ lọc tự động: chỉ GẮN CỜ để người kiểm duyệt chú ý, không tự duyệt/từ chối. */
export function screenReview(title: string, content: string): string[] {
  const raw = `${title}\n${content}`;
  const norm = ` ${normalizeVi(raw).replace(/[^a-z0-9]+/g, " ")} `;
  const has = (list: string[]) => list.some((w) => norm.includes(` ${w} `));
  const flags = new Set<string>();
  if (/(\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/.test(raw) || /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(raw) || /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|vn|net|org|io|xyz|info|me)\b)/i.test(raw)) {
    flags.add("lien-he");
  }
  if (has(ADS)) flags.add("quang-cao");
  if (has(PROFANITY)) flags.add("ngon-tu");
  if (has(ACCUSE)) flags.add("cong-kich");
  // Danh xưng + tên riêng viết hoa (VD: "Thầy Nam", "cô Lan", "TS. Hùng") → có thể nêu tên giảng viên.
  if (/(?<!\p{L})(?:[Tt]hầy|[Cc]ô|[Gg]iảng viên|[Gg][Vv]|[Pp]?[Gg][Ss]\.?|[Tt][Ss]\.?)\s+\p{Lu}\p{Ll}+/u.test(raw.normalize("NFC"))) flags.add("nhac-ten");
  const letters = raw.replace(/[^A-Za-zÀ-ỹĐđ]/g, "");
  if (letters.length >= 20 && letters.replace(/[^A-ZÀ-ỸĐ]/g, "").length / letters.length > 0.6) flags.add("viet-hoa");
  if (/(.)\1{5,}/u.test(raw)) flags.add("lap-ky-tu");
  return [...flags];
}

async function majorNames() {
  return new Map((await repositories.majors.findAll()).map((m) => [m.id, m.name]));
}

function toPublic(r: SchoolReview, majors: Map<string, string>, viewerId?: string | null): PublicReview {
  return {
    id: r.id,
    authorName: r.anonymous ? "Ẩn danh" : r.authorName,
    relation: r.relation,
    cohort: r.cohort,
    majorName: r.majorId ? (majors.get(r.majorId) ?? null) : null,
    ratings: r.ratings,
    overall: overallOf(r),
    title: r.title,
    content: r.content,
    createdAt: r.createdAt,
    helpfulCount: r.helpful.length,
    viewerHelpful: !!viewerId && r.helpful.includes(viewerId),
    schoolEmail: r.schoolEmail,
    demo: !!r.demo,
    mine: !!viewerId && r.userId === viewerId,
  };
}

export function summarize(reviews: Pick<SchoolReview, "ratings">[]): ReviewSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary["distribution"];
  if (reviews.length === 0) {
    return { count: 0, overall: null, byCriterion: Object.fromEntries(CRITERIA.map((c) => [c, null])) as ReviewSummary["byCriterion"], distribution };
  }
  for (const r of reviews) distribution[Math.min(5, Math.max(1, Math.round(overallOf(r)))) as 1 | 2 | 3 | 4 | 5] += 1;
  const byCriterion = Object.fromEntries(CRITERIA.map((c) => [c, round1(reviews.reduce((s, r) => s + r.ratings[c], 0) / reviews.length)])) as ReviewSummary["byCriterion"];
  return { count: reviews.length, overall: round1(reviews.reduce((s, r) => s + overallOf(r), 0) / reviews.length), byCriterion, distribution };
}

export const reviewService = {
  /**
   * Cảm nhận đã duyệt + tổng hợp điểm của một trường.
   * Lọc theo ngành (`majorId`) và/hoặc năm nhập học (`cohort`); `facets` liệt kê các giá trị có dữ liệu để dựng bộ lọc.
   * `summary` luôn là của cả trường; `filtered` là tổng hợp riêng của tập đang lọc (null nếu không lọc).
   */
  async listPublic(
    schoolId: string,
    opts: { sort?: "moi-nhat" | "huu-ich"; viewerId?: string | null; majorId?: string | null; cohort?: number | null } = {},
  ) {
    const [all, majors] = await Promise.all([repositories.reviews.listBySchool(schoolId), majorNames()]);
    const approved = all.filter((r) => r.status === "approved");
    const majorId = opts.majorId && majors.has(opts.majorId) ? opts.majorId : null;
    const cohort = Number.isInteger(opts.cohort) ? (opts.cohort as number) : null;
    const active = majorId !== null || cohort !== null;
    const matched = approved.filter((r) => (majorId === null || r.majorId === majorId) && (cohort === null || r.cohort === cohort));
    const sorted = [...matched].sort((a, b) =>
      opts.sort === "huu-ich" ? b.helpful.length - a.helpful.length || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt),
    );
    const count = <K extends string | number>(keys: (K | null)[]) => {
      const m = new Map<K, number>();
      for (const k of keys) if (k !== null) m.set(k, (m.get(k) ?? 0) + 1);
      return m;
    };
    const facets = {
      majors: [...count(approved.map((r) => r.majorId))]
        .filter(([id]) => majors.has(id))
        .map(([id, n]) => ({ id, name: majors.get(id)!, count: n }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi")),
      cohorts: [...count(approved.map((r) => r.cohort))].map(([year, n]) => ({ year, count: n })).sort((a, b) => b.year - a.year),
    };
    return {
      summary: summarize(approved),
      filtered: active ? summarize(matched) : null,
      filter: { majorId, cohort },
      facets,
      items: sorted.map((r) => toPublic(r, majors, opts.viewerId)),
    };
  },

  /** Cảm nhận của chính người dùng (kể cả đang chờ / bị từ chối). */
  async mine(userId: string, schoolId: string) {
    const r = await repositories.reviews.findByUserAndSchool(userId, schoolId);
    if (!r) return null;
    return {
      ...toPublic(r, await majorNames(), userId),
      status: r.status,
      rejectReason: r.rejectReason,
      anonymous: r.anonymous,
      majorId: r.majorId,
    };
  },

  async submit(user: PublicUser, schoolId: string, input: Record<string, unknown>): Promise<{ ok: true; status: "pending"; updated: boolean } | Fail> {
    if (!user.verified) return { ok: false, status: 403, message: "Vui lòng xác thực email trước khi viết cảm nhận." };
    const school = await repositories.schools.findById(schoolId);
    if (!school) return { ok: false, status: 404, message: "Không tìm thấy trường." };

    const ratingsIn = (input.ratings ?? {}) as Record<string, unknown>;
    const ratings = {} as Record<ReviewCriterion, number>;
    for (const c of CRITERIA) {
      const v = Number(ratingsIn[c]);
      if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, status: 400, field: "ratings", message: `Vui lòng chấm “${REVIEW_CRITERIA[c]}” từ 1 đến 5 sao.` };
      ratings[c] = v;
    }
    const title = clean(input.title, REVIEW_LIMITS.titleMax);
    const content = clean(input.content, REVIEW_LIMITS.contentMax);
    if (title.length < REVIEW_LIMITS.titleMin) return { ok: false, status: 400, field: "title", message: `Tiêu đề cần ít nhất ${REVIEW_LIMITS.titleMin} ký tự.` };
    if (content.length < REVIEW_LIMITS.contentMin) {
      return { ok: false, status: 400, field: "content", message: `Nội dung cần ít nhất ${REVIEW_LIMITS.contentMin} ký tự để hữu ích cho người đọc.` };
    }
    const relation: SchoolReview["relation"] | null = input.relation === "cuu-sinh-vien" ? "cuu-sinh-vien" : input.relation === "sinh-vien" ? "sinh-vien" : null;
    if (!relation) return { ok: false, status: 400, field: "relation", message: "Vui lòng chọn bạn là sinh viên hay cựu sinh viên." };
    const year = new Date().getFullYear();
    const cohort = input.cohort === null || input.cohort === undefined || input.cohort === "" ? null : Number(input.cohort);
    if (cohort !== null && (!Number.isInteger(cohort) || cohort < 1990 || cohort > year)) {
      return { ok: false, status: 400, field: "cohort", message: `Năm nhập học phải từ 1990 đến ${year}.` };
    }
    let majorId: string | null = null;
    if (typeof input.majorId === "string" && input.majorId) {
      const offered = new Set((await repositories.programs.findBySchool(schoolId)).map((p) => p.majorId));
      if (!offered.has(input.majorId)) return { ok: false, status: 400, field: "majorId", message: "Ngành không thuộc trường này." };
      majorId = input.majorId;
    }
    const now = new Date().toISOString();
    const base = {
      authorName: displayName(user.name),
      anonymous: input.anonymous === true,
      relation,
      cohort,
      majorId,
      ratings,
      title,
      content,
      status: "pending" as const,
      flags: screenReview(title, content),
      rejectReason: null,
      updatedAt: now,
      moderatedAt: null,
      moderatedBy: null,
      reports: [] as SchoolReview["reports"],
      schoolEmail: isSchoolEmail(user.email, school.website),
    } satisfies Partial<SchoolReview>;
    const existing = await repositories.reviews.findByUserAndSchool(user.id, schoolId);
    if (existing) {
      // Sửa cảm nhận → quay lại hàng chờ duyệt.
      await repositories.reviews.update(existing.id, base);
      return { ok: true, status: "pending", updated: true };
    }
    await repositories.reviews.create({ ...base, id: `r-${randomUUID()}`, schoolId, userId: user.id, createdAt: now, helpful: [] });
    return { ok: true, status: "pending", updated: false };
  },

  async withdraw(userId: string, schoolId: string): Promise<boolean> {
    const r = await repositories.reviews.findByUserAndSchool(userId, schoolId);
    return r ? repositories.reviews.delete(r.id) : false;
  },

  async toggleHelpful(userId: string, reviewId: string): Promise<{ ok: true; helpful: boolean; count: number } | Fail> {
    const r = await repositories.reviews.findById(reviewId);
    if (!r || r.status !== "approved") return { ok: false, status: 404, message: "Không tìm thấy cảm nhận." };
    if (r.userId === userId) return { ok: false, status: 400, message: "Không thể tự đánh dấu hữu ích cho cảm nhận của mình." };
    const on = !r.helpful.includes(userId);
    const helpful = on ? [...r.helpful, userId] : r.helpful.filter((u) => u !== userId);
    await repositories.reviews.update(r.id, { helpful });
    return { ok: true, helpful: on, count: helpful.length };
  },

  /**
   * Báo cáo vi phạm — cần tài khoản đã xác thực email (chống giả mạo IP để ẩn hàng loạt).
   * Mỗi tài khoản báo cáo 1 lần; đủ REPORTS_TO_HIDE tài khoản khác nhau → tự ẩn, chờ kiểm duyệt lại.
   */
  async report(reviewId: string, reporter: Pick<PublicUser, "id" | "verified">, reason: unknown): Promise<{ ok: true; hidden: boolean } | Fail> {
    if (!reporter.verified) return { ok: false, status: 403, message: "Vui lòng xác thực email trước khi báo cáo." };
    if (typeof reason !== "string" || !(reason in REPORT_REASONS)) return { ok: false, status: 400, message: "Vui lòng chọn lý do báo cáo." };
    const r = await repositories.reviews.findById(reviewId);
    if (!r || r.status !== "approved") return { ok: false, status: 404, message: "Không tìm thấy cảm nhận." };
    if (r.userId === reporter.id) return { ok: false, status: 400, message: "Không thể báo cáo cảm nhận của chính bạn." };
    if (r.reports.some((x) => x.by === reporter.id)) return { ok: true, hidden: false };
    const reports = [...r.reports, { by: reporter.id, reason: reason as ReportReason, at: new Date().toISOString() }];
    const hide = reports.length >= REPORTS_TO_HIDE;
    await repositories.reviews.update(r.id, {
      reports,
      ...(hide ? { status: "hidden" as const, flags: Array.from(new Set([...r.flags, "bi-bao-cao"])) } : {}),
    });
    return { ok: true, hidden: hide };
  },

  /** Hàng chờ kiểm duyệt: chờ duyệt + bị ẩn do báo cáo (cũ nhất trước). */
  async queue() {
    const [items, schools, majors] = await Promise.all([repositories.reviews.listByStatus(["pending", "hidden"]), repositories.schools.findAll(), majorNames()]);
    const schoolName = new Map(schools.map((s) => [s.id, s.shortName]));
    return items
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .map((r) => ({
        ...toPublic(r, majors),
        authorName: r.anonymous ? `Ẩn danh (hiển thị) · ${r.authorName}` : r.authorName,
        status: r.status,
        flags: r.flags,
        reports: r.reports.map((x) => ({ reason: x.reason, at: x.at })),
        schoolId: r.schoolId,
        schoolName: schoolName.get(r.schoolId) ?? r.schoolId,
      }));
  },

  async queueCount(): Promise<number> {
    return (await repositories.reviews.listByStatus(["pending", "hidden"])).length;
  },

  async recentModerated(limit = 20) {
    const [items, schools] = await Promise.all([repositories.reviews.listByStatus(["approved", "rejected"]), repositories.schools.findAll()]);
    const schoolName = new Map(schools.map((s) => [s.id, s.shortName]));
    return items
      .filter((r) => r.moderatedAt)
      .sort((a, b) => (b.moderatedAt ?? "").localeCompare(a.moderatedAt ?? ""))
      .slice(0, limit)
      .map((r) => ({ id: r.id, title: r.title, status: r.status, rejectReason: r.rejectReason, moderatedAt: r.moderatedAt, schoolName: schoolName.get(r.schoolId) ?? r.schoolId }));
  },

  async moderate(admin: PublicUser, reviewId: string, action: unknown, reason?: unknown): Promise<{ ok: true } | Fail> {
    const r = await repositories.reviews.findById(reviewId);
    if (!r) return { ok: false, status: 404, message: "Không tìm thấy cảm nhận." };
    if (action !== "approve" && action !== "reject") return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
    if (action === "reject" && (typeof reason !== "string" || !(reason in REJECT_REASONS))) {
      return { ok: false, status: 400, message: "Vui lòng chọn lý do từ chối." };
    }
    const now = new Date().toISOString();
    const before = r.status;
    await repositories.reviews.update(r.id, {
      status: action === "approve" ? "approved" : "rejected",
      rejectReason: action === "reject" ? REJECT_REASONS[reason as RejectReason] : null,
      moderatedAt: now,
      moderatedBy: admin.id,
      // Duyệt lại cảm nhận bị ẩn → xoá báo cáo cũ để không bị ẩn ngay lập tức.
      ...(action === "approve" ? { reports: [] } : {}),
    });
    await repositories.audit.append({
      id: randomUUID(),
      at: now,
      actorId: admin.id,
      actorEmail: admin.email,
      programId: r.id,
      targetType: "review",
      action: action === "approve" ? "approve" : "reject",
      changes: [
        { field: "status", before, after: action === "approve" ? "approved" : "rejected" },
        ...(action === "reject" ? [{ field: "reason", before: "—", after: REJECT_REASONS[reason as RejectReason] }] : []),
      ],
    });
    // Báo cho người viết (chuông thông báo + email). Cảm nhận minh hoạ không có tài khoản thật → bỏ qua.
    if (!r.demo) {
      const school = await repositories.schools.findById(r.schoolId);
      const where = school?.shortName ?? "trường";
      await notificationService.notify(
        action === "approve"
          ? { userId: r.userId, kind: "review-approved", title: `Cảm nhận về ${where} đã được duyệt`, body: `“${r.title}” đang hiển thị công khai. Cảm ơn bạn đã chia sẻ!`, href: school ? `/truong/${school.slug}` : null, email: true }
          : {
              userId: r.userId,
              kind: "review-rejected",
              title: `Cảm nhận về ${where} chưa được duyệt`,
              body: `Lý do: ${REJECT_REASONS[reason as RejectReason]}. Bạn có thể sửa và gửi lại ở trang trường.`,
              href: school ? `/truong/${school.slug}` : null,
              email: true,
            },
      );
    }
    return { ok: true };
  },
};
