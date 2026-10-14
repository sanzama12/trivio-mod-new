/**
 * SERVICE LAYER — kết nối với người thật (bản gọn):
 * 1) Hỏi sinh viên đang học: học sinh hỏi (ẩn danh), chỉ tài khoản đăng ký bằng email của chính trường đó mới trả lời;
 *    câu hỏi & câu trả lời đều qua kiểm duyệt trước khi hiện.
 * 2) Khảo sát hài lòng sau 1 năm học: chỉ công bố tổng hợp khi đủ ≥ 20 phản hồi.
 */
import { randomUUID } from "node:crypto";
import type { OutcomeSurvey, PublicUser, QaQuestion } from "../domain/types";
import { repositories } from "../repositories";
import { displayName, isSchoolEmail, screenReview } from "./review.service";
import { notificationService } from "./notification.service";

type Fail = { ok: false; status: number; field?: string; message: string };

export const QA_MIN = 10;
export const QA_MAX = 300;
export const ANSWER_MAX = 800;
export const SURVEY_MIN_PUBLIC = 20;

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

/** Che email / số điện thoại / link trong nội dung công khai. */
export function redactContacts(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[đã ẩn email]")
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/g, "[đã ẩn số điện thoại]")
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[đã ẩn đường dẫn]");
}

export interface PublicQuestion {
  id: string;
  text: string;
  createdAt: string;
  demo: boolean;
  mine: boolean;
  status: QaQuestion["status"];
  answers: { id: string; displayName: string; schoolDomain: string; text: string; createdAt: string; helpful: number; votedHelpful: boolean; reported: boolean }[];
}

/** Số báo cáo khác nhau để câu trả lời tự ẩn và quay lại hàng chờ kiểm duyệt. */
export const ANSWER_REPORT_HIDE = 3;

async function schoolOfProgram(programId: string) {
  const program = await repositories.programs.findById(programId);
  if (!program) return null;
  const school = await repositories.schools.findById(program.schoolId);
  return school ? { program, school } : null;
}

