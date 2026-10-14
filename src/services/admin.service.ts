/**
 * SERVICE LAYER — quản trị dữ liệu chương trình: sửa điểm chuẩn, học phí, chỉ tiêu, nguồn; đánh dấu đã kiểm tra.
 * Mọi thay đổi được lưu dạng ghi đè (không sửa file dữ liệu gốc) kèm nhật ký: ai, lúc nào, trường nào, trước → sau.
 */
import { randomUUID } from "node:crypto";
import type { AltMethodKey, AuditEntry, MethodCutoff, Program, ProgramPatch, PublicUser } from "../domain/types";
import { repositories } from "../repositories";
import { programService } from "./program.service";
import { ADMISSION_METHODS } from "./scoring.service";

export interface ProgramEditInput {
  cutoffs?: { year: unknown; score: unknown }[];
  altCutoffs?: { method: unknown; year: unknown; score: unknown; estimated?: unknown }[];
  tuitionMin?: unknown;
  tuitionMax?: unknown;
  quota?: unknown;
  source?: unknown;
}

type Fail = { ok: false; field: string; message: string };
const ALT_KEYS: AltMethodKey[] = ["hocba", "dgnl-hn", "dgnl-hcm", "tsa"];
const currentMonth = () => new Date().toISOString().slice(0, 7);
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

function fmt(field: string, v: unknown): string {
  if (field === "cutoffs") return (v as Program["cutoffs"]).map((c) => `${c.year}: ${c.score}`).join("; ") || "—";
  if (field === "altCutoffs") return (v as MethodCutoff[]).map((c) => `${ADMISSION_METHODS[c.method].short} ${c.year}: ${c.score}${c.estimated ? " (ước tính)" : ""}`).join("; ") || "—";
  return v == null || v === "" ? "—" : String(v);
}

/** Kiểm tra & chuẩn hoá dữ liệu nhập. */
export function validateProgramEdit(input: ProgramEditInput): { ok: true; patch: ProgramPatch } | Fail {
  const patch: ProgramPatch = {};
  if (input.cutoffs !== undefined) {
    if (!Array.isArray(input.cutoffs) || input.cutoffs.length > 5) return { ok: false, field: "cutoffs", message: "Tối đa 5 năm điểm chuẩn." };
    const out: Program["cutoffs"] = [];
    for (const c of input.cutoffs) {
      const year = num(c?.year);
      const score = num(c?.score);
      if (score === null) continue; // bỏ trống = xoá năm đó
      if (!Number.isInteger(year) || year! < 2015 || year! > 2100) return { ok: false, field: "cutoffs", message: "Năm không hợp lệ." };
      if (!Number.isFinite(score) || score <= 0 || score > 30) return { ok: false, field: "cutoffs", message: `Điểm chuẩn ${year} phải trong khoảng 0–30.` };
      if (out.some((x) => x.year === year)) return { ok: false, field: "cutoffs", message: `Năm ${year} bị trùng.` };
      out.push({ year: year!, score: Math.round(score * 100) / 100 });
    }
    patch.cutoffs = out.sort((a, b) => b.year - a.year);
  }
  if (input.altCutoffs !== undefined) {
    if (!Array.isArray(input.altCutoffs) || input.altCutoffs.length > 6) return { ok: false, field: "altCutoffs", message: "Dữ liệu phương thức không hợp lệ." };
    const out: MethodCutoff[] = [];
    for (const c of input.altCutoffs) {
      const method = c?.method as AltMethodKey;
      if (!ALT_KEYS.includes(method)) return { ok: false, field: "altCutoffs", message: "Phương thức không hợp lệ." };
      const score = num(c?.score);
      if (score === null) continue;
      const year = num(c?.year) ?? 2025;
      const max = ADMISSION_METHODS[method].max;
      if (!Number.isInteger(year) || year < 2015 || year > 2100) return { ok: false, field: "altCutoffs", message: "Năm không hợp lệ." };
      if (!Number.isFinite(score) || score <= 0 || score > max) return { ok: false, field: "altCutoffs", message: `Điểm ${ADMISSION_METHODS[method].short} phải trong khoảng 0–${max}.` };
      if (out.some((x) => x.method === method)) return { ok: false, field: "altCutoffs", message: `${ADMISSION_METHODS[method].short} bị trùng.` };
      out.push({ method, year, score: ADMISSION_METHODS[method].decimals ? Math.round(score * 100) / 100 : Math.round(score), ...(c?.estimated === true ? { estimated: true } : {}) });
    }
    patch.altCutoffs = out;
  }
  const tMin = input.tuitionMin !== undefined ? num(input.tuitionMin) : undefined;
  const tMax = input.tuitionMax !== undefined ? num(input.tuitionMax) : undefined;
  for (const [field, v] of [["tuitionMin", tMin], ["tuitionMax", tMax]] as const) {
    if (v === undefined) continue;
    if (v === null || !Number.isFinite(v) || v < 0 || v > 2000) return { ok: false, field, message: "Học phí phải từ 0 đến 2000 triệu/năm." };
    patch[field] = Math.round(v * 10) / 10;
  }
  if (input.quota !== undefined) {
    const q = num(input.quota);
    if (q === null || !Number.isInteger(q) || q < 0 || q > 100_000) return { ok: false, field: "quota", message: "Chỉ tiêu phải là số nguyên từ 0 đến 100.000." };
    patch.quota = q;
  }
  if (input.source !== undefined) {
    const src = String(input.source ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200);
    if (src.length < 3) return { ok: false, field: "source", message: "Vui lòng ghi rõ nguồn dữ liệu (VD: Đề án tuyển sinh 2026 của trường)." };
    patch.source = src;
  }
  return { ok: true, patch };
}

