/**
 * SERVICE LAYER — A07 Nhập & Kiểm duyệt dữ liệu.
 * Tải CSV/XLSX → kiểm tra từng dòng → sửa trực tiếp → xác nhận → công bố các dòng hợp lệ.
 * Hỗ trợ nhập tích hợp Trường · Cơ sở · Ngành · Điểm chuẩn · Học phí:
 *   - Thông tin chưa có (điểm chuẩn, học phí, tổ hợp) vẫn cho nhập và công bố (lưu chờ bổ sung sau).
 *   - Mã xét tuyển là khóa; mã trường dùng để phân biệt mã trùng giữa các trường.
 *   - Trường và ngành mới tự động được tạo, kể cả khi tên đang để trống.
 *   - Có thể tải file Excel mẫu đầy đủ để nhập và bổ sung dần.
 */
import { withAtomicResult } from "@database/client";
import { isMajorCode } from "@database/identity";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import type { AdmissionMethod, AdmissionMethodKey, MethodCutoff, Program, PublicUser } from "../domain/types";
import { PROVINCE_REGION } from "../domain/provinces";
import { repositories } from "@database/repositories";
import { MAX_SHEET_ROWS, parseCsv, parseXlsx } from "../lib/sheet";
import { slugify } from "./catalog-admin.service";
import { unifiedEntryService, type UnifiedEntryContext } from "./unified-entry.service";
import { normalizeVi } from "../lib/text";
import { findMajorForImport, normalizeMajorIdentity } from "./major-mapping.service";

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
  "phuong_thuc",
  "diem_rieng",
  "ghi_chu",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRowData = Record<ImportColumn, string>;
export const REQUIRED_COLUMNS: ImportColumn[] = ["ma_xet_tuyen"];

/** Mã trường có thể lặp; chỉ cặp trường + ID ngành phải duy nhất. Năm không thuộc khóa ID ngành. */
export function importIdentityKey(data: Pick<ImportRowData, "ma_truong" | "ma_xet_tuyen">, resolvedSchoolId?: string): string {
  return `${(resolvedSchoolId || data.ma_truong).trim().toUpperCase()}::${data.ma_xet_tuyen.trim().toUpperCase()}`;
}

export function importMethodIdentity(value: string): string {
  return normalizeVi(value || "Điểm thi THPT").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Một dòng chỉ bị trùng khi đồng thời trùng trường, ID ngành và phương thức xét tuyển. */
export function importRowIdentityKey(
  data: Pick<ImportRowData, "ma_truong" | "ma_xet_tuyen" | "phuong_thuc">,
  resolvedSchoolId?: string,
): string {
  return `${importIdentityKey(data, resolvedSchoolId)}::${importMethodIdentity(data.phuong_thuc)}`;
}

export function filterKnownComboCodes(value: string, knownCodes: ReadonlySet<string>): string[] {
  return [...new Set(
    value.toUpperCase().split(/[\s,;/]+/).filter((combo) => combo && knownCodes.has(combo)),
  )];
}

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
  summary: { total: number; valid: number; errors: number; warnings: number; create: number; update: number; skipped: number };
}

const clean = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
const num = (v: string) => {
  const t = v.trim();
  if (!t || /^(\(.*\)|-|chờ|chưa|tba|n\/a|none|null|đang cập nhật)/i.test(t)) return null;
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const IMPORT_METHOD_MAX: Record<AdmissionMethodKey, number> = {
  thpt: 30,
  hocba: 30,
};

function importMethodKey(value: string): AdmissionMethodKey | null {
  const method = importMethodIdentity(value);
  if (!value.trim() || method.includes("thpt") || method.includes("tot nghiep")) return "thpt";
  if (method.includes("hoc ba")) return "hocba";
  return null;
}

function importMethodScore(data: ImportRowData, method: AdmissionMethodKey): number | null {
  return method === "thpt" || method === "hocba"
    ? num(data.diem_chuan || data.diem_rieng)
    : num(data.diem_rieng || data.diem_chuan);
}

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
  link: "nguon",

  // Phương thức xét tuyển và điểm theo thang riêng
  phuong_thuc: "phuong_thuc",
  phuongthuc: "phuong_thuc",
  phương_thức: "phuong_thuc",
  admission_method: "phuong_thuc",
  diem_rieng: "diem_rieng",
  diemrieng: "diem_rieng",
  điểm_riêng: "diem_rieng",
  method_score: "diem_rieng",
  ghi_chu: "ghi_chu",
  ghichu: "ghi_chu",
  ghi_chú: "ghi_chu",
  note: "ghi_chu",
};