export const qaService = {
  /** Câu hỏi đã duyệt (kèm câu trả lời đã duyệt) + câu hỏi đang chờ của chính người xem. */
  async listForProgram(programId: string, viewerId: string | null): Promise<PublicQuestion[]> {
    const all = await repositories.qa.listByProgram(programId);
    return all
      .filter((q) => q.status === "approved" || (viewerId && q.userId === viewerId && q.status === "pending"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((q) => ({
        id: q.id,
        text: q.text,
        createdAt: q.createdAt,
        demo: !!q.demo,
        mine: !!viewerId && q.userId === viewerId,
        status: q.status,
        answers: q.answers
          .filter((a) => a.status === "approved")
          .map((a) => ({
            id: a.id,
            displayName: a.displayName,
            schoolDomain: a.schoolDomain,
            text: a.text,
            createdAt: a.createdAt,
            helpful: a.helpful,
            votedHelpful: !!viewerId && !!a.helpfulBy?.includes(viewerId),
            reported: !!viewerId && !!a.reportedBy?.includes(viewerId),
          })),
      }));
  },

  /** Tài khoản có được trả lời câu hỏi của chương trình này không (email thuộc tên miền trường, đã xác thực). */
  async canAnswer(user: PublicUser | null, programId: string): Promise<{ ok: boolean; domain: string | null }> {
    const ctx = await schoolOfProgram(programId);
    if (!ctx) return { ok: false, domain: null };
    const domain = new URL(ctx.school.website).hostname.replace(/^www\./, "");
    return { ok: !!user && user.verified && !user.locked && isSchoolEmail(user.email, ctx.school.website), domain };
  },

  async ask(user: PublicUser | null, programId: string, input: Record<string, unknown>): Promise<{ ok: true; id: string } | Fail> {
    if (!(await schoolOfProgram(programId))) return { ok: false, status: 404, message: "Không tìm thấy chương trình." };
    const text = clean(input.text, QA_MAX + 1);
    if (text.length < QA_MIN) return { ok: false, status: 400, field: "text", message: `Câu hỏi cần ít nhất ${QA_MIN} ký tự.` };
    if (text.length > QA_MAX) return { ok: false, status: 400, field: "text", message: `Câu hỏi tối đa ${QA_MAX} ký tự.` };
    const q: QaQuestion = { id: `qa-${randomUUID()}`, programId, userId: user?.id ?? null, text: redactContacts(text), createdAt: new Date().toISOString(), status: "pending", answers: [] };
    await repositories.qa.create(q);
    return { ok: true, id: q.id };
  },

  async answer(user: PublicUser, questionId: string, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    const q = await repositories.qa.findById(questionId);
    if (!q || q.status !== "approved") return { ok: false, status: 404, message: "Không tìm thấy câu hỏi." };
    const perm = await this.canAnswer(user, q.programId);
    if (!perm.ok) return { ok: false, status: 403, message: `Chỉ sinh viên dùng email trường (${perm.domain ?? "tên miền của trường"}) mới trả lời được.` };
    if (q.answers.some((a) => a.userId === user.id && a.status !== "rejected")) return { ok: false, status: 409, message: "Bạn đã trả lời câu hỏi này." };
    const text = clean(input.text, ANSWER_MAX + 1);
    if (text.length < 20) return { ok: false, status: 400, field: "text", message: "Câu trả lời cần ít nhất 20 ký tự." };
    if (text.length > ANSWER_MAX) return { ok: false, status: 400, field: "text", message: `Câu trả lời tối đa ${ANSWER_MAX} ký tự.` };
    await repositories.qa.update(questionId, (cur) => ({
      ...cur,
      answers: [
        ...cur.answers,
        {
          id: `ans-${randomUUID()}`,
          userId: user.id,
          displayName: displayName(user.name),
          schoolDomain: user.email.split("@")[1]?.toLowerCase() ?? "",
          text: redactContacts(text),
          createdAt: new Date().toISOString(),
          status: "pending",
          helpful: 0,
        },
      ],
    }));
    return { ok: true };
  },

  /** "Hữu ích" (bật/tắt) hoặc "Báo cáo" một câu trả lời đã duyệt. Người viết không tự bấm cho mình. */
  async voteAnswer(user: PublicUser, questionId: string, answerId: string, action: unknown): Promise<{ ok: true; helpful: number; votedHelpful: boolean; hidden: boolean } | Fail> {
    if (action !== "helpful" && action !== "report") return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
    const q = await repositories.qa.findById(questionId);
    const a = q?.answers.find((x) => x.id === answerId && x.status === "approved");
    if (!q || q.status !== "approved" || !a) return { ok: false, status: 404, message: "Không tìm thấy câu trả lời." };
    if (a.userId === user.id) return { ok: false, status: 400, message: "Bạn không thể tự đánh giá câu trả lời của mình." };
    if (action === "report" && a.reportedBy?.includes(user.id)) return { ok: false, status: 409, message: "Bạn đã báo cáo câu trả lời này." };
    let result = { helpful: a.helpful, votedHelpful: !!a.helpfulBy?.includes(user.id), hidden: false };
    await repositories.qa.update(questionId, (cur) => ({
      ...cur,
      answers: cur.answers.map((x) => {
        if (x.id !== answerId) return x;
        if (action === "helpful") {
          const voted = x.helpfulBy?.includes(user.id) ?? false;
          const helpfulBy = voted ? (x.helpfulBy ?? []).filter((u) => u !== user.id) : [...(x.helpfulBy ?? []), user.id];
          const helpful = Math.max(0, x.helpful + (voted ? -1 : 1));
          result = { helpful, votedHelpful: !voted, hidden: false };
          return { ...x, helpfulBy, helpful };
        }
        const reportedBy = [...(x.reportedBy ?? []), user.id];
        const hidden = reportedBy.length >= ANSWER_REPORT_HIDE;
        result = { ...result, hidden };
        return { ...x, reportedBy, status: hidden ? "pending" : x.status };
      }),
    }));
    return { ok: true, ...result };
  },

  /** Số việc chờ duyệt (câu hỏi + câu trả lời) cho huy hiệu trên thanh quản trị. */
  async pendingCount(): Promise<number> {
    const all = await repositories.qa.list();
    return all.reduce((n, q) => n + (q.status === "pending" ? 1 : 0) + q.answers.filter((a) => a.status === "pending").length, 0);
  },

  /** Hàng đợi kiểm duyệt cho quản trị viên. */
  async pending() {
    const all = await repositories.qa.list();
    const programs = await repositories.programs.findAll();
    const name = (id: string) => programs.find((p) => p.id === id)?.name ?? id;
    return all
      .filter((q) => q.status === "pending" || q.answers.some((a) => a.status === "pending"))
      .map((q) => ({ ...q, programName: name(q.programId), flags: screenReview("", q.text), answers: q.answers.map((a) => ({ ...a, flags: screenReview("", a.text) })) }));
  },

  async moderate(admin: PublicUser, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    const qid = typeof input.questionId === "string" ? input.questionId : "";
    const aid = typeof input.answerId === "string" ? input.answerId : null;
    const action = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : null;
    if (!qid || !action) return { ok: false, status: 400, message: "Yêu cầu không hợp lệ." };
    const q = await repositories.qa.findById(qid);
    if (!q) return { ok: false, status: 404, message: "Không tìm thấy câu hỏi." };
    if (aid && !q.answers.some((a) => a.id === aid)) return { ok: false, status: 404, message: "Không tìm thấy câu trả lời." };
    await repositories.qa.update(qid, (cur) => (aid ? { ...cur, answers: cur.answers.map((a) => (a.id === aid ? { ...a, status: action } : a)) } : { ...cur, status: action }));
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: admin.id,
      actorEmail: admin.email,
      programId: q.programId,
      targetType: "review",
      action: action === "approved" ? "approve" : "reject",
      changes: [{ field: aid ? "Câu trả lời hỏi đáp" : "Câu hỏi hỏi đáp", before: "Chờ duyệt", after: action === "approved" ? "Đã duyệt" : "Từ chối" }],
    });
    // Báo cho người hỏi khi có câu trả lời được duyệt.
    if (aid && action === "approved" && q.userId) {
      const program = await repositories.programs.findById(q.programId);
      await notificationService.notify({
        userId: q.userId,
        kind: "qa-answer",
        title: "Sinh viên đã trả lời câu hỏi của bạn",
        body: `Câu hỏi về ${program?.name ?? "chương trình"}: “${q.text.slice(0, 80)}${q.text.length > 80 ? "…" : ""}”`,
        href: program ? `/chuong-trinh/${program.slug}#hoi-sinh-vien` : null,
      });
    }
    return { ok: true };
  },
};

