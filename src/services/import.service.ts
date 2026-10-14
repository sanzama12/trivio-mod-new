/**
 * SERVICE LAYER — A07 Nhập & Kiểm duyệt dữ liệu.
 * Tải CSV/XLSX → kiểm tra từng dòng → sửa trực tiếp → xác nhận → công bố các dòng hợp lệ.
 * Hỗ trợ nhập tích hợp Trường · Cơ sở · Ngành · Điểm chuẩn · Học phí:
 *   - Thông tin chưa có (điểm chuẩn, học phí, tổ hợp) vẫn cho nhập và công bố (lưu chờ bổ sung sau).
 *   - Trường và ngành mới tự động được tạo nếu có tên.
 *   - Có thể xuất/tải file mẫu đơn giản 1 dòng.
 */
import { randomUUID } from "node:crypto";
import type { Program, PublicUser, School, Major } from "../domain/types";
import { repositories } from "../repositories";
import { MAX_SHEET_ROWS, parseCsv, parseXlsx } from "../lib/sheet";
import { catalogAdminService, slugify } from "./catalog-admin.service";
import { unifiedEntryService } from "./unified-entry.service";
import { normalizeVi } from "../lib/text";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();

export const IMPORT_COLUMNS = [
  "ma_xet_tuyen",
  "ten_chuong_trinh",
  "ma_truong",
  "ten_truong",
  "tinh_thanh",
  "co_so",
  "ma_nganh",
  "nam",
  "diem_chuan",
  "hoc_phi_min",
  "hoc_phi_max",
  "chi_tieu",
  "to_hop",
  "nguon",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRowData = Record<ImportColumn, string>;
export const REQUIRED_COLUMNS: ImportColumn[] = ["ma_truong"];

export interface ImportRow {
  line: number;
  data: ImportRowData;
  errors: { field: ImportColumn | "row"; message: string }[];
  warnings: { field: ImportColumn | "row"; message: string }[];
  action: "create" | "update" | null;
  programId: string | null;
  label: string | null;
}

export interface ImportPreview {
  fileName: string;
  rows: ImportRow[];
  summary: { total: number; valid: number; errors: number; warnings: number; create: number; update: number };
}

const clean = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
const num = (v: string) => (v.trim() === "" ? null : Number(v.trim().replace(/\s/g, "").replace(",", ".")));

const COLUMN_ALIASES: Record<string, ImportColumn> = {
  ma_xet_tuyen: "ma_xet_tuyen",
  maxettuyen: "ma_xet_tuyen",
  ma_xt: "ma_xet_tuyen",
  ten_chuong_trinh: "ten_chuong_trinh",
  tenchuongtrinh: "ten_chuong_trinh",
  ten_nganh: "ten_chuong_trinh",
  tennganh: "ten_chuong_trinh",
  nganh: "ten_chuong_trinh",
  ma_truong: "ma_truong",
  matruong: "ma_truong",
  truong: "ma_truong",
  ten_truong: "ten_truong",
  tentruong: "ten_truong",
  tinh_thanh: "tinh_thanh",
  tinhthanh: "tinh_thanh",
  thanh_pho: "tinh_thanh",
  tinh: "tinh_thanh",
  co_so: "co_so",
  coso: "co_so",
  ma_nganh: "ma_nganh",
  manganh: "ma_nganh",
  nam: "nam",
  year: "nam",
  diem_chuan: "diem_chuan",
  diemchuan: "diem_chuan",
  diem: "diem_chuan",
  score: "diem_chuan",
  hoc_phi_min: "hoc_phi_min",
  hoc_phi: "hoc_phi_min",
  hocphi: "hoc_phi_min",
  hoc_phi_max: "hoc_phi_max",
  hocphimax: "hoc_phi_max",
  chi_tieu: "chi_tieu",
  chitieu: "chi_tieu",
  quota: "chi_tieu",
  to_hop: "to_hop",
  tohop: "to_hop",
  combos: "to_hop",
  nguon: "nguon",
  source: "nguon",
};

/** Đọc file thành dòng dữ liệu theo tên cột (hỗ trợ tiếng Việt và tiếng Anh). */
export function readSheet(fileName: string, content: string): { ok: true; rows: ImportRowData[] } | Fail {
  const lower = fileName.toLowerCase();
  let table: string[][];
  try {
    if (lower.endsWith(".xlsx")) table = parseXlsx(Buffer.from(content, "base64"));
    else if (lower.endsWith(".csv") || lower.endsWith(".txt")) table = parseCsv(content);
    else return { ok: false, status: 400, field: "file", message: "Chỉ hỗ trợ file .csv hoặc .xlsx." };
  } catch {
    return { ok: false, status: 400, field: "file", message: "Không đọc được file. Kiểm tra định dạng (CSV UTF-8 hoặc Excel .xlsx)." };
  }
  if (table.length < 2) return { ok: false, status: 400, field: "file", message: "File không có dòng dữ liệu." };
  if (table.length - 1 > MAX_SHEET_ROWS) return { ok: false, status: 400, field: "file", message: `Tối đa ${MAX_SHEET_ROWS} dòng mỗi lần nhập.` };

  // Chuẩn hóa tiêu đề cột
  const rawHeaders = table[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const headerMap = new Map<ImportColumn, number>();

  rawHeaders.forEach((h, idx) => {
    const norm = normalizeVi(h).replace(/[^a-z0-9_]/g, "");
    const mapped = COLUMN_ALIASES[h] || COLUMN_ALIASES[norm];
    if (mapped && !headerMap.has(mapped)) {
      headerMap.set(mapped, idx);
    }
  });

  if (!headerMap.has("ma_truong")) {
    return { ok: false, status: 400, field: "file", message: "Thiếu cột bắt buộc: ma_truong (Mã trường)." };
  }

  const currentYear = String(new Date().getFullYear());
  const hasMaXetTuyenInHeader = headerMap.has("ma_xet_tuyen");

  const rows: ImportRowData[] = table.slice(1).map((r) => {
    const rowObj: Record<string, string> = {};
    for (const col of IMPORT_COLUMNS) {
      const idx = headerMap.get(col);
      rowObj[col] = idx != null ? clean(r[idx] ?? "") : "";
    }
    // Giá trị ngầm định thông minh chỉ khi cột không tồn tại trong file
    if (!rowObj.nam) rowObj.nam = currentYear;
    if (!hasMaXetTuyenInHeader && !rowObj.ma_xet_tuyen && rowObj.ten_chuong_trinh) {
      rowObj.ma_xet_tuyen = slugify(rowObj.ten_chuong_trinh).slice(0, 15).toUpperCase();
    }
    return rowObj as ImportRowData;
  });

  return { ok: true, rows };
}

async function context() {
  const [schools, majors, programs, combos] = await Promise.all([
    repositories.catalogAdmin.listSchools(),
    repositories.catalogAdmin.listMajors(),
    repositories.catalogAdmin.listPrograms(),
    repositories.catalog.findCombos(),
  ]);
  return { schools, majors, programs, comboCodes: new Set(combos.map((c) => c.code)) };
}

type Ctx = Awaited<ReturnType<typeof context>>;

function validateRows(input: ImportRowData[], ctx: Ctx): ImportRow[] {
  const seen = new Map<string, number>();
  const year = new Date().getFullYear();

  return input.map((raw, i) => {
    const data = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, clean(raw?.[c])])) as ImportRowData;
    const errors: ImportRow["errors"] = [];
    const warnings: ImportRow["warnings"] = [];

    const code = (data.ma_xet_tuyen || data.ma_nganh).toUpperCase();
    if (!code) {
      errors.push({ field: "ma_xet_tuyen", message: "Thiếu mã xét tuyển" });
    } else if (!/^[A-Z0-9-]{2,20}$/.test(code)) {
      errors.push({ field: "ma_xet_tuyen", message: "Mã xét tuyển chỉ gồm chữ, số, dấu gạch (2–20 ký tự)" });
    }

    const school = ctx.schools.find((s) => s.code.toUpperCase() === data.ma_truong.toUpperCase());
    if (!data.ma_truong) {
      errors.push({ field: "ma_truong", message: "Thiếu mã trường" });
    } else if (!school) {
      if (data.ten_truong && data.ten_truong.trim()) {
        warnings.push({ field: "ma_truong", message: `Trường mới sẽ được tạo tự động: "${data.ten_truong}"` });
      } else {
        errors.push({ field: "ma_truong", message: `Không tìm thấy trường mã "${data.ma_truong}"` });
      }
    }

    const y = num(data.nam) ?? year;
    if (y < 2015 || y > year + 1) {
      errors.push({ field: "nam", message: "Năm không hợp lệ" });
    }

    const score = num(data.diem_chuan);
    if (score == null) {
      warnings.push({ field: "diem_chuan", message: "Chưa có điểm chuẩn (chờ công bố)" });
    } else if (!Number.isFinite(score) || score <= 0) {
      errors.push({ field: "diem_chuan", message: "Điểm chuẩn không hợp lệ" });
    } else if (score > 30) {
      errors.push({ field: "diem_chuan", message: "Điểm chuẩn > 30 (thang 30)" });
    }

    const existing = school && code ? ctx.programs.find((p) => p.schoolId === school.id && p.admissionCode.toUpperCase() === code) : undefined;
    const key = `${school?.id ?? data.ma_truong}::${code}::${y}`;
    if (code && seen.has(key)) {
      errors.push({ field: "row", message: `Trùng với dòng ${seen.get(key)} (cùng trường, mã, năm)` });
    } else {
      seen.set(key, i + 2);
    }

    const tMin = num(data.hoc_phi_min);
    const tMax = num(data.hoc_phi_max) ?? tMin;
    if (tMin == null) {
      if (existing) warnings.push({ field: "hoc_phi_min", message: "Thiếu học phí — giữ mức hiện tại" });
      else warnings.push({ field: "hoc_phi_min", message: "Chưa có học phí (mặc định 0 triệu, bổ sung sau)" });
    } else if (!Number.isFinite(tMin) || tMin < 0 || tMin > 2000 || tMax == null || !Number.isFinite(tMax) || tMax < tMin || tMax > 2000) {
      errors.push({ field: "hoc_phi_min", message: "Học phí (triệu/năm) không hợp lệ" });
    }

    const quota = num(data.chi_tieu);
    if (quota != null && (!Number.isInteger(quota) || quota < 1 || quota > 100000)) {
      errors.push({ field: "chi_tieu", message: "Chỉ tiêu phải là số nguyên dương" });
    }

    const combos = data.to_hop ? data.to_hop.toUpperCase().split(/[\s,;/]+/).filter(Boolean) : [];
    const unknownCombo = combos.filter((c) => !ctx.comboCodes.has(c));
    if (unknownCombo.length) {
      warnings.push({ field: "to_hop", message: `Tổ hợp chưa chuẩn: ${unknownCombo.join(", ")}` });
    }

    let major = null as Ctx["majors"][number] | null;
    if (!existing) {
      major =
        ctx.majors.find(
          (m) =>
            (data.ma_nganh && m.code === data.ma_nganh.trim()) ||
            (data.ten_chuong_trinh && normalizeVi(m.name).toLowerCase() === normalizeVi(data.ten_chuong_trinh).toLowerCase()),
        ) ?? null;

      if (!major) {
        if (data.ten_chuong_trinh) {
          warnings.push({ field: "ma_nganh", message: `Ngành mới sẽ được tạo tự động: "${data.ten_chuong_trinh}"` });
        } else {
          errors.push({ field: "ma_nganh", message: "Chương trình mới cần mã ngành" });
        }
      }
    }

    if (!data.nguon) {
      warnings.push({ field: "nguon", message: "Chưa ghi nguồn" });
    } else if (!/^https:\/\/[^\s/]+\.edu\.vn(\/|$)/i.test(data.nguon)) {
      warnings.push({ field: "nguon", message: "Nguồn chưa chính thức (không phải https .edu.vn)" });
    }

    if (existing && score != null && Number.isFinite(score)) {
      const prev = existing.cutoffs.find((c) => c.year === (y ?? 0) - 1)?.score;
      if (prev != null && Math.abs(score - prev) > 2) {
        warnings.push({ field: "diem_chuan", message: `Chênh ${(score - prev).toFixed(2)} điểm so với năm trước` });
      }
    }

    const ok = errors.length === 0;
    return {
      line: i + 2,
      data: { ...data, ma_xet_tuyen: code, to_hop: combos.join(" ") },
      errors,
      warnings,
      action: ok ? (existing ? "update" : "create") : null,
      programId: existing?.id ?? null,
      label: existing
        ? `${existing.name} – ${school?.shortName ?? ""}`
        : major && school
          ? `${data.ten_chuong_trinh || major.name} – ${school.shortName}`
          : data.ten_chuong_trinh || code,
    };
  });
}