export const adminService = {
  async listPrograms() {
    const views = await programService.listAllAdmin();
    const edited = new Set<string>();
    for (const v of views) if (await repositories.programAdmin.getOverride(v.program.id)) edited.add(v.program.id);
    return views.map((v) => ({ view: v, edited: edited.has(v.program.id) }));
  },

  async getProgram(id: string) {
    const program = await repositories.catalogAdmin.getProgram(id);
    if (!program) return null;
    const [view] = await programService.lookupAdmin([id]);
    if (!view) return null;
    return { view, edited: !!(await repositories.programAdmin.getOverride(id)) };
  },

  async updateProgram(actor: PublicUser, id: string, input: ProgramEditInput): Promise<{ ok: true; changes: number } | Fail | { ok: false; field: "id"; message: string }> {
    const current = await repositories.catalogAdmin.getProgram(id);
    if (!current) return { ok: false, field: "id", message: "Không tìm thấy chương trình." };
    const v = validateProgramEdit(input);
    if (!v.ok) return v;
    const tMin = v.patch.tuitionMin ?? current.tuitionMin;
    const tMax = v.patch.tuitionMax ?? current.tuitionMax;
    if (tMin > tMax) return { ok: false, field: "tuitionMax", message: "Học phí tối đa phải lớn hơn hoặc bằng học phí tối thiểu." };

    const changes: AuditEntry["changes"] = [];
    for (const [field, after] of Object.entries(v.patch) as [keyof ProgramPatch, unknown][]) {
      const before = fmt(field, current[field]);
      const afterStr = fmt(field, after);
      if (before !== afterStr) changes.push({ field, before, after: afterStr });
    }
    if (changes.length === 0) return { ok: true, changes: 0 };
    const existing = (await repositories.programAdmin.getOverride(id)) ?? {};
    const patch: ProgramPatch = { ...existing, ...v.patch, updatedAt: currentMonth() };
    await repositories.programAdmin.setOverride(id, patch, {
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      action: "update",
      changes,
    });
    return { ok: true, changes: changes.length };
  },

  /** Đánh dấu "đã kiểm tra với nguồn" (cập nhật ngày, không đổi số liệu). */
  async markVerified(actor: PublicUser, id: string) {
    const current = await repositories.catalogAdmin.getProgram(id);
    if (!current) return false;
    const existing = (await repositories.programAdmin.getOverride(id)) ?? {};
    await repositories.programAdmin.setOverride(id, { ...existing, updatedAt: currentMonth() }, {
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      action: "verify",
      changes: [{ field: "updatedAt", before: current.updatedAt, after: currentMonth() }],
    });
    return true;
  },

  /**
   * Huy hiệu "Trường đã xác nhận": quản trị viên ghi nhận khi trường gửi văn bản/email xác nhận số liệu.
   * Có hiệu lực 12 tháng (xem services/verification.ts). verified=false → gỡ huy hiệu.
   */
  async setSchoolVerified(actor: PublicUser, id: string, verified: boolean, noteInput: unknown): Promise<{ ok: true } | Fail> {
    const current = await repositories.catalogAdmin.getProgram(id);
    if (!current) return { ok: false, field: "id", message: "Không tìm thấy chương trình." };
    const note = String(noteInput ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 120);
    if (verified && note.length < 3) return { ok: false, field: "schoolVerifiedNote", message: "Ghi rõ căn cứ xác nhận (VD: Email phòng tuyển sinh ngày 12/9)." };
    const existing = (await repositories.programAdmin.getOverride(id)) ?? {};
    const at = verified ? new Date().toISOString().slice(0, 10) : null;
    const before = current.schoolVerifiedAt ? `${current.schoolVerifiedAt}${current.schoolVerifiedNote ? ` (${current.schoolVerifiedNote})` : ""}` : "Chưa xác nhận";
    const after = at ? `${at} (${note})` : "Gỡ xác nhận";
    await repositories.programAdmin.setOverride(id, { ...existing, schoolVerifiedAt: at, schoolVerifiedNote: verified ? note : null }, {
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      action: "verify",
      changes: [{ field: "Trường đã xác nhận", before, after }],
    });
    return { ok: true };
  },

  /** Khôi phục dữ liệu gốc (xoá phần ghi đè). */
  async reset(actor: PublicUser, id: string) {
    if (!(await repositories.programAdmin.getOverride(id))) return false;
    await repositories.programAdmin.setOverride(id, null, {
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      action: "reset",
      changes: [{ field: "*", before: "Đã chỉnh sửa", after: "Dữ liệu gốc" }],
    });
    return true;
  },

  listAudit(limit = 50) {
    return repositories.programAdmin.listAudit(limit);
  },
};
