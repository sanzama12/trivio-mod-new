/**
 * SERVICE LAYER — C5 Cổng trường (cán bộ tuyển sinh).
 * 1) Đăng ký: email đã xác thực thuộc tên miền website của trường → chờ quản trị viên duyệt.
 * 2) Xác nhận từng nhóm số liệu (Tổ hợp / Học phí / Điểm chuẩn / Chỉ tiêu). Đủ 4 nhóm → huy hiệu "Trường đã xác nhận".
 * 3) Số liệu sai → gửi bản sửa kèm minh chứng; quản trị viên duyệt rồi mới áp dụng (không sửa trực tiếp).
 */
import { randomUUID } from "node:crypto";
import type { Program, PublicUser, SchoolSubmission, VerifyField } from "../domain/types";
import { repositories } from "../repositories";
import { isSchoolEmail } from "./review.service";
import { notificationService } from "./notification.service";
import { toPublicUser } from "./auth.service";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

export const VERIFY_FIELDS: VerifyField[] = ["combos", "tuition", "cutoff", "quota"];
export const VERIFY_FIELD_LABELS: Record<VerifyField, string> = { combos: "Tổ hợp", tuition: "Học phí", cutoff: "Điểm chuẩn", quota: "Chỉ tiêu" };
const MAX_PENDING_PER_STAFF = 30;

export function fieldValue(p: Program, f: VerifyField): string {
  if (f === "combos") return p.combos.join(", ") || "—";
  if (f === "tuition") return p.tuitionMin === p.tuitionMax ? `${p.tuitionMin} triệu/năm` : `${p.tuitionMin}–${p.tuitionMax} triệu/năm`;
  if (f === "cutoff") return p.cutoffs[0] ? `${p.cutoffs[0].score} (${p.cutoffs[0].year})` : "—";
  return p.quota ? String(p.quota) : "—";
}

/** Chuẩn hoá giá trị đề xuất → phần ghi đè chương trình. */
function parseProposed(p: Program, f: VerifyField, raw: string): { ok: true; patch: Partial<Program>; label: string } | Fail {
  const v = raw.trim();
  const n = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  if (f === "combos") {
    const list = v.toUpperCase().split(/[\s,;/]+/).filter(Boolean);
    if (!list.length || list.some((c) => !/^[A-Z]\d{2}$/.test(c))) return { ok: false, status: 400, field: "proposed", message: "Tổ hợp dạng A00, D01… cách nhau dấu phẩy." };
    return { ok: true, patch: { combos: [...new Set(list)] }, label: [...new Set(list)].join(", ") };
  }
  if (f === "tuition") {
    const [a, b] = v.split(/[-–]/).map((s) => n(s));
    const max = Number.isFinite(b) ? b : a;
    if (!Number.isFinite(a) || a < 0 || a > 2000 || !Number.isFinite(max) || max < a || max > 2000) return { ok: false, status: 400, field: "proposed", message: "Học phí (triệu/năm), VD: 28 hoặc 28-35." };
    return { ok: true, patch: { tuitionMin: a, tuitionMax: max }, label: a === max ? `${a}` : `${a}–${max}` };
  }
  if (f === "cutoff") {
    const s = n(v);
    if (!Number.isFinite(s) || s <= 0 || s > 30) return { ok: false, status: 400, field: "proposed", message: "Điểm chuẩn thang 30, VD: 26.5." };
    const year = p.cutoffs[0]?.year ?? 2025;
    const score = Math.round(s * 100) / 100;
    return { ok: true, patch: { cutoffs: [{ year, score }, ...p.cutoffs.filter((c) => c.year !== year)].sort((x, y) => y.year - x.year) }, label: `${score} (${year})` };
  }
  const q = n(v);
  if (!Number.isInteger(q) || q < 1 || q > 100000) return { ok: false, status: 400, field: "proposed", message: "Chỉ tiêu là số nguyên dương." };
  return { ok: true, patch: { quota: q }, label: String(q) };
}

async function staffSchool(user: PublicUser) {
  if (!user.schoolStaff || user.schoolStaff.status !== "approved") return null;
  return (await repositories.catalogAdmin.listSchools()).find((s) => s.id === user.schoolStaff!.schoolId) ?? null;
}

async function writeOverride(actor: PublicUser, p: Program, patch: Partial<Program>, field: string, before: string, after: string, action: "update" | "verify") {
  const existing = (await repositories.programAdmin.getOverride(p.id)) ?? {};
  await repositories.programAdmin.setOverride(p.id, { ...existing, ...patch }, { id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: p.id, action, changes: [{ field, before, after }] });
}

async function notifyAdmins(title: string, body: string, href: string) {
  const admins = (await repositories.users.list()).filter((u) => toPublicUser(u).admin);
  for (const a of admins.slice(0, 20)) await notificationService.notify({ userId: a.id, kind: "school-submission", title, body, href });
}