function summarize(fileName: string, rows: ImportRow[]): ImportPreview {
  return {
    fileName,
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => !r.errors.length).length,
      errors: rows.filter((r) => r.errors.length).length,
      warnings: rows.filter((r) => !r.errors.length && r.warnings.length).length,
      create: rows.filter((r) => r.action === "create").length,
      update: rows.filter((r) => r.action === "update").length,
    },
  };
}

const safeName = (v: unknown) => clean(v).replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || "du-lieu.csv";

export const importService = {
  /** Đọc file và kiểm tra (không ghi gì). */
  async previewFile(fileNameInput: unknown, content: unknown): Promise<{ ok: true; preview: ImportPreview } | Fail> {
    const fileName = safeName(fileNameInput);
    if (typeof content !== "string" || content.length === 0) {
      return { ok: false, status: 400, field: "file", message: "Chọn file để tải lên." };
    }
    const read = readSheet(fileName, content);
    if (!read.ok) return read;
    return { ok: true, preview: summarize(fileName, validateRows(read.rows, await context())) };
  },

  /** Kiểm tra lại sau khi sửa trực tiếp trên bảng xem trước. */
  async revalidate(fileNameInput: unknown, rowsInput: unknown): Promise<{ ok: true; preview: ImportPreview } | Fail> {
    if (!Array.isArray(rowsInput) || rowsInput.length === 0) return { ok: false, status: 400, message: "Không có dòng dữ liệu." };
    if (rowsInput.length > MAX_SHEET_ROWS) return { ok: false, status: 400, message: `Tối đa ${MAX_SHEET_ROWS} dòng.` };
    return { ok: true, preview: summarize(safeName(fileNameInput), validateRows(rowsInput as ImportRowData[], await context())) };
  },

  /** Công bố các dòng hợp lệ. Hỗ trợ tự tạo trường/ngành mới và chấp nhận thiếu điểm/học phí. */
  async publish(actor: PublicUser, fileNameInput: unknown, rowsInput: unknown): Promise<{ ok: true; created: number; updated: number; batchId: string } | Fail> {
    const check = await this.revalidate(fileNameInput, rowsInput);
    if (!check.ok) return check;
    const { preview } = check;
    if (preview.summary.valid === 0) {
      return { ok: false, status: 400, message: "Không có dòng hợp lệ để công bố — sửa các dòng lỗi trước." };
    }

    let created = 0;
    let updated = 0;

    const updates = new Map<string, ImportRow[]>();
    const creates = new Map<string, ImportRow[]>();

    for (const r of preview.rows) {
      if (r.errors.length || !r.action) continue;
      const key = r.programId ?? `${r.data.ma_truong.toUpperCase()}::${r.data.ma_xet_tuyen}`;
      (r.action === "update" ? updates : creates).set(key, [...((r.action === "update" ? updates : creates).get(key) ?? []), r]);
    }

    // Cập nhật các chương trình đã có
    for (const [programId, rows] of updates) {
      const p = await repositories.catalogAdmin.getProgram(programId);
      if (!p) continue;

      const patch: Partial<Program> = {};
      const changes: { field: string; before: string; after: string }[] = [];
      let cutoffs = [...p.cutoffs];

      for (const r of rows) {
        const year = Number(r.data.nam) || new Date().getFullYear();
        const score = num(r.data.diem_chuan);
        if (score != null) {
          const before = cutoffs.find((c) => c.year === year)?.score;
          if (before !== score) changes.push({ field: `Điểm chuẩn ${year}`, before: before == null ? "—" : String(before), after: String(score) });
          cutoffs = [...cutoffs.filter((c) => c.year !== year), { year, score: Math.round(score * 100) / 100 }];
        }
      }
      patch.cutoffs = cutoffs.sort((a, b) => b.year - a.year);

      const last = rows[rows.length - 1].data;
      const tMin = num(last.hoc_phi_min);
      if (tMin != null && tMin > 0) {
        const tMax = num(last.hoc_phi_max) ?? tMin;
        if (tMin !== p.tuitionMin || tMax !== p.tuitionMax) {
          changes.push({ field: "Học phí", before: `${p.tuitionMin}–${p.tuitionMax}`, after: `${tMin}–${tMax}` });
        }
        patch.tuitionMin = tMin;
        patch.tuitionMax = tMax;
      }

      const quota = num(last.chi_tieu);
      if (quota != null && quota > 0 && quota !== p.quota) {
        changes.push({ field: "Chỉ tiêu", before: String(p.quota), after: String(quota) });
        patch.quota = quota;
      }

      if (last.to_hop) {
        const combos = last.to_hop.split(" ").filter(Boolean);
        if (combos.length && combos.join(",") !== p.combos.join(",")) {
          changes.push({ field: "Tổ hợp", before: p.combos.join(", "), after: combos.join(", ") });
          patch.combos = combos;
        }
      }

      if (last.nguon) {
        if (/^https:\/\//i.test(last.nguon)) patch.sourceUrl = last.nguon;
        else patch.source = last.nguon;
      }

      const existingOverride = (await repositories.programAdmin.getOverride(programId)) ?? {};
      await repositories.programAdmin.setOverride(programId, { ...existingOverride, ...patch, updatedAt: now().slice(0, 7) }, {
        id: randomUUID(),
        at: now(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId,
        targetType: "program",
        action: "update",
        changes: changes.length ? changes.map((c) => ({ ...c, field: `[Nhập file] ${c.field}` })) : [{ field: "[Nhập file] Cập nhật", before: "—", after: "Đã lưu" }],
      });
      updated++;
    }

    // Tạo mới các chương trình
    for (const rows of creates.values()) {
      const first = rows[0].data;
      const score = num(first.diem_chuan);
      const res = await unifiedEntryService.save(actor, {
        schoolCode: first.ma_truong,
        schoolName: first.ten_truong || undefined,
        city: first.tinh_thanh || undefined,
        campus: first.co_so || undefined,
        majorName: first.ten_chuong_trinh || first.ma_nganh || first.ma_xet_tuyen,
        majorCode: first.ma_nganh || undefined,
        admissionCode: first.ma_xet_tuyen,
        year: Number(first.nam) || new Date().getFullYear(),
        score,
        tuitionMin: num(first.hoc_phi_min),
        tuitionMax: num(first.hoc_phi_max),
        quota: num(first.chi_tieu),
        combos: first.to_hop ? first.to_hop.split(" ").filter(Boolean) : undefined,
        source: first.nguon || `Nhập từ file ${preview.fileName}`,
      });

      if (res.ok) {
        created++;
      }
    }

    const batch = {
      id: randomUUID(),
      fileName: preview.fileName,
      byId: actor.id,
      byName: actor.name,
      at: now(),
      valid: preview.summary.valid,
      errors: preview.summary.errors,
      warnings: preview.summary.warnings,
      created,
      updated,
    };
    await repositories.importBatches.add(batch);
    await repositories.audit.append({
      id: randomUUID(),
      at: now(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: batch.id,
      targetType: "import",
      action: "create",
      changes: [{ field: `Công bố "${batch.fileName}"`, before: `${preview.summary.total} dòng`, after: `${created} mới, ${updated} cập nhật` }],
    });

    return { ok: true, created, updated, batchId: batch.id };
  },

  history: (limit = 20) => repositories.importBatches.list(limit),

  /** File mẫu chuẩn đầy đủ. */
  templateCsv() {
    return `﻿${IMPORT_COLUMNS.join(",")}\n7480201,Công nghệ thông tin,BKA,,,,,2025,28.5,28,35,300,A00 A01,https://ts.hust.edu.vn/\n`;
  },

  /** File mẫu ĐƠN GIẢN NHẤT (Chỉ 1 bảng dễ hiểu, cho phép để trống điểm và học phí). */
  templateSimpleCsv() {
    return `﻿ma_truong,ten_truong,tinh_thanh,co_so,ten_nganh,ma_xet_tuyen,diem_chuan,hoc_phi,to_hop
BKA,Đại học Bách khoa Hà Nội,Hà Nội,Cơ sở 1 Đại Cồ Việt,Công nghệ thông tin,IT1,28.5,35,A00 A01
FPT,Trường Đại học FPT,Hà Nội,Cơ sở Hòa Lạc,Kỹ thuật phần mềm,SE01,,,A00 D01
NEU,Đại học Kinh tế Quốc dân,Hà Nội,Cơ sở Giải Phóng,Marketing,MKT01,27.5,25,A00 D01
`;
  },
};
