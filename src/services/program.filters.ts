/**
 * Bộ lọc tìm kiếm chương trình — module THUẦN (không truy cập dữ liệu),
 * dùng chung cho server (service, page) và client (bộ lọc, URL).
 */
import type { AdmissionMethodKey, Region, SchoolType } from "../domain/types";
import { ADMISSION_METHODS, isMethodKey } from "./scoring.service";

export type TuitionRange = "duoi-15" | "15-30" | "30-50" | "tren-50";
export type ProgramSort = "phu-hop" | "diem-giam" | "hoc-phi-tang" | "ten";

export interface ProgramFilters {
  q?: string;
  /** Phương thức của `score` (mặc định điểm thi THPT). Khác THPT thì chỉ hiện chương trình xét phương thức đó. */
  method?: AdmissionMethodKey;
  score?: number;
  combos?: string[];
  tuition?: TuitionRange;
  regions?: Region[];
  types?: SchoolType[];
  groups?: string[];
  majors?: string[];
  sort?: ProgramSort;
  page?: number;
  pageSize?: number;
}

export const TUITION_RANGES: Record<TuitionRange, { label: string; min: number; max: number }> = {
  "duoi-15": { label: "Dưới 15 triệu", min: 0, max: 15 },
  "15-30": { label: "Từ 15 – 30 triệu", min: 15, max: 30 },
  "30-50": { label: "Từ 30 – 50 triệu", min: 30, max: 50 },
  "tren-50": { label: "Trên 50 triệu", min: 50, max: Number.POSITIVE_INFINITY },
};

export const SORT_LABELS: Record<ProgramSort, string> = {
  "phu-hop": "Phù hợp nhất",
  "diem-giam": "Điểm chuẩn ↓",
  "hoc-phi-tang": "Học phí ↑",
  ten: "Tên A → Z",
};

export const REGION_LABELS: Record<Region, string> = {
  bac: "Miền Bắc",
  trung: "Miền Trung",
  nam: "Miền Nam",
};

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  "cong-lap": "Công lập",
  "tu-thuc": "Tư thục",
  "quoc-te": "Quốc tế",
};

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);

export function parseProgramFilters(params: RawParams): ProgramFilters {
  const scoreRaw = Number(one(params.score));
  const pageRaw = Number(one(params.page));
  const pageSizeRaw = Number(one(params.pageSize));
  const tuition = one(params.tuition) as TuitionRange | undefined;
  const sort = one(params.sort) as ProgramSort | undefined;
  const methodRaw = one(params.method);
  const method = isMethodKey(methodRaw) && methodRaw !== "thpt" ? methodRaw : undefined;
  const max = ADMISSION_METHODS[method ?? "thpt"].max;
  return {
    q: one(params.q)?.trim().slice(0, 100) || undefined,
    method,
    score: Number.isFinite(scoreRaw) && scoreRaw > 0 && scoreRaw <= max ? scoreRaw : undefined,
    combos: list(params.combos),
    tuition: tuition && tuition in TUITION_RANGES ? tuition : undefined,
    regions: list(params.regions).filter((r): r is Region => r in REGION_LABELS),
    types: list(params.types).filter((t): t is SchoolType => t in SCHOOL_TYPE_LABELS),
    groups: list(params.groups),
    majors: list(params.majors),
    sort: sort && sort in SORT_LABELS ? sort : undefined,
    page: Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : undefined,
    pageSize: Number.isInteger(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : undefined,
  };
}

export function serializeProgramFilters(f: ProgramFilters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.method && f.method !== "thpt") sp.set("method", f.method);
  if (f.score != null) sp.set("score", String(f.score));
  if (f.combos?.length) sp.set("combos", f.combos.join(","));
  if (f.tuition) sp.set("tuition", f.tuition);
  if (f.regions?.length) sp.set("regions", f.regions.join(","));
  if (f.types?.length) sp.set("types", f.types.join(","));
  if (f.groups?.length) sp.set("groups", f.groups.join(","));
  if (f.majors?.length) sp.set("majors", f.majors.join(","));
  if (f.sort && f.sort !== "phu-hop") sp.set("sort", f.sort);
  if (f.page && f.page > 1) sp.set("page", String(f.page));
  if (f.pageSize && f.pageSize !== 6) sp.set("pageSize", String(f.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: ProgramFilters): boolean {
  return Boolean(f.q || (f.method && f.method !== "thpt") || f.score != null || f.combos?.length || f.tuition || f.regions?.length || f.types?.length || f.groups?.length || f.majors?.length);
}