export const schoolPortalService = {
  /** Trường khớp tên miền email (để gợi ý khi đăng ký). */
  async matchSchools(user: PublicUser) {
    if (!user.verified) return [];
    return (await repositories.catalogAdmin.listSchools()).filter((s) => !s.hidden && s.website && isSchoolEmail(user.email, s.website));
  },

  async request(user: PublicUser, schoolIdInput: unknown): Promise<{ ok: true } | Fail> {
    if (!user.verified) return { ok: false, status: 403, message: "Xác thực email trước khi đăng ký cổng trường." };
    if (user.schoolStaff?.status === "approved") return { ok: false, status: 400, message: "Tài khoản đã là cán bộ tuyển sinh." };
    if (user.schoolStaff?.status === "pending") return { ok: false, status: 400, message: "Yêu cầu đang chờ duyệt." };
    const school = (await this.matchSchools(user)).find((s) => s.id === schoolIdInput);
    if (!school) return { ok: false, status: 403, field: "schoolId", message: "Email của bạn không thuộc tên miền của trường này. Dùng email công vụ của trường." };
    await repositories.users.update(user.id, { schoolStaff: { schoolId: school.id, status: "pending", requestedAt: now(), reviewedAt: null } });
    await notifyAdmins("Yêu cầu cán bộ tuyển sinh mới", `${user.email} đăng ký làm cán bộ tuyển sinh ${school.shortName}.`, "/quan-tri/nguoi-dung?status=staff");
    return { ok: true };
  },

  /** Dữ liệu cổng trường: tiến độ xác nhận + từng chương trình. */
  async dashboard(user: PublicUser) {
    const school = await staffSchool(user);
    if (!school) return null;
    const [programs, submissions] = await Promise.all([repositories.catalogAdmin.listPrograms(), repositories.schoolSubmissions.list({ schoolId: school.id })]);
    const mine = programs.filter((p) => p.schoolId === school.id && !p.hidden).sort((a, b) => a.admissionCode.localeCompare(b.admissionCode));
    const items = mine.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      admissionCode: p.admissionCode,
      schoolVerifiedAt: p.schoolVerifiedAt ?? null,
      fields: VERIFY_FIELDS.map((f) => ({
        field: f,
        label: VERIFY_FIELD_LABELS[f],
        value: fieldValue(p, f),
        confirmedAt: p.verifiedFields?.[f] ?? null,
        pending: submissions.find((s) => s.programId === p.id && s.field === f && s.status === "pending") ?? null,
      })),
    }));
    const total = items.length * VERIFY_FIELDS.length;
    const done = items.reduce((n, i) => n + i.fields.filter((f) => f.confirmedAt).length, 0);
    return { school, items, total, done, submissions: submissions.slice(0, 50) };
  },

  async confirm(user: PublicUser, programId: unknown, fieldInput: unknown): Promise<{ ok: true; complete: boolean } | Fail> {
    const school = await staffSchool(user);
    if (!school) return { ok: false, status: 403, message: "Bạn chưa được duyệt làm cán bộ tuyển sinh." };
    const p = typeof programId === "string" ? await repositories.catalogAdmin.getProgram(programId) : null;
    if (!p || p.schoolId !== school.id) return { ok: false, status: 404, message: "Không tìm thấy chương trình của trường bạn." };
    const fields = fieldInput === "all" ? VERIFY_FIELDS : VERIFY_FIELDS.filter((f) => f === fieldInput);
    if (!fields.length) return { ok: false, status: 400, message: "Nhóm số liệu không hợp lệ." };
    const verifiedFields = { ...(p.verifiedFields ?? {}) };
    for (const f of fields) verifiedFields[f] = today();
    const complete = VERIFY_FIELDS.every((f) => verifiedFields[f]);
    await writeOverride(
      user,
      p,
      { verifiedFields, ...(complete ? { schoolVerifiedAt: today(), schoolVerifiedNote: `Cán bộ tuyển sinh ${user.email} xác nhận trên Cổng trường` } : {}) },
      `[Cổng trường] Xác nhận ${fields.map((f) => VERIFY_FIELD_LABELS[f]).join(", ")}`,
      "Chưa xác nhận",
      complete ? `Đã xác nhận đủ 4 nhóm (${today()})` : today(),
      "verify",
    );
    return { ok: true, complete };
  },

  async submit(user: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id: string } | Fail> {
    const school = await staffSchool(user);
    if (!school) return { ok: false, status: 403, message: "Bạn chưa được duyệt làm cán bộ tuyển sinh." };
    const p = typeof input.programId === "string" ? await repositories.catalogAdmin.getProgram(input.programId) : null;
    if (!p || p.schoolId !== school.id) return { ok: false, status: 404, message: "Không tìm thấy chương trình của trường bạn." };
    const field = VERIFY_FIELDS.find((f) => f === input.field);
    if (!field) return { ok: false, status: 400, field: "field", message: "Chọn nhóm số liệu." };
    const parsed = parseProposed(p, field, String(input.proposed ?? "").slice(0, 80));
    if (!parsed.ok) return parsed;
    const evidenceUrl = String(input.evidenceUrl ?? "").trim().slice(0, 300);
    try {
      if (new URL(evidenceUrl).protocol !== "https:") throw new Error("x");
    } catch {
      return { ok: false, status: 400, field: "evidenceUrl", message: "Cần đường dẫn https tới văn bản/đề án làm minh chứng." };
    }
    const pending = await repositories.schoolSubmissions.list({ schoolId: school.id, status: "pending" });
    if (pending.filter((s) => s.userId === user.id).length >= MAX_PENDING_PER_STAFF) return { ok: false, status: 429, message: "Bạn có quá nhiều bản sửa đang chờ duyệt." };
    if (pending.some((s) => s.programId === p.id && s.field === field)) return { ok: false, status: 409, message: "Nhóm số liệu này đã có bản sửa đang chờ duyệt." };
    const sub: SchoolSubmission = {
      id: randomUUID(),
      schoolId: school.id,
      programId: p.id,
      userId: user.id,
      field,
      current: fieldValue(p, field),
      proposed: parsed.label,
      evidenceUrl,
      note: String(input.note ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, 500),
      status: "pending",
      createdAt: now(),
      resolvedAt: null,
      resolvedBy: null,
      adminNote: null,
    };
    await repositories.schoolSubmissions.add(sub);
    await notifyAdmins("Trường gửi bản sửa số liệu", `${school.shortName} – ${p.name}: ${VERIFY_FIELD_LABELS[field]} ${sub.current} → ${sub.proposed}`, `/quan-tri?tab=de-xuat#${sub.id}`);
    return { ok: true, id: sub.id };
  },

  /** Quản trị viên: danh sách bản sửa (mặc định đang chờ). */
  async listSubmissions(status: SchoolSubmission["status"] | "all" = "pending") {
    const [subs, programs, schools, users] = await Promise.all([
      repositories.schoolSubmissions.list(status === "all" ? undefined : { status }),
      repositories.catalogAdmin.listPrograms(),
      repositories.catalogAdmin.listSchools(),
      repositories.users.list(),
    ]);
    return subs.map((s) => ({
      ...s,
      fieldLabel: VERIFY_FIELD_LABELS[s.field],
      programName: programs.find((p) => p.id === s.programId)?.name ?? s.programId,
      schoolName: schools.find((x) => x.id === s.schoolId)?.shortName ?? s.schoolId,
      byEmail: users.find((u) => u.id === s.userId)?.email ?? "(đã xoá)",
    }));
  },

  async resolve(admin: PublicUser, id: string, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    const sub = await repositories.schoolSubmissions.findById(id);
    if (!sub) return { ok: false, status: 404, message: "Không tìm thấy bản sửa." };
    if (sub.status !== "pending") return { ok: false, status: 409, message: "Bản sửa đã được xử lý." };
    const approve = input.action === "approve";
    if (!approve && input.action !== "reject") return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
    const adminNote = String(input.note ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, 300) || null;
    if (!approve && !adminNote) return { ok: false, status: 400, field: "note", message: "Ghi lý do từ chối để gửi lại cho trường." };
    const p = await repositories.catalogAdmin.getProgram(sub.programId);
    if (approve) {
      if (!p) return { ok: false, status: 404, message: "Chương trình không còn tồn tại." };
      const parsed = parseProposed(p, sub.field, sub.proposed.replace(/\s*\(\d{4}\)$/, ""));
      if (!parsed.ok) return parsed;
      await writeOverride(admin, p, { ...parsed.patch, verifiedFields: { ...(p.verifiedFields ?? {}), [sub.field]: today() }, updatedAt: now().slice(0, 7) }, `[Bản sửa của trường] ${VERIFY_FIELD_LABELS[sub.field]}`, sub.current, parsed.label, "update");
    }
    await repositories.schoolSubmissions.update(id, { status: approve ? "approved" : "rejected", resolvedAt: now(), resolvedBy: admin.id, adminNote });
    await repositories.audit.append({ id: randomUUID(), at: now(), actorId: admin.id, actorEmail: admin.email, programId: sub.id, targetType: "school-submission", action: approve ? "approve" : "reject", changes: [{ field: `${VERIFY_FIELD_LABELS[sub.field]} – ${p?.name ?? sub.programId}`, before: sub.current, after: approve ? sub.proposed : `Từ chối: ${adminNote}` }] });
    await notificationService.notify({
      userId: sub.userId,
      kind: "school-submission",
      title: approve ? "Bản sửa số liệu đã được áp dụng" : "Bản sửa số liệu chưa được chấp nhận",
      body: `${p?.name ?? ""} – ${VERIFY_FIELD_LABELS[sub.field]}: ${sub.proposed}${adminNote ? `. Ghi chú: ${adminNote}` : ""}`,
      href: "/cong-truong",
      email: true,
    });
    return { ok: true };
  },
};
