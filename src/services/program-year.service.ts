import "server-only";
import { randomUUID } from "node:crypto";
import { repositories } from "@database/repositories";
import { ADMISSION_STATUSES, type AdmissionStatus, type ProgramYearData, type PublicUser } from "@/domain/types";

type Fail = { ok: false; field: string; message: string };

const num = (v: unknown): number | null | "bad" => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : "bad";
};

/** Kiểm tra và chuẩn hoá danh sách dữ liệu theo năm do quản trị viên gửi lên. */
export function validateYearRows(programId: string, input: unknown): { ok: true; rows: ProgramYearData[] } | Fail {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, field: "rows", message: "Chưa có dữ liệu năm nào để lưu." };
  if (input.length > 12) return { ok: false, field: "rows", message: "Mỗi lần lưu tối đa 12 năm." };
  const seen = new Set<number>();
  const rows: ProgramYearData[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const year = Number(raw?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, field: "year", message: "Năm tuyển sinh không hợp lệ." };
    if (seen.has(year)) return { ok: false, field: "year", message: `Năm ${year} bị nhập trùng.` };
    seen.add(year);
    const tuitionMin = num(raw.tuitionMin);
    const tuitionMax = num(raw.tuitionMax);
    const quota = num(raw.quota);
    if (tuitionMin === "bad" || tuitionMax === "bad" || quota === "bad") return { ok: false, field: "number", message: `Năm ${year}: học phí hoặc chỉ tiêu không phải số.` };
    for (const t of [tuitionMin, tuitionMax]) {
      if (t !== null && (t < 0 || t > 2000)) return { ok: false, field: "tuition", message: `Năm ${year}: học phí phải từ 0 đến 2000 triệu/năm.` };
    }
    if (tuitionMin !== null && tuitionMax !== null && tuitionMax < tuitionMin) return { ok: false, field: "tuition", message: `Năm ${year}: học phí tối đa phải lớn hơn hoặc bằng tối thiểu.` };
    if (quota !== null && (!Number.isInteger(quota) || quota < 0 || quota > 100000)) return { ok: false, field: "quota", message: `Năm ${year}: chỉ tiêu phải là số nguyên không âm.` };
    const status = String(raw.status ?? "chua-cong-bo") as AdmissionStatus;
    if (!(ADMISSION_STATUSES as readonly string[]).includes(status)) return { ok: false, field: "status", message: `Năm ${year}: trạng thái tuyển sinh không hợp lệ.` };
    const note = String(raw.note ?? "").trim().slice(0, 300);
    rows.push({ programId, year, tuitionMin, tuitionMax, quota, status, note });
  }
  return { ok: true, rows };
}

const describe = (r: ProgramYearData | undefined) =>
  r ? `${r.status} · chỉ tiêu ${r.quota ?? "—"} · học phí ${r.tuitionMin ?? "—"}–${r.tuitionMax ?? "—"}` : "chưa có";

export const programYearService = {
  list: (programId: string) => repositories.programYears.listByProgram(programId),

  /** Lưu mọi năm được gửi lên, kể cả năm không đổi so với trước đó, để giữ đủ lịch sử từng năm. */
  async save(actor: PublicUser, programId: string, input: unknown): Promise<{ ok: true; saved: number; changed: number } | Fail> {
    const program = await repositories.catalogAdmin.getProgram(programId);
    if (!program) return { ok: false, field: "id", message: "Không tìm thấy chương trình." };
    const parsed = validateYearRows(programId, input);
    if (!parsed.ok) return parsed;
    const before = new Map((await repositories.programYears.listByProgram(programId)).map((r) => [r.year, r]));
    const changes: { field: string; before: string; after: string }[] = [];
    for (const row of parsed.rows) {
      const old = before.get(row.year);
      const a = describe(old);
      const b = describe(row);
      if (a !== b || (old?.note ?? "") !== row.note) changes.push({ field: `Năm ${row.year}`, before: a, after: b });
    }
    await repositories.programYears.upsertMany(parsed.rows, actor.id);
    if (changes.length) {
      await repositories.audit.append({
        id: randomUUID(),
        at: new Date().toISOString(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId,
        targetType: "program",
        action: "update",
        changes,
      });
    }
    return { ok: true, saved: parsed.rows.length, changed: changes.length };
  },
};
