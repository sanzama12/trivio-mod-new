/**
 * SERVICE LAYER — hỏi đáp sinh viên có kiểm duyệt.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, QaQuestion } from "../domain/types";
import { repositories } from "@database/repositories";
import { privateDisplayName, screenCommunityContent } from "./community-utils";
import { canContribute } from "@/domain/access";
import { notificationService } from "./notification.service";

type Fail = { ok: false; status: number; field?: string; message: string };

export const QA_MIN = 10;
export const QA_MAX = 300;
export const ANSWER_MAX = 800;

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

  /** User đã xác thực được trả lời; không có vai trò sinh viên/giáo viên riêng. */
  async canAnswer(user: PublicUser | null, programId: string): Promise<{ ok: boolean; domain: string | null }> {
    const ctx = await schoolOfProgram(programId);
    if (!ctx) return { ok: false, domain: null };
    let domain: string | null = null;
    try {
      if (ctx.school.website) {
        domain = new URL(ctx.school.website).hostname.replace(/^www\./, "");
      }
    } catch {
      domain = null;
    }
    return { ok: canContribute(user), domain };
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
    if (!perm.ok) return { ok: false, status: 403, message: "Bạn cần tài khoản đã xác thực và đang hoạt động để trả lời." };
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
          displayName: privateDisplayName(user.name),
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
    if (!canContribute(user)) return { ok: false, status: 403, message: "Bạn cần tài khoản đã xác thực và đang hoạt động để đánh giá." };
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
      .map((q) => ({ ...q, programName: name(q.programId), flags: screenCommunityContent("", q.text), answers: q.answers.map((a) => ({ ...a, flags: screenCommunityContent("", a.text) })) }));
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
      targetType: "qa",
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
