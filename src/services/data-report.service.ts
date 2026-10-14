/**
 * SERVICE LAYER — "Báo dữ liệu sai": người dùng gửi, quản trị viên xử lý, người gửi được báo lại.
 */
import { randomUUID } from "node:crypto";
import type { DataReport, DataReportStatus, PublicUser } from "../domain/types";
import { repositories } from "../repositories";
import { notificationService } from "./notification.service";
import { sendMail } from "./mailer";

export const REPORT_TOPICS: Record<DataReport["topic"], string> = {
  "diem-chuan": "Điểm chuẩn",
  "hoc-phi": "Học phí",
  "chi-tieu": "Chỉ tiêu",
  "to-hop": "Tổ hợp / phương thức xét tuyển",
  "thong-tin-truong": "Thông tin trường / ngành",
  khac: "Khác",
};

export const REPORT_STATUS: Record<DataReportStatus, string> = {
  moi: "Mới",
  "dang-xu-ly": "Đang xử lý",
  "da-xu-ly": "Đã sửa dữ liệu",
  "khong-hop-le": "Không cần sửa",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

type Fail = { ok: false; status: number; field?: string; message: string };

export const dataReportService = {
  async submit(input: Record<string, unknown>, user: PublicUser | null): Promise<{ ok: true; id: string } | Fail> {
    const detail = clean(input.detail, 2000);
    if (detail.length < 10) return { ok: false, status: 400, field: "detail", message: "Vui lòng mô tả thông tin cần sửa (ít nhất 10 ký tự)." };
    const topic = typeof input.topic === "string" && input.topic in REPORT_TOPICS ? (input.topic as DataReport["topic"]) : "khac";
    const page = clean(input.page, 200);
    let programId: string | null = null;
    if (typeof input.programId === "string" && input.programId) {
      const p = await repositories.programs.findById(input.programId.slice(0, 100));
      if (p) programId = p.id;
    }
    const emailRaw = clean(input.email, 200).toLowerCase();
    if (emailRaw && !EMAIL_RE.test(emailRaw)) return { ok: false, status: 400, field: "email", message: "Email không hợp lệ." };
    const now = new Date().toISOString();
    const report: DataReport = {
      id: `bl-${randomUUID()}`,
      programId,
      page,
      topic,
      detail,
      email: emailRaw || (user?.verified ? user.email : null),
      userId: user?.id ?? null,
      status: "moi",
      adminNote: null,
      createdAt: now,
      updatedAt: now,
      handledBy: null,
    };
    await repositories.dataReports.create(report);
    return { ok: true, id: report.id };
  },

  async list(status?: DataReportStatus[]) {
    const [reports, programs, schools] = await Promise.all([
      repositories.dataReports.list(status ? { status } : undefined),
      repositories.programs.findAll(),
      repositories.schools.findAll(),
    ]);
    const schoolName = new Map(schools.map((s) => [s.id, s.shortName]));
    const programInfo = new Map(programs.map((p) => [p.id, { name: `${p.name} – ${schoolName.get(p.schoolId) ?? p.schoolId}`, slug: p.slug }]));
    return reports.map((r) => ({ ...r, program: r.programId ? (programInfo.get(r.programId) ?? null) : null }));
  },

  async openCount(): Promise<number> {
    return (await repositories.dataReports.list({ status: ["moi", "dang-xu-ly"] })).length;
  },

  /** Quản trị viên cập nhật trạng thái / ghi chú; báo lại cho người gửi khi đã có kết luận. */
  async update(admin: PublicUser, id: string, input: { status?: unknown; note?: unknown }): Promise<{ ok: true; report: DataReport } | Fail> {
    const r = await repositories.dataReports.findById(id);
    if (!r) return { ok: false, status: 404, message: "Không tìm thấy báo lỗi." };
    const status = typeof input.status === "string" && input.status in REPORT_STATUS ? (input.status as DataReportStatus) : null;
    if (!status) return { ok: false, status: 400, field: "status", message: "Trạng thái không hợp lệ." };
    const note = input.note === undefined ? r.adminNote : clean(input.note, 1000) || null;
    if ((status === "da-xu-ly" || status === "khong-hop-le") && !note) {
      return { ok: false, status: 400, field: "note", message: "Ghi rõ đã sửa gì hoặc vì sao không cần sửa — nội dung này được gửi cho người báo lỗi." };
    }
    const now = new Date().toISOString();
    const updated = await repositories.dataReports.update(id, { status, adminNote: note, updatedAt: now, handledBy: admin.id });
    await repositories.audit.append({
      id: randomUUID(),
      at: now,
      actorId: admin.id,
      actorEmail: admin.email,
      programId: r.id,
      targetType: "report",
      action: "update",
      changes: [
        { field: "status", before: REPORT_STATUS[r.status], after: REPORT_STATUS[status] },
        ...(note !== r.adminNote ? [{ field: "note", before: r.adminNote ?? "—", after: note ?? "—" }] : []),
      ],
    });
    const concluded = (status === "da-xu-ly" || status === "khong-hop-le") && status !== r.status;
    if (concluded) {
      const title = status === "da-xu-ly" ? "Báo lỗi của bạn đã được xử lý" : "Báo lỗi của bạn đã được xem xét";
      const body = `${REPORT_TOPICS[r.topic]}${r.page ? ` – ${r.page}` : ""}: ${note}`;
      if (r.userId) await notificationService.notify({ userId: r.userId, kind: "report-update", title, body, href: "/tro-giup#bao-loi", email: true });
      else if (r.email) await sendMail({ to: r.email, subject: `Trovio – ${title}`, text: `${body}\n\nCảm ơn bạn đã giúp dữ liệu chính xác hơn.\n— Trovio` }).catch(() => undefined);
    }
    return { ok: true, report: updated! };
  },
};