/** Đọc file thành dòng dữ liệu theo tên cột (hỗ trợ tiếng Việt và tiếng Anh). */
export async function readSheet(fileName: string, content: string): Promise<{ ok: true; rows: ImportRowData[] } | Fail> {
  const lower = fileName.toLowerCase();
  let table: string[][];
  try {
    if (lower.endsWith(".xlsx")) table = await parseXlsx(Buffer.from(content, "base64"));
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

  // Mã xét tuyển là khóa nhập liệu. Các cột còn lại có thể để trống để bổ sung sau.
  if (!headerMap.has("ma_xet_tuyen")) {
    return {
      ok: false,
      status: 400,
      field: "file",
      message: "Không tìm thấy hàng tiêu đề hợp lệ. File cần có cột 'ma_xet_tuyen' làm khóa bản ghi; các cột khác có thể để trống.",
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
  const schoolByCode = new Map(schools.map((school) => [school.code.toUpperCase(), school]));
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const schoolByName = new Map<string, (typeof schools)[number]>();
  for (const school of schools) {
    schoolByName.set(normalizeVi(school.name).toLowerCase(), school);
    schoolByName.set(normalizeVi(school.shortName).toLowerCase(), school);
  }
  const programById = new Map(programs.map((program) => [program.id, program]));
  const programBySchoolAdmission = new Map(
    programs.map((program) => [`${program.schoolId}::${program.admissionCode.toUpperCase()}`, program]),
  );
  const programsByAdmission = new Map<string, typeof programs>();
  for (const program of programs) {
    const code = program.admissionCode.toUpperCase();
    const matches = programsByAdmission.get(code);
    if (matches) matches.push(program);
    else programsByAdmission.set(code, [program]);
  }
  const majorByName = new Map(majors.map((major) => [normalizeMajorIdentity(major.name), major]));
  const majorByCode = new Map(majors.map((major) => [major.code.trim().toUpperCase(), major]));
  return {
    schools,
    majors,
    programs,
    comboCodes: new Set(combos.map((c) => c.code.toUpperCase())),
    schoolByCode,
    schoolById,
    schoolByName,
    programById,
    programBySchoolAdmission,
    programsByAdmission,
    majorByName,
    majorByCode,
  };
}

/**
 * Bóc tách tiền tố đánh số chuyên ngành hẹp:
 * Hỗ trợ các định dạng:
 * - "1 7480201", "2 7480201", "3 7480201"
 * - "1-7480201", "2-7480201", "3-7480201"
 * - "1. 7480201", "2. 7480201", "3. 7480201"
 * - "(1) 7480201", "(2) 7480201", "(3) 7480201"
 * - "1) 7480201", "2) 7480201", "3) 7480201"
 * - "1.7480201", "2.7480201", "3.7480201"
 * - "1_7480201", "2_7480201", "3_7480201"
 * - "1 IT1", "2 IT1"
 */
function parseNumberedCode(raw: unknown): {
  normalized: string;
  baseCode: string;
  prefixNumber: number | null;
} {
  let cleaned = String(raw ?? "").trim();
  if (!cleaned) return { normalized: "", baseCode: "", prefixNumber: null };

  cleaned = cleaned.replace(/^\((\d+)\)\s*/, "$1-");
  cleaned = cleaned.replace(/^(\d+)[.)\s_-]+([a-zA-Z0-9]+)/, "$1-$2");
  const normalized = cleaned.toUpperCase().replace(/\s+/g, "-");
  const match = normalized.match(/^(\d+)[-._]+([A-Z0-9]+)$/);
  if (match) {
    return {
      normalized,
      baseCode: match[2],
      prefixNumber: Number(match[1]),
    };
  }
  return {
    normalized,
    baseCode: normalized,
    prefixNumber: null,
  };
}

type Ctx = Awaited<ReturnType<typeof context>>;

function validateRows(input: ImportRowData[], ctx: Ctx): ImportRow[] {
  const seen = new Map<string, number>();
  const currentYear = new Date().getFullYear();

  return input.map((raw, i) => {
    const data = Object.fromEntries(IMPORT_COLUMNS.map((column) => [column, clean(raw?.[column])])) as ImportRowData;
    const errors: ImportRow["errors"] = [];
    const warnings: ImportRow["warnings"] = [];

    const parsedAdmission = parseNumberedCode(data.ma_xet_tuyen);
    const code = parsedAdmission.normalized;
    data.ma_xet_tuyen = code;

    if (!code || /^(\(.*\)|-|chờ|chưa|tba|n\/a|trống)/i.test(code)) {
      errors.push({ field: "ma_xet_tuyen", message: "Thiếu mã xét tuyển" });
    } else if (!/^[A-Z0-9_.-]{2,30}$/i.test(code)) {
      errors.push({ field: "ma_xet_tuyen", message: "Mã xét tuyển chỉ gồm chữ, số, dấu gạch hoặc chấm (2–30 ký tự)" });
    }

    const parsedMajor = parseNumberedCode(data.ma_nganh);
    if (parsedMajor.prefixNumber != null) data.ma_nganh = parsedMajor.baseCode;
    else if (!data.ma_nganh && /^\d{7}$/.test(parsedAdmission.baseCode)) data.ma_nganh = parsedAdmission.baseCode;

    let schoolCode = data.ma_truong.trim().toUpperCase();
    let school = schoolCode ? ctx.schoolByCode.get(schoolCode) : undefined;

    if (!school && !schoolCode && data.ten_truong) {
      const normalizedSchoolName = normalizeVi(data.ten_truong).toLowerCase();
      school = ctx.schoolByName.get(normalizedSchoolName);
      if (school) {
        schoolCode = school.code.toUpperCase();
        data.ma_truong = schoolCode;
      }
    }

    // Cho phép chỉ nhập mã xét tuyển khi mã đó duy nhất trên toàn hệ thống.
    // Nếu mã xuất hiện ở nhiều trường, người dùng cần thêm mã trường để tránh cập nhật nhầm.
    if (!school && !schoolCode && code) {
      const matches = ctx.programsByAdmission.get(code) ?? [];
      const schoolIds = new Set(matches.map((program) => program.schoolId));
      if (schoolIds.size === 1) {
        school = ctx.schoolById.get(matches[0].schoolId);
        if (school) {
          schoolCode = school.code.toUpperCase();
          data.ma_truong = schoolCode;
        }
      } else if (schoolIds.size > 1) {
        errors.push({ field: "ma_truong", message: `Mã xét tuyển "${code}" có ở nhiều trường; cần nhập mã trường để xác định đúng bản ghi` });
      }
    }

    if (!schoolCode) errors.push({ field: "ma_truong", message: "Cần mã trường do trường công bố; không tự sinh mã từ tên." });
    if (!school && !data.tinh_thanh) errors.push({ field: "tinh_thanh", message: "Cần tỉnh/thành phố cho trường mới." }); else if (!school) {
      warnings.push({
        field: "ma_truong",
        message: data.ten_truong
          ? `Trường mới sẽ được tạo tự động: "${data.ten_truong}"`
          : `Chưa có tên trường; sẽ tạm tạo theo mã "${schoolCode}" và cho phép bổ sung sau`,
      });
    }

    const existing = school && code
      ? ctx.programBySchoolAdmission.get(`${school.id}::${code}`)
      : undefined;

    if (existing) {
      warnings.push({
        field: "ma_xet_tuyen",
        message: `Đã tìm thấy ID "${code}" tại ${school?.shortName || school?.code}; hệ thống sẽ cập nhật các ô có dữ liệu và giữ nguyên các ô để trống`,
      });
    } else if (!data.ten_chuong_trinh) {
      warnings.push({ field: "ten_chuong_trinh", message: `Chưa có tên chương trình; tạm dùng mã "${code || "chưa có mã"}" và bổ sung sau` });
    }

    if (!data.nam) data.nam = String(currentYear);
    const parsedYear = num(data.nam);
    const targetYear = parsedYear ?? currentYear;
    if (parsedYear == null || !Number.isInteger(parsedYear) || targetYear < 2015 || targetYear > currentYear + 1) {
      errors.push({ field: "nam", message: "Năm không hợp lệ" });
    }

    const score = num(data.diem_chuan);
    if (!data.diem_chuan) {
      warnings.push({ field: "diem_chuan", message: existing ? "Chưa nhập điểm chuẩn — giữ dữ liệu hiện tại" : "Chưa có điểm chuẩn (bổ sung sau)" });
    } else if (score == null || score <= 0) {
      errors.push({ field: "diem_chuan", message: "Điểm chuẩn không hợp lệ" });
    } else if (score > 30) {
      errors.push({ field: "diem_chuan", message: "Điểm chuẩn > 30 (thang 30)" });
    }

    const method = importMethodKey(data.phuong_thuc);
    if (method && data.diem_rieng) {
      const methodScore = importMethodScore(data, method);
      if (methodScore == null || methodScore <= 0 || methodScore > IMPORT_METHOD_MAX[method]) {
        errors.push({ field: "diem_rieng", message: `Điểm riêng của phương thức không hợp lệ (tối đa ${IMPORT_METHOD_MAX[method]})` });
      }
    }

    const tuitionMin = num(data.hoc_phi_min);
    const tuitionMax = data.hoc_phi_max ? num(data.hoc_phi_max) : tuitionMin;
    if (!data.hoc_phi_min) {
      warnings.push({ field: "hoc_phi_min", message: existing ? "Chưa nhập học phí — giữ dữ liệu hiện tại" : "Chưa có học phí (bổ sung sau)" });
    } else if (
      tuitionMin == null || tuitionMin < 0 || tuitionMin > 2000 ||
      tuitionMax == null || tuitionMax < tuitionMin || tuitionMax > 2000
    ) {
      errors.push({ field: "hoc_phi_min", message: "Học phí (triệu/năm) không hợp lệ" });
    }

    const quota = num(data.chi_tieu);
    if (data.chi_tieu && (quota == null || !Number.isInteger(quota) || quota < 1 || quota > 100000)) {
      errors.push({ field: "chi_tieu", message: "Chỉ tiêu phải là số nguyên dương" });
    }

    const combos = data.to_hop ? data.to_hop.toUpperCase().split(/[\s,;/]+/).filter(Boolean) : [];
    const unknownCombos = combos.filter((combo) => !ctx.comboCodes.has(combo));
    if (unknownCombos.length) warnings.push({ field: "to_hop", message: `Tổ hợp chưa chuẩn: ${unknownCombos.join(", ")}` });

    let major = null as Ctx["majors"][number] | null;
    if (!existing) {
      major = findMajorForImport(ctx.majors, data.ten_chuong_trinh, data.ma_nganh) ?? null;
      if (!major && !isMajorCode(data.ma_nganh)) {
        errors.push({ field: "ma_nganh", message: "Cần mã ngành chuẩn hoặc tên khớp duy nhất với ngành đã có; không tạo mã giả." });
      }

    }

    if (!data.nguon) warnings.push({ field: "nguon", message: "Chưa ghi nguồn (bổ sung sau)" });
    else if (!/^https:\/\/[^\s/]+\.edu\.vn(\/|$)/i.test(data.nguon)) {
      warnings.push({ field: "nguon", message: "Nguồn chưa chính thức (không phải https .edu.vn)" });
    }

    if (existing && score != null) {
      const previousScore = existing.cutoffs.find((cutoff) => cutoff.year === targetYear - 1)?.score;
      if (previousScore != null && Math.abs(score - previousScore) > 2) {
        warnings.push({ field: "diem_chuan", message: `Chênh ${(score - previousScore).toFixed(2)} điểm so với năm trước` });
      }
    }

    const dedupeKey = importRowIdentityKey(data, school?.id ?? schoolCode);
    let duplicateLine = false;
    if (code && seen.has(dedupeKey)) {
      duplicateLine = true;
      warnings.push({
        field: "row",
        message: `Bỏ qua: trường "${schoolCode}", ID ngành "${code}" và phương thức "${data.phuong_thuc || "Điểm thi THPT"}" đã có ở dòng ${seen.get(dedupeKey)}`,
      });
    } else if (code) {
      seen.set(dedupeKey, i + 2);
    }

    const isValid = errors.length === 0;
    return {
      line: i + 2,
      data: { ...data, ma_truong: schoolCode, ma_xet_tuyen: code, to_hop: combos.join(" ") },
      errors,
      warnings,
      action: isValid && !duplicateLine ? (existing ? "update" : "create") : null,
      programId: existing?.id ?? null,
      label: existing
        ? `${existing.name} – ${school?.shortName || school?.code || ""} (khớp ID, sẽ cập nhật)`
        : major && school
          ? `${data.ten_chuong_trinh || major.name} – ${school.shortName}`
          : data.ten_chuong_trinh || code,
    };
  });
}

function mergeImportRows(rows: ImportRow[]): ImportRowData {
  const merged = Object.fromEntries(IMPORT_COLUMNS.map((column) => [column, ""])) as ImportRowData;
  const combos = new Set<string>();
  for (const row of rows) {
    for (const column of IMPORT_COLUMNS) {
      const value = row.data[column];
      if (!value) continue;
      if (column === "to_hop") value.split(/\s+/).filter(Boolean).forEach((combo) => combos.add(combo));
      else merged[column] = value;
    }
  }
  merged.to_hop = [...combos].join(" ");
  return merged;
}

const METHOD_META: Record<AdmissionMethodKey, Omit<AdmissionMethod, "requirement">> = {
  thpt: { key: "thpt", name: "Xét điểm thi tốt nghiệp THPT", desc: "Theo điểm thi tốt nghiệp THPT.", tag: "Điểm thi" },
  hocba: { key: "hocba", name: "Xét học bạ THPT", desc: "Theo kết quả học tập THPT.", tag: "Học bạ" },

};

function collectImportDetails(rows: ImportRow[]): { cutoffs: Program["cutoffs"]; altCutoffs: MethodCutoff[]; methods: AdmissionMethod[] } {
  const thpt = new Map<number, Program["cutoffs"][number]>();
  const alternatives = new Map<string, MethodCutoff>();
  const methods = new Map<string, AdmissionMethod>();
  for (const row of rows) {
    const knownMethod = importMethodKey(row.data.phuong_thuc);
    const rawMethod = row.data.phuong_thuc || "Điểm thi THPT";
    const score = knownMethod ? importMethodScore(row.data, knownMethod) : null;
    const year = Number(row.data.nam) || new Date().getFullYear();
    const requirement = row.data.ghi_chu || (score != null ? `${score} điểm` : "Theo thông báo tuyển sinh của trường");
    if (knownMethod) {
      methods.set(knownMethod, { ...METHOD_META[knownMethod], requirement });
      if (score != null && score > 0 && score <= IMPORT_METHOD_MAX[knownMethod]) {
        const rounded = Math.round(score * 100) / 100;
        if (knownMethod === "thpt") thpt.set(year, { year, score: rounded });
        else alternatives.set(`${knownMethod}::${year}`, { method: knownMethod, year, score: rounded });
      }
    } else {
      methods.set(importMethodIdentity(rawMethod), {
        name: rawMethod,
        desc: "Phương thức xét tuyển theo thông báo của trường.",
        requirement,
        tag: "Khác",
      });
    }
  }
  return {
    cutoffs: [...thpt.values()].sort((a, b) => b.year - a.year),
    altCutoffs: [...alternatives.values()].sort((a, b) => b.year - a.year),
    methods: [...methods.values()],
  };
}

function summarize(fileName: string, rows: ImportRow[]): ImportPreview {
  const uniqueActionCount = (action: ImportRow["action"], warningsOnly = false) => new Set(
    rows
      .filter((row) => row.action === action && (!warningsOnly || row.warnings.length > 0))
      .map((row) => row.programId ?? importIdentityKey(row.data)),
  ).size;
  return {
    fileName,
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => !r.errors.length && r.action !== null).length,
      errors: rows.filter((r) => r.errors.length).length,
      warnings: uniqueActionCount("create", true) + uniqueActionCount("update", true),
      create: uniqueActionCount("create"),
      update: uniqueActionCount("update"),
      skipped: rows.filter((r) => !r.errors.length && r.action === null).length,
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
    const read = await readSheet(fileName, content);
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
  async publish(actor: PublicUser, fileNameInput: unknown, rowsInput: unknown) {
    return withAtomicResult(() => importService.publishAtomic(actor, fileNameInput, rowsInput));
  },
  async publishAtomic(actor: PublicUser, fileNameInput: unknown, rowsInput: unknown): Promise<{ ok: true; created: number; updated: number; batchId: string; updatedPrograms?: string[]; message?: string } | Fail> {
    if (!Array.isArray(rowsInput) || rowsInput.length === 0) return { ok: false, status: 400, message: "Không có dòng dữ liệu." };
    if (rowsInput.length > MAX_SHEET_ROWS) return { ok: false, status: 400, message: `Tối đa ${MAX_SHEET_ROWS} dòng.` };
    const ctx = await context();
    const preview = summarize(safeName(fileNameInput), validateRows(rowsInput as ImportRowData[], ctx));
    if (preview.summary.valid === 0) {
      return { ok: false, status: 400, message: "Không có dòng hợp lệ để công bố — sửa các dòng lỗi trước." };
    }

    let created = 0;
    let updated = 0;

    const updates = new Map<string, ImportRow[]>();
    const creates = new Map<string, ImportRow[]>();

    for (const r of preview.rows) {
      if (r.errors.length || !r.action) continue;
      const key = r.programId ?? importIdentityKey(r.data);
      (r.action === "update" ? updates : creates).set(key, [...((r.action === "update" ? updates : creates).get(key) ?? []), r]);
    }

    const majorGroups = await repositories.majors.findGroups();
    const knownComboCodes = ctx.comboCodes;

    const batchCtx: UnifiedEntryContext = {
      schools: [...ctx.schools],
      majors: [...ctx.majors],
      majorGroups,
      programs: [...ctx.programs],
      schoolsToSave: [],
      majorsToSave: [],
      programsToInsert: [],
      skipAudit: true,
    };

    const updatedPrograms: string[] = [];
    const overrideBatch: Parameters<typeof repositories.programAdmin.patchProgramsBatch>[0] = [];

    // Cập nhật các chương trình đã có (báo trùng và cập nhật)
    for (const [programId, rows] of updates) {
      const p = ctx.programById.get(programId);
      if (!p) continue;
      const school = ctx.schoolById.get(p.schoolId);

      const patch: Partial<Program> = {};
      const changes: { field: string; before: string; after: string }[] = [];
      let cutoffs = [...p.cutoffs];
      let altCutoffs = [...p.altCutoffs];
      let methods = [...p.methods];
      const imported = collectImportDetails(rows);

      for (const cutoff of imported.cutoffs) {
        const before = cutoffs.find((item) => item.year === cutoff.year)?.score;
        if (before !== cutoff.score) changes.push({ field: `Điểm chuẩn THPT ${cutoff.year}`, before: before == null ? "—" : String(before), after: String(cutoff.score) });
        cutoffs = [...cutoffs.filter((item) => item.year !== cutoff.year), cutoff];
      }
      for (const cutoff of imported.altCutoffs) {
        const before = altCutoffs.find((item) => item.year === cutoff.year && item.method === cutoff.method)?.score;
        if (before !== cutoff.score) changes.push({ field: `Điểm ${cutoff.method} ${cutoff.year}`, before: before == null ? "—" : String(before), after: String(cutoff.score) });
        altCutoffs = [...altCutoffs.filter((item) => item.year !== cutoff.year || item.method !== cutoff.method), cutoff];
      }
      for (const method of imported.methods) {
        const sameMethod = (item: AdmissionMethod) => method.key
          ? item.key === method.key
          : !item.key && importMethodIdentity(item.name) === importMethodIdentity(method.name);
        methods = [...methods.filter((item) => !sameMethod(item)), method];
      }
      patch.cutoffs = cutoffs.sort((a, b) => b.year - a.year);
      patch.altCutoffs = altCutoffs.sort((a, b) => b.year - a.year);
      patch.methods = methods;

      const last = mergeImportRows(rows);
      if (last.ten_chuong_trinh && last.ten_chuong_trinh !== p.name) {
        changes.push({ field: "Tên chương trình", before: p.name, after: last.ten_chuong_trinh });
        patch.name = last.ten_chuong_trinh;
      }

      if (last.co_so && last.co_so !== p.campus) {
        changes.push({ field: "Cơ sở", before: p.campus || "—", after: last.co_so });
        patch.campus = last.co_so;
      }

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
        const combos = filterKnownComboCodes(last.to_hop, knownComboCodes);
        if (combos.length && combos.join(",") !== p.combos.join(",")) {
          changes.push({ field: "Tổ hợp", before: p.combos.join(", "), after: combos.join(", ") });
          patch.combos = combos;
        }
      }

      if (last.nguon) {
        if (/^https:\/\//i.test(last.nguon)) patch.sourceUrl = last.nguon;
        else patch.source = last.nguon;
      }

      // Các ô trường/ngành đã để trống ở lần nhập trước có thể được bổ sung bằng
      // chính khóa mã trường + mã xét tuyển ở lần nhập sau.
      if (school) {
        const nextSchool = { ...school, campuses: [...school.campuses] };
        let schoolChanged = false;
        if (last.ten_truong && last.ten_truong !== school.name) {
          nextSchool.name = last.ten_truong;
          nextSchool.shortName = last.ten_truong.replace(/^Trường\s+/i, "").replace(/^Đại học/i, "ĐH");
          schoolChanged = true;
        }
        if (last.tinh_thanh && last.tinh_thanh !== school.city) {
          nextSchool.city = last.tinh_thanh;
          nextSchool.region = PROVINCE_REGION[last.tinh_thanh as keyof typeof PROVINCE_REGION] ?? school.region;
          schoolChanged = true;
        }
        if (last.co_so && !nextSchool.campuses.some((campus) => campus.toLowerCase() === last.co_so.toLowerCase())) {
          nextSchool.campuses.push(last.co_so);
          schoolChanged = true;
        }
        if (schoolChanged && batchCtx.schoolsToSave) {
          const queuedIndex = batchCtx.schoolsToSave.findIndex((item) => item.id === nextSchool.id);
          if (queuedIndex >= 0) batchCtx.schoolsToSave[queuedIndex] = nextSchool;
          else batchCtx.schoolsToSave.push(nextSchool);
          Object.assign(school, nextSchool);
        }
      }

      const currentMajor = batchCtx.majors.find((major) => major.id === p.majorId);
      const placeholderMajor = currentMajor && normalizeVi(currentMajor.name).toLowerCase() === normalizeVi(p.admissionCode).toLowerCase();
      if (currentMajor && placeholderMajor && (last.ten_chuong_trinh || last.ma_nganh) && batchCtx.majorsToSave) {
        const nextMajor = {
          ...currentMajor,
          name: last.ten_chuong_trinh || currentMajor.name,
          code: last.ma_nganh || currentMajor.code,
        };
        const queuedIndex = batchCtx.majorsToSave.findIndex((item) => item.id === nextMajor.id);
        if (queuedIndex >= 0) batchCtx.majorsToSave[queuedIndex] = nextMajor;
        else batchCtx.majorsToSave.push(nextMajor);
        Object.assign(currentMajor, nextMajor);
      }

      overrideBatch.push({
        programId,
        patch: { ...patch, updatedAt: now().slice(0, 7) },
        audit: {
          id: randomUUID(),
          at: now(),
          actorId: actor.id,
          actorEmail: actor.email,
          programId,
          targetType: "program",
          action: "update",
          changes: changes.length ? changes.map((c) => ({ ...c, field: `[Nhập file] ${c.field}` })) : [{ field: "[Nhập file] Cập nhật", before: "—", after: "Đã lưu" }],
        },
      });
      updated++;
      const sName = school ? (school.shortName || school.code) : p.schoolId;
      updatedPrograms.push(`${last.ten_chuong_trinh || p.name} (${sName})`);
    }

    // Tạo mới các chương trình
    for (const rows of creates.values()) {
      const first = mergeImportRows(rows);
      const imported = collectImportDetails(rows);
      const targetYear = Number(first.nam) || new Date().getFullYear();
      const targetScore = imported.cutoffs.find((cutoff) => cutoff.year === targetYear)?.score ?? null;

      const res = await unifiedEntryService.save(actor, {
        schoolCode: first.ma_truong,
        schoolName: first.ten_truong || undefined,
        city: first.tinh_thanh || undefined,
        campus: first.co_so || undefined,
        majorName: first.ten_chuong_trinh || first.ma_nganh || first.ma_xet_tuyen,
        majorCode: first.ma_nganh || undefined,
        admissionCode: first.ma_xet_tuyen,
        year: Number(first.nam) || new Date().getFullYear(),
        score: targetScore,
        cutoffs: imported.cutoffs,
        tuitionMin: num(first.hoc_phi_min),
        tuitionMax: num(first.hoc_phi_max),
        quota: num(first.chi_tieu),
        combos: first.to_hop ? filterKnownComboCodes(first.to_hop, knownComboCodes) : undefined,
        source: first.nguon || `Nhập từ file ${preview.fileName}`,
      }, batchCtx);

      if (!res.ok) throw new Error(res.message);
      if (res.ok) {
        const createdProgram = batchCtx.programs.find((program) => program.id === res.programId);
        if (createdProgram) {
          createdProgram.cutoffs = imported.cutoffs;
          createdProgram.altCutoffs = imported.altCutoffs;
          createdProgram.methods = imported.methods;
        }
        created++;
      }
    }

    // Persist parents before programs so all foreign keys exist. Each collection is written in one batch.
    if (batchCtx.schoolsToSave && batchCtx.schoolsToSave.length > 0) {
      await repositories.catalogAdmin.saveSchoolsBatch(batchCtx.schoolsToSave);
    }
    if (batchCtx.majorsToSave && batchCtx.majorsToSave.length > 0) {
      await repositories.catalogAdmin.saveMajorsBatch(batchCtx.majorsToSave);
    }

    // Ghi hàng loạt toàn bộ chương trình mới vào database trong 1 transaction duy nhất
    if (batchCtx.programsToInsert && batchCtx.programsToInsert.length > 0) {
      await repositories.catalogAdmin.createProgramsBatch(batchCtx.programsToInsert);
    }
    if (overrideBatch.length > 0) {
      await repositories.programAdmin.patchProgramsBatch(overrideBatch);
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
        ? `Đã cập nhật ${updated} bản ghi khớp ID và tạo mới ${created} bản ghi thành công!`
        : `Đã công bố thành công ${created} ngành mới!`,
    };
  },

  history: (limit = 20) => repositories.importBatches.list(limit),

  /** File CSV mẫu đầy đủ; giữ lại để tương thích với các liên kết/công cụ cũ. */
  templateCsv() {
    return `﻿${IMPORT_COLUMNS.join(",")}\n7480201,Công nghệ thông tin,CEA,Trường Đại học Nghệ An,Nghệ An,,7480201,2026,17,,,,A00 A01,,Điểm thi THPT,,\n7340115,Marketing,CEA,Trường Đại học Nghệ An,Nghệ An,,7340115,2026,24,,,,A00 A01,,Điểm học bạ,,\n`;
  },

  /** Tên cũ được giữ để không làm hỏng đường dẫn CSV đã lưu trước đây. */
  templateSimpleCsv() {
    return this.templateCsv();
  },

  /** File Excel mẫu đầy đủ, dùng được ngay cho luồng nhập theo ID. */
  async templateXlsx(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Trovio";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet("Nhap lieu", {
      views: [{ state: "frozen", ySplit: 1, xSplit: 1 }],
      properties: { defaultRowHeight: 21 },
    });
    sheet.columns = [
      { header: "ma_xet_tuyen", key: "ma_xet_tuyen", width: 18 },
      { header: "ten_chuong_trinh", key: "ten_chuong_trinh", width: 30 },
      { header: "ma_truong", key: "ma_truong", width: 14 },
      { header: "ten_truong", key: "ten_truong", width: 32 },
      { header: "tinh_thanh", key: "tinh_thanh", width: 20 },
      { header: "co_so", key: "co_so", width: 24 },
      { header: "ma_nganh", key: "ma_nganh", width: 15 },
      { header: "nam", key: "nam", width: 10 },
      { header: "diem_chuan", key: "diem_chuan", width: 14 },
      { header: "hoc_phi_min", key: "hoc_phi_min", width: 15 },
      { header: "hoc_phi_max", key: "hoc_phi_max", width: 15 },
      { header: "chi_tieu", key: "chi_tieu", width: 13 },
      { header: "to_hop", key: "to_hop", width: 20 },
      { header: "nguon", key: "nguon", width: 34 },
      { header: "phuong_thuc", key: "phuong_thuc", width: 22 },
      { header: "diem_rieng", key: "diem_rieng", width: 14 },
      { header: "ghi_chu", key: "ghi_chu", width: 28 },
    ];

    sheet.addRows([
      {
        ma_xet_tuyen: "7480201",
        ten_chuong_trinh: "Công nghệ thông tin",
        ma_truong: "CEA",
        ten_truong: "Trường Đại học Nghệ An",
        tinh_thanh: "Nghệ An",
        co_so: "",
        ma_nganh: "7480201",
        nam: 2026,
        diem_chuan: 17,
        hoc_phi_min: "",
        hoc_phi_max: "",
        chi_tieu: "",
        to_hop: "A00 A01",
        nguon: "",
        phuong_thuc: "Điểm thi THPT",
        diem_rieng: "",
        ghi_chu: "",
      },
      {
        ma_xet_tuyen: "7340115",
        ten_chuong_trinh: "Marketing",
        ma_truong: "CEA",
        ten_truong: "Trường Đại học Nghệ An",
        tinh_thanh: "Nghệ An",
        co_so: "",
        ma_nganh: "7340115",
        nam: 2026,
        diem_chuan: "",
        hoc_phi_min: "",
        hoc_phi_max: "",
        chi_tieu: "",
        to_hop: "",
        nguon: "",
        phuong_thuc: "Điểm học bạ",
        diem_rieng: 68,
        ghi_chu: "",
      },
    ]);

    sheet.autoFilter = { from: "A1", to: "Q1" };
    sheet.getRow(1).height = 26;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD9E2F3" } } };
    });
    sheet.getColumn(1).numFmt = "@";
    sheet.getColumn(3).numFmt = "@";
    sheet.getColumn(7).numFmt = "@";
    sheet.getColumn(8).numFmt = "0";
    sheet.getColumn(9).numFmt = "0.00";
    sheet.getColumn(10).numFmt = "0.00";
    sheet.getColumn(11).numFmt = "0.00";
    sheet.getColumn(12).numFmt = "0";
    sheet.getColumn(16).numFmt = "0.00";
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.font = { name: "Arial", size: 10 };
        row.alignment = { vertical: "middle" };
        row.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1D4ED8" } };
      }
    });
    for (let row = 2; row <= 2001; row++) {
      sheet.getCell(row, 8).dataValidation = { type: "whole", operator: "between", allowBlank: true, formulae: [2015, new Date().getFullYear() + 1] };
      sheet.getCell(row, 9).dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 30] };
      sheet.getCell(row, 10).dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 2000] };
      sheet.getCell(row, 11).dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 2000] };
      sheet.getCell(row, 12).dataValidation = { type: "whole", operator: "between", allowBlank: true, formulae: [1, 100000] };
      sheet.getCell(row, 15).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Điểm thi THPT,Điểm học bạ"'],
      };
      sheet.getCell(row, 16).dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 1200] };
    }

    const guide = workbook.addWorksheet("Huong dan", { properties: { defaultRowHeight: 21 } });
    guide.columns = [
      { header: "Cột", key: "column", width: 24 },
      { header: "Mức độ", key: "required", width: 22 },
      { header: "Cách nhập", key: "description", width: 82 },
    ];
    guide.addRows([
      { column: "ma_xet_tuyen", required: "Bắt buộc", description: "Khóa bản ghi. ID đã có sẽ cập nhật; ID mới sẽ tạo bản ghi mới." },
      { column: "ma_truong", required: "Cần cho bản ghi mới", description: "Dùng cùng mã xét tuyển để xác định đúng trường. Có thể bỏ trống khi ID chỉ tồn tại ở một trường." },
      { column: "ten_chuong_trinh", required: "Tùy chọn", description: "Để trống nếu chưa có; hệ thống tạm dùng mã xét tuyển và cho bổ sung sau." },
      { column: "ten_truong, tinh_thanh, co_so", required: "Tùy chọn", description: "Thông tin trường/cơ sở. Ô trống không xóa dữ liệu đã có." },
      { column: "ma_nganh", required: "Tùy chọn", description: "Mã ngành chuẩn. Có thể bổ sung sau." },
      { column: "nam", required: "Tùy chọn", description: `Mặc định ${new Date().getFullYear()} nếu để trống.` },
      { column: "diem_chuan", required: "Tùy chọn", description: "Điểm thang 30. Để trống khi chưa công bố." },
      { column: "hoc_phi_min, hoc_phi_max", required: "Tùy chọn", description: "Đơn vị triệu đồng/năm. Có thể để trống và nhập sau." },
      { column: "chi_tieu, to_hop, nguon", required: "Tùy chọn", description: "Có thể để trống. Tổ hợp cách nhau bằng dấu cách, ví dụ A00 A01 D01." },
      { column: "phuong_thuc", required: "Tùy chọn", description: "Thuộc khóa dòng cùng mã trường và ID ngành. Khác phương thức vẫn được nhận; chỉ trùng cả ba giá trị mới bị bỏ qua." },
      { column: "diem_rieng", required: "Tùy chọn", description: "Điểm học bạ (thang 30) khi phương thức là Điểm học bạ." },
      { column: "ghi_chu", required: "Tùy chọn", description: "Thông tin bổ sung cho phương thức; có thể để trống." },
    ]);
    guide.views = [{ state: "frozen", ySplit: 1 }];
    guide.getRow(1).height = 26;
    guide.getRow(1).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    guide.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.font = { name: "Arial", size: 10 };
        row.alignment = { vertical: "middle", wrapText: true };
        row.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF92400E" } };
      }
    });

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output);
  },
};
