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
const num = (v: string) => {
  const t = v.trim();
  if (!t || /^(\(.*\)|-|chờ|chưa|tba|n\/a|none|null|đang cập nhật)/i.test(t)) return null;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const COLUMN_ALIASES: Record<string, ImportColumn> = {
  // Mã xét tuyển
  ma_xet_tuyen: "ma_xet_tuyen",
  maxettuyen: "ma_xet_tuyen",
  ma_xt: "ma_xet_tuyen",
  maxt: "ma_xet_tuyen",
  admission_code: "ma_xet_tuyen",
  mã_xét_tuyển: "ma_xet_tuyen",
  mã_xt: "ma_xet_tuyen",
  mã_ts: "ma_xet_tuyen",
  mats: "ma_xet_tuyen",
  mã_tuyển_sinh: "ma_xet_tuyen",
  matuyensinh: "ma_xet_tuyen",
  mã_ngành_xét_tuyển: "ma_xet_tuyen",
  manganhxettuyen: "ma_xet_tuyen",
  mã_nghành_xét_tuyển: "ma_xet_tuyen",
  manghanhxettuyen: "ma_xet_tuyen",
  mã_ctđt: "ma_xet_tuyen",
  mactdt: "ma_xet_tuyen",
  mã_xét: "ma_xet_tuyen",
  maxet: "ma_xet_tuyen",
  code_xét_tuyển: "ma_xet_tuyen",
  code_xet_tuyen: "ma_xet_tuyen",
  major_code: "ma_xet_tuyen",

  // Tên chương trình / Tên ngành
  ten_chuong_trinh: "ten_chuong_trinh",
  tenchuongtrinh: "ten_chuong_trinh",
  ten_nganh: "ten_chuong_trinh",
  tennganh: "ten_chuong_trinh",
  ten_nghanh: "ten_chuong_trinh",
  tennghanh: "ten_chuong_trinh",
  nganh: "ten_chuong_trinh",
  nghanh: "ten_chuong_trinh",
  tên_ngành: "ten_chuong_trinh",
  tên_nghành: "ten_chuong_trinh",
  nghành: "ten_chuong_trinh",
  ngành_học: "ten_chuong_trinh",
  nganhhoc: "ten_chuong_trinh",
  ngành_đào_tạo: "ten_chuong_trinh",
  nganhdaotao: "ten_chuong_trinh",
  chuyên_ngành: "ten_chuong_trinh",
  chuyennganh: "ten_chuong_trinh",
  tên_chuyên_ngành: "ten_chuong_trinh",
  tenchuyennganh: "ten_chuong_trinh",
  chương_trình: "ten_chuong_trinh",
  chuongtrinh: "ten_chuong_trinh",
  chương_trình_đào_tạo: "ten_chuong_trinh",
  chuongtrinhdaotao: "ten_chuong_trinh",
  ctđt: "ten_chuong_trinh",
  ctdt: "ten_chuong_trinh",
  program: "ten_chuong_trinh",
  program_name: "ten_chuong_trinh",
  major: "ten_chuong_trinh",
  major_name: "ten_chuong_trinh",

  // Mã trường
  ma_truong: "ma_truong",
  matruong: "ma_truong",
  ma_truong_moi: "ma_truong",
  matruongmoi: "ma_truong",
  truong_moi: "ma_truong",
  mã_trường_mới: "ma_truong",
  mã_trường: "ma_truong",
  mã_trg: "ma_truong",
  matrg: "ma_truong",
  mã_trg_mới: "ma_truong",
  matrgmoi: "ma_truong",
  mã_đh: "ma_truong",
  madh: "ma_truong",
  ma_dh: "ma_truong",
  mã_đại_học: "ma_truong",
  madaihoc: "ma_truong",
  school_code: "ma_truong",
  code_truong: "ma_truong",
  school_id: "ma_truong",
  truong: "ma_truong",
  trường: "ma_truong",

  // Tên trường
  ten_truong: "ten_truong",
  tentruong: "ten_truong",
  tên_trường: "ten_truong",
  school_name: "ten_truong",
  tên_trường_mới: "ten_truong",
  tentruongmoi: "ten_truong",
  tên_trg: "ten_truong",
  tentrg: "ten_truong",
  tên_đại_học: "ten_truong",
  tendaihoc: "ten_truong",
  trường_đại_học: "ten_truong",
  truong_dai_hoc: "ten_truong",
  đại_học: "ten_truong",
  dai_hoc: "ten_truong",

  // Tỉnh / Thành
  tinh_thanh: "tinh_thanh",
  tinhthanh: "tinh_thanh",
  thanh_pho: "tinh_thanh",
  thanhpho: "tinh_thanh",
  tinh: "tinh_thanh",
  tỉnh: "tinh_thanh",
  tỉnh_thành: "tinh_thanh",
  thành_phố: "tinh_thanh",
  city: "tinh_thanh",
  province: "tinh_thanh",
  tỉnh_thành_phố: "tinh_thanh",
  tinhthanhpho: "tinh_thanh",
  tỉnh_tp: "tinh_thanh",
  tinhtp: "tinh_thanh",
  khu_vực: "tinh_thanh",
  khuvuc: "tinh_thanh",
  địa_bàn: "tinh_thanh",
  diaban: "tinh_thanh",
  địa_phương: "tinh_thanh",
  diaphuong: "tinh_thanh",

  // Cơ sở
  co_so: "co_so",
  coso: "co_so",
  cơ_sở: "co_so",
  campus: "co_so",

  // Mã ngành chuẩn Bộ GD&ĐT
  ma_nganh: "ma_nganh",
  manganh: "ma_nganh",
  mã_ngành: "ma_nganh",
  mã_nghành: "ma_nganh",

  // Năm tuyển sinh
  nam: "nam",
  year: "nam",
  năm: "nam",
  năm_tuyển_sinh: "nam",
  namtuyensinh: "nam",
  khoá: "nam",
  khoa: "nam",

  // Điểm chuẩn
  diem_chuan: "diem_chuan",
  diemchuan: "diem_chuan",
  điểm_chuẩn: "diem_chuan",
  diem: "diem_chuan",
  điểm: "diem_chuan",
  cutoff: "diem_chuan",
  score: "diem_chuan",
  điểm_trúng_tuyển: "diem_chuan",
  diemtrungtuyen: "diem_chuan",
  diem_trung_tuyen: "diem_chuan",
  điểm_xét_tuyển: "diem_chuan",
  diemxettuyen: "diem_chuan",
  diem_xet_tuyen: "diem_chuan",
  điểm_sàn: "diem_chuan",
  diemsan: "diem_chuan",
  diem_san: "diem_chuan",
  điểm_chuẩn_2025: "diem_chuan",
  diemchuan2025: "diem_chuan",
  điểm_2025: "diem_chuan",
  diem2025: "diem_chuan",
  điểm_chuẩn_2024: "diem_chuan",
  diemchuan2024: "diem_chuan",
  điểm_2024: "diem_chuan",
  diem2024: "diem_chuan",
  điểm_chuẩn_2026: "diem_chuan",
  diemchuan2026: "diem_chuan",
  điểm_2026: "diem_chuan",
  diem2026: "diem_chuan",
  điểm_đầu_vào: "diem_chuan",
  diemdauvao: "diem_chuan",

  // Học phí
  hoc_phi_min: "hoc_phi_min",
  hoc_phi: "hoc_phi_min",
  hocphi: "hoc_phi_min",
  học_phí: "hoc_phi_min",
  học_phí_dự_kiến: "hoc_phi_min",
  hocphidukien: "hoc_phi_min",
  mức_học_phí: "hoc_phi_min",
  muchocphi: "hoc_phi_min",
  tuition: "hoc_phi_min",
  hoc_phi_max: "hoc_phi_max",
  hocphimax: "hoc_phi_max",
  học_phí_tối_đa: "hoc_phi_max",

  // Chỉ tiêu
  chi_tieu: "chi_tieu",
  chitieu: "chi_tieu",
  chỉ_tiêu: "chi_tieu",
  chỉ_tiêu_tuyển_sinh: "chi_tieu",
  chitieutuyensinh: "chi_tieu",
  số_lượng: "chi_tieu",
  soluong: "chi_tieu",
  quota: "chi_tieu",

  // Tổ hợp
  to_hop: "to_hop",
  tohop: "to_hop",
  tổ_hợp: "to_hop",
  khối: "to_hop",
  khoi: "to_hop",
  tổ_hợp_xét_tuyển: "to_hop",
  tohopxettuyen: "to_hop",
  khối_xét_tuyển: "to_hop",
  khoixettuyen: "to_hop",
  tổ_hợp_môn: "to_hop",
  tohopmon: "to_hop",
  combos: "to_hop",

  // Nguồn
  nguon: "nguon",
  source: "nguon",
  nguồn: "nguon",
  ghi_chú: "nguon",
  ghichu: "nguon",
  link: "nguon",
};

/** Đọc file thành dòng dữ liệu theo tên cột (hỗ trợ tiếng Việt và tiếng Anh). */
export function readSheet(fileName: string, content: string): { ok: true; rows: ImportRowData[] } | Fail {
  const lower = fileName.toLowerCase();
  let table: string[][];
  try {
    if (lower.endsWith(".xlsx")) table = parseXlsx(Buffer.from(content, "base64"));
    else if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv")) table = parseCsv(content);
    else return { ok: false, status: 400, field: "file", message: "Chỉ hỗ trợ file Excel (.xlsx) hoặc CSV (.csv / .tsv / .txt)." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "not-zip") {
      return { ok: false, status: 400, field: "file", message: "Không đọc được file .xlsx. Nếu đây là file .xls cũ (Excel 97-2003), vui lòng mở trong Excel và lưu thành .xlsx hoặc .csv rồi thử lại." };
    }
    return { ok: false, status: 400, field: "file", message: "Không đọc được file. Kiểm tra định dạng (CSV UTF-8 hoặc Excel .xlsx)." };
  }

  if (table.length === 0) {
    return { ok: false, status: 400, field: "file", message: "File hoàn toàn trống (không có dòng nào chứa dữ liệu)." };
  }

  // Tự động tìm hàng tiêu đề thông minh trong 10 dòng đầu tiên (bỏ qua dòng tiêu đề lớn/banner)
  let headerIdx = 0;
  let headerMap = new Map<ImportColumn, number>();
  let bestScore = 0;

  const maxScan = Math.min(table.length, 10);
  for (let i = 0; i < maxScan; i++) {
    const row = table[i];
    const map = new Map<ImportColumn, number>();
    let score = 0;
    row.forEach((cell, idx) => {
      const h = cell.trim().toLowerCase().replace(/[\s-]+/g, "_");
      const norm = normalizeVi(h).replace(/[^a-z0-9_]/g, "");
      const mapped = COLUMN_ALIASES[h] || COLUMN_ALIASES[norm];
      if (mapped && !map.has(mapped)) {
        map.set(mapped, idx);
        score += mapped === "ma_truong" || mapped === "ten_chuong_trinh" ? 5 : 2;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
      headerMap = map;
    }
  }

  // Cần ít nhất mã trường (hoặc tên trường) và tên ngành
  if (!headerMap.has("ma_truong") && !headerMap.has("ten_truong")) {
    return {
      ok: false,
      status: 400,
      field: "file",
      message: "Không tìm thấy hàng tiêu đề hợp lệ (cần ít nhất cột 'Mã trường' hoặc 'Tên trường', và 'Tên ngành'). Hãy kiểm tra dòng tiêu đề trong file.",
    };
  }

  const dataRows = table.slice(headerIdx + 1).filter((r) => r.some((c) => c.trim() !== ""));
  if (dataRows.length === 0) {
    return { ok: false, status: 400, field: "file", message: "File không có dòng dữ liệu sau hàng tiêu đề." };
  }
  if (dataRows.length > MAX_SHEET_ROWS) {
    return { ok: false, status: 400, field: "file", message: `Tối đa ${MAX_SHEET_ROWS} dòng mỗi lần nhập.` };
  }

  const currentYear = String(new Date().getFullYear());

  const rows: ImportRowData[] = dataRows.map((r) => {
    const rowObj: Record<string, string> = {};
    for (const col of IMPORT_COLUMNS) {
      const idx = headerMap.get(col);
      rowObj[col] = idx != null ? clean(r[idx] ?? "") : "";
    }
    // Giá trị ngầm định thông minh
    if (!rowObj.nam) rowObj.nam = currentYear;

    // Tự sinh mã xét tuyển nếu để trống hoặc chứa placeholder text như "(để trống)"
    const mx = (rowObj.ma_xet_tuyen || "").trim();
    const isMxPlaceholder = !mx || /^(\(.*\)|-|chờ|chưa|tba|n\/a|trống)/i.test(mx);
    if (isMxPlaceholder && rowObj.ten_chuong_trinh) {
      rowObj.ma_xet_tuyen = slugify(rowObj.ten_chuong_trinh).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 15).toUpperCase();
    }

    // Làm sạch điểm chuẩn nếu chứa chữ placeholder như "(để trống chờ công bố)"
    if (rowObj.diem_chuan && /^(\(.*\)|-|chờ|chưa|tba|n\/a|trống)/i.test(rowObj.diem_chuan)) {
      rowObj.diem_chuan = "";
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

    const rawCode = (data.ma_xet_tuyen || data.ma_nganh || "").trim();
    let code = rawCode.toUpperCase().replace(/\s+/g, "-");
    if (!code || /^(\(.*\)|-|chờ|chưa|tba|n\/a|trống)/i.test(code)) {
      if (data.ten_chuong_trinh) {
        code = slugify(data.ten_chuong_trinh).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 15).toUpperCase();
        data.ma_xet_tuyen = code;
      } else {
        errors.push({ field: "ma_xet_tuyen", message: "Thiếu mã xét tuyển" });
      }
    } else if (!/^[A-Z0-9_.-]{2,30}$/i.test(code)) {
      errors.push({ field: "ma_xet_tuyen", message: "Mã xét tuyển chỉ gồm chữ, số, dấu gạch hoặc chấm (2–30 ký tự)" });
    }

    let sCode = (data.ma_truong || "").trim().toUpperCase();
    let school = sCode ? ctx.schools.find((s) => s.code.toUpperCase() === sCode) : undefined;
    if (!school && data.ten_truong && data.ten_truong.trim()) {
      const normTen = normalizeVi(data.ten_truong).toLowerCase();
      school = ctx.schools.find((s) => normalizeVi(s.name).toLowerCase() === normTen || normalizeVi(s.shortName).toLowerCase() === normTen);
      if (school) {
        sCode = school.code.toUpperCase();
        data.ma_truong = sCode;
      }
    }

    if (!data.ma_truong && !sCode) {
      if (data.ten_truong && data.ten_truong.trim()) {
        data.ma_truong = slugify(data.ten_truong).replace(/-/g, "").slice(0, 8).toUpperCase();
        sCode = data.ma_truong;
        warnings.push({ field: "ma_truong", message: `Trường mới sẽ được tạo tự động: "${data.ten_truong}" (mã: ${data.ma_truong})` });
      } else {
        errors.push({ field: "ma_truong", message: "Thiếu mã trường hoặc tên trường" });
      }
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

    // Tìm ngành đã có trong trường (Báo trùng ngành của trường đó)
    let existing = school && code ? ctx.programs.find((p) => p.schoolId === school.id && p.admissionCode.toUpperCase() === code) : undefined;
    
    // Nếu chưa khớp mã xét tuyển, kiểm tra theo tên ngành / tên chương trình trong trường đó
    if (!existing && school && data.ten_chuong_trinh) {
      const normInputName = normalizeVi(data.ten_chuong_trinh).toLowerCase();
      existing = ctx.programs.find((p) => {
        if (p.schoolId !== school.id) return false;
        if (normalizeVi(p.name).toLowerCase() === normInputName) return true;
        const m = ctx.majors.find((maj) => maj.id === p.majorId);
        return Boolean(m && normalizeVi(m.name).toLowerCase() === normInputName);
      });
    }

    // Nếu có mã ngành, kiểm tra xem trường đã có ngành này chưa
    if (!existing && school && data.ma_nganh) {
      const mCode = data.ma_nganh.trim();
      existing = ctx.programs.find((p) => {
        if (p.schoolId !== school.id) return false;
        const m = ctx.majors.find((maj) => maj.id === p.majorId);
        return Boolean(m && m.code === mCode);
      });
    }

    // Báo trùng ngành của trường: ghi nhận cảnh báo và chỉ định cập nhật thay vì tạo mới
    if (existing) {
      warnings.push({
        field: "ten_chuong_trinh",
        message: `Trùng ngành đã có của trường "${school?.shortName || school?.name || data.ma_truong}": "${existing.name}" (Mã: ${existing.admissionCode}). Hệ thống sẽ cập nhật thông tin và điểm chuẩn mới.`,
      });
    }

    // Kiểm tra trùng dòng nội bộ trong cùng file (cùng trường, cùng ngành/mã, cùng năm)
    const normName = data.ten_chuong_trinh ? normalizeVi(data.ten_chuong_trinh).toLowerCase() : "";
    const dedupeKey = `${school?.id ?? data.ma_truong.toUpperCase()}::${code || normName}::${y}`;
    if ((code || normName) && seen.has(dedupeKey)) {
      errors.push({ field: "row", message: `Trùng ngành với dòng ${seen.get(dedupeKey)} trong file (cùng trường, cùng ngành/mã xét tuyển, năm ${y})` });
    } else {
      seen.set(dedupeKey, i + 2);
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
        ? `${existing.name} – ${school?.shortName || school?.code || ""} (Trùng ngành - Sẽ cập nhật)`
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
  async publish(actor: PublicUser, fileNameInput: unknown, rowsInput: unknown): Promise<{ ok: true; created: number; updated: number; batchId: string; updatedPrograms?: string[]; message?: string } | Fail> {
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

    const updatedPrograms: string[] = [];

    // Cập nhật các chương trình đã có (báo trùng và cập nhật)
    for (const [programId, rows] of updates) {
      const p = await repositories.catalogAdmin.getProgram(programId);
      if (!p) continue;
      const school = await repositories.schools.findById(p.schoolId);

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
      const sName = school ? (school.shortName || school.code) : p.schoolId;
      updatedPrograms.push(`${p.name} (${sName})`);
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

    return {
      ok: true,
      created,
      updated,
      batchId: batch.id,
      updatedPrograms,
      message: updated > 0
        ? `Đã cập nhật ${updated} ngành trùng của trường và tạo mới ${created} ngành thành công!`
        : `Đã công bố thành công ${created} ngành mới!`,
    };
  },

  history: (limit = 20) => repositories.importBatches.list(limit),

  /** File mẫu chuẩn đầy đủ. */
  templateCsv() {
    return `﻿${IMPORT_COLUMNS.join(",")}\n7480201,Công nghệ thông tin,BKA,,,,,2025,28.5,28,35,300,A00 A01,https://ts.hust.edu.vn/\n`;
  },

  /** File mẫu ĐƠN GIẢN NHẤT — Đúng 6 cột chuẩn: mã trường mới, tên trường, tỉnh, tên ngành, mã xét tuyển, điểm chuẩn. */
  templateSimpleCsv() {
    return `﻿ma_truong_moi,ten_truong,tinh,ten_nganh,ma_xet_tuyen,diem_chuan
BKA,Đại học Bách khoa Hà Nội,Hà Nội,Công nghệ thông tin,IT1,28.5
NEU,Đại học Kinh tế Quốc dân,Hà Nội,Marketing,MKT01,27.5
FPT,Trường Đại học FPT,Hà Nội,Kỹ thuật phần mềm,SE01,
`;
  },
};