export interface SurveyStats {
  n: number;
  /** Chưa đủ số phản hồi tối thiểu → không công bố tỉ lệ. */
  hidden: boolean;
  satisfied: number;
  chooseAgain: number;
  /** % sẽ chọn lại trường (trên số phản hồi có trả lời câu này); null = chưa đủ dữ liệu. */
  chooseSchoolAgain: number | null;
  trovioRight: number;
  topWish: string | null;
  demo: boolean;
}

export function summarizeSurveys(list: Pick<OutcomeSurvey, "satisfaction" | "chooseAgain" | "chooseSchoolAgain" | "trovioRight" | "wish" | "demo">[]): SurveyStats {
  const n = list.length;
  const pct = (k: number) => (n ? Math.round((k / n) * 100) : 0);
  // Chỉ công bố lời nhắn không bị bộ lọc gắn cờ (liên hệ, quảng cáo, ngôn từ, công kích, nêu tên…).
  const wishes = list.map((x) => x.wish).filter((w) => w && screenReview("", w).length === 0);
  return {
    n,
    hidden: n < SURVEY_MIN_PUBLIC,
    satisfied: pct(list.filter((x) => x.satisfaction >= 4).length),
    chooseAgain: pct(list.filter((x) => x.chooseAgain === "yes").length),
    chooseSchoolAgain: (() => {
      const answered = list.filter((x) => x.chooseSchoolAgain);
      return answered.length >= SURVEY_MIN_PUBLIC ? Math.round((answered.filter((x) => x.chooseSchoolAgain === "yes").length / answered.length) * 100) : null;
    })(),
    trovioRight: pct(list.filter((x) => x.trovioRight === "yes").length),
    topWish: wishes[0] ?? null,
    // Có lẫn phản hồi minh hoạ → giao diện ghi rõ "có dữ liệu minh hoạ".
    demo: list.some((x) => x.demo),
  };
}

export const outcomeSurveyService = {
  async stats(programId: string): Promise<SurveyStats> {
    return summarizeSurveys(await repositories.outcomeSurveys.listByProgram(programId));
  },

  async submit(user: PublicUser, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    if (!user.verified) return { ok: false, status: 403, message: "Xác thực email tài khoản trước khi gửi phản hồi." };
    const programId = typeof input.programId === "string" ? input.programId : "";
    if (!(await repositories.programs.findById(programId))) return { ok: false, status: 400, field: "programId", message: "Chọn chương trình bạn đang học." };
    const sat = Number(input.satisfaction);
    if (![1, 2, 3, 4, 5].includes(sat)) return { ok: false, status: 400, field: "satisfaction", message: "Chọn mức hài lòng từ 1 đến 5." };
    const yn = (v: unknown) => (v === "yes" || v === "no" || v === "unsure" ? v : null);
    const chooseAgain = yn(input.chooseAgain);
    const trovioRight = yn(input.trovioRight) ?? "unsure";
    const chooseSchoolAgain = yn(input.chooseSchoolAgain);
    if (!chooseAgain) return { ok: false, status: 400, field: "chooseAgain", message: "Cho biết nếu được chọn lại bạn có chọn ngành này không." };
    const cohort = Number(input.cohort);
    const year = new Date().getFullYear();
    if (await repositories.outcomeSurveys.findByUser(user.id, programId)) return { ok: false, status: 409, message: "Bạn đã gửi phản hồi cho chương trình này. Cảm ơn bạn!" };
    await repositories.outcomeSurveys.add({
      id: `os-${randomUUID()}`,
      programId,
      userId: user.id,
      satisfaction: sat as OutcomeSurvey["satisfaction"],
      chooseAgain,
      ...(chooseSchoolAgain ? { chooseSchoolAgain } : {}),
      trovioRight,
      wish: redactContacts(clean(input.wish, 300)),
      cohort: Number.isInteger(cohort) && cohort >= year - 6 && cohort <= year ? cohort : year - 1,
      createdAt: new Date().toISOString(),
    });
    // Đồng ý nhận lời mời trả lời lại sau 1 năm (mặc định tắt, có thể tắt trong hồ sơ).
    if (input.optIn === true) await repositories.users.update(user.id, { surveyOptIn: true, surveyOptInAt: new Date().toISOString(), surveyInvitedAt: null });
    return { ok: true };
  },

  /** Cron: mời người đã đồng ý trả lời lại 3 câu sau 1 năm (mỗi năm 1 lần). */
  async inviteDue(now = Date.now()): Promise<number> {
    const YEAR = 365 * 86400_000;
    let sent = 0;
    for (const u of await repositories.users.list()) {
      if (!u.surveyOptIn || !u.surveyOptInAt) continue;
      const since = Date.parse(u.surveyInvitedAt ?? u.surveyOptInAt);
      if (!Number.isFinite(since) || now - since < YEAR) continue;
      await notificationService.notify({
        userId: u.id,
        kind: "survey-invite",
        title: "Một năm rồi — ngành bạn chọn thế nào?",
        body: "Trả lời 3 câu ngắn (ẩn danh) để giúp các bạn lớp 12 năm nay chọn ngành sát thực tế hơn.",
        href: "/phan-hoi-nganh",
        email: true,
      });
      await repositories.users.update(u.id, { surveyInvitedAt: new Date(now).toISOString() });
      sent++;
    }
    return sent;
  },
};
