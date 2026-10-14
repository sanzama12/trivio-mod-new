/**
 * SERVICE LAYER — nghiệp vụ tìm kiếm, gợi ý và so sánh chương trình đào tạo.
 * Chỉ phụ thuộc repository (qua `repositories`) và domain types.
 */
import type { AdmissionMethodKey, Major, Program, School } from "../domain/types";
import { repositories } from "../repositories";
import { matchesQuery } from "../lib/text";
import { computeFit, cutoffFor, type FitInfo } from "./scoring.service";
import { TUITION_RANGES, type ProgramFilters, type ProgramSort, type TuitionRange } from "./program.filters";

export type { ProgramFilters, ProgramSort, TuitionRange } from "./program.filters";

export interface ProgramView {
  program: Program;
  school: School;
  major: Major;
  /** Điểm chuẩn gần nhất theo `cutoffMethod` (mặc định điểm thi THPT). */
  latestCutoff: number | null;
  /** Điểm chuẩn đang hiển thị là số ước tính (chưa phải trường công bố). */
  cutoffEstimated?: boolean;
  cutoffMethod: AdmissionMethodKey;
  fit: FitInfo | null;
}

export interface SearchSuggestion {
  label: string;
  patch: Partial<ProgramFilters>;
  count: number;
}

export interface ProgramSearchResult {
  items: ProgramView[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  suggestions: SearchSuggestion[];
}

const fallbackSchool: School = {
  id: "unknown",
  slug: "unknown",
  code: "UNK",
  name: "Đại học",
  shortName: "ĐH",
  type: "cong-lap",
  region: "bac",
  city: "Toàn quốc",
  campuses: [],
  founded: 2000,
  students: 10000,
  highlight: "",
  website: "",
  description: "",
  scholarships: "",
};

const fallbackMajor: Major = {
  id: "unknown",
  slug: "unknown",
  code: "0000000",
  name: "Ngành đào tạo",
  groupId: "cntt",
  riasec: ["I", "R", "C"],
  summary: "",
  description: "",
  curriculum: [],
  careers: [],
  demand: "Trung bình",
  growth: 0,
};

async function buildViews(programs: Program[], score?: number | null, method: AdmissionMethodKey = "thpt", admin = false): Promise<ProgramView[]> {
  const [schools, majors] = admin
    ? await Promise.all([repositories.catalogAdmin.listSchools(), repositories.catalogAdmin.listMajors()])
    : await Promise.all([repositories.schools.findAll(), repositories.majors.findAll()]);
  const schoolMap = new Map(schools.map((s) => [s.id, s]));
  const majorMap = new Map(majors.map((m) => [m.id, m]));
  return programs.map((program) => ({
    program,
    school: schoolMap.get(program.schoolId) ?? fallbackSchool,
    major: majorMap.get(program.majorId) ?? fallbackMajor,
    latestCutoff: cutoffFor(program, method)?.score ?? null,
    cutoffEstimated: !!cutoffFor(program, method)?.estimated,
    cutoffMethod: method,
    fit: computeFit(score, program, method),
  }));
}

function inTuitionRange(p: Program, range: TuitionRange): boolean {
  const r = TUITION_RANGES[range];
  // Chương trình phù hợp nếu mức học phí tối thiểu nằm trong khoảng lựa chọn.
  return p.tuitionMin >= r.min && p.tuitionMin < r.max;
}

function applyFilters(views: ProgramView[], f: ProgramFilters): ProgramView[] {
  return views.filter(({ program, school, major }) => {
    if (f.method && f.method !== "thpt" && !cutoffFor(program, f.method)) return false;
    if (f.q && !matchesQuery(f.q, program.name, major.name, school.name, school.shortName, school.code, program.admissionCode)) return false;
    if (f.combos?.length && !program.combos.some((c) => f.combos!.includes(c))) return false;
    if (f.tuition && !inTuitionRange(program, f.tuition)) return false;
    if (f.regions?.length && !f.regions.includes(school.region)) return false;
    if (f.types?.length && !f.types.includes(school.type)) return false;
    if (f.groups?.length && !f.groups.includes(major.groupId)) return false;
    if (f.majors?.length && !f.majors.includes(major.id)) return false;
    return true;
  });
}

function sortViews(views: ProgramView[], sort: ProgramSort, score?: number): ProgramView[] {
  const byCutoffDesc = (a: ProgramView, b: ProgramView) => (b.latestCutoff ?? -1) - (a.latestCutoff ?? -1);
  const copy = [...views];
  switch (sort) {
    case "diem-giam":
      return copy.sort(byCutoffDesc);
    case "hoc-phi-tang":
      return copy.sort((a, b) => a.program.tuitionMin - b.program.tuitionMin || byCutoffDesc(a, b));
    case "ten":
      return copy.sort((a, b) => a.program.name.localeCompare(b.program.name, "vi"));
    case "phu-hop":
    default: {
      if (score == null) return copy.sort(byCutoffDesc);
      // Ưu tiên nhóm "vừa sức", rồi "an toàn", cuối cùng "thử sức"; trong nhóm xếp theo điểm chuẩn cao → thấp.
      const rank = (v: ProgramView) => (v.fit?.level === "vua-suc" ? 0 : v.fit?.level === "an-toan" ? 1 : v.fit ? 2 : 3);
      return copy.sort((a, b) => rank(a) - rank(b) || byCutoffDesc(a, b));
    }
  }
}

export const programService = {
  async search(filters: ProgramFilters): Promise<ProgramSearchResult> {
    let list = await repositories.programs.findAll();
    if (filters.majors?.length) {
      const set = new Set(filters.majors);
      list = list.filter((p) => set.has(p.majorId));
    }
    const all = await buildViews(list, filters.score, filters.method);
    const filtered = sortViews(applyFilters(all, filters), filters.sort ?? "phu-hop", filters.score);
    const pageSize = filters.pageSize ?? 6;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);

    const suggestions: SearchSuggestion[] = [];
    if (filtered.length === 0) {
      const tryRelax = (label: string, patch: Partial<ProgramFilters>) => {
        const count = applyFilters(all, { ...filters, ...patch }).length;
        if (count > 0) suggestions.push({ label, patch, count });
      };
      if (filters.tuition) tryRelax("Bỏ giới hạn học phí", { tuition: undefined });
      if (filters.regions?.length) tryRelax("Mở rộng ra mọi khu vực", { regions: [] });
      if (filters.types?.length) tryRelax("Tất cả loại hình trường", { types: [] });
      if (filters.combos?.length) tryRelax("Mọi tổ hợp xét tuyển", { combos: [] });
      if (filters.method && filters.method !== "thpt") tryRelax("Mọi phương thức xét tuyển", { method: undefined, score: undefined });
      if (filters.q) tryRelax(`Bỏ từ khoá “${filters.q}”`, { q: undefined });
      if (suggestions.length === 0 && filters.q) {
        tryRelax(`Chỉ giữ từ khoá “${filters.q}”`, { tuition: undefined, regions: [], types: [], combos: [], groups: [], majors: [] });
      }
    }

    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageCount,
      pageSize,
      suggestions,
    };
  },

  async getBySlug(slug: string, score?: number | null) {
    const program = await repositories.programs.findBySlug(slug);
    if (!program) return null;
    const [view] = await buildViews([program], score);
    const similar = (await buildViews(await repositories.programs.findByMajor(program.majorId), score))
      .filter((v) => v.program.id !== program.id)
      .sort((a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0))
      .slice(0, 3);
    return { ...view, similar };
  },

  /** Tối đa 3 chương trình cho trang so sánh. */
  async getByIds(ids: string[], score?: number | null) {
    return buildViews(await repositories.programs.findByIds(ids.slice(0, 3)), score);
  },

  /** Tra cứu nhiều chương trình (danh sách đã lưu, nguyện vọng). */
  async lookup(ids: string[], score?: number | null, method: AdmissionMethodKey = "thpt") {
    return buildViews(await repositories.programs.findByIds(ids.slice(0, 100)), score, method);
  },

  /** Toàn bộ chương trình kèm trường/ngành (dùng cho gợi ý, trang quản trị). */
  async listAll() {
    return buildViews(await repositories.programs.findAll());
  },

  /** Quản trị: gồm cả chương trình/trường/ngành đang ẩn. */
  async listAllAdmin() {
    const views = await buildViews(await repositories.catalogAdmin.listPrograms(), null, "thpt", true);
    return views.filter((v) => v.school && v.major);
  },

  async lookupAdmin(ids: string[]) {
    const set = new Set(ids);
    const views = await buildViews((await repositories.catalogAdmin.listPrograms()).filter((p) => set.has(p.id)), null, "thpt", true);
    return views.filter((v) => v.school && v.major);
  },

  async listBySchool(schoolId: string, score?: number | null) {
    return (await buildViews(await repositories.programs.findBySchool(schoolId), score)).sort(
      (a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0),
    );
  },

  async listByMajor(majorId: string, score?: number | null) {
    return (await buildViews(await repositories.programs.findByMajor(majorId), score)).sort(
      (a, b) => (b.latestCutoff ?? 0) - (a.latestCutoff ?? 0),
    );
  },

  async stats() {
    const [programs, schools] = await Promise.all([repositories.programs.findAll(), repositories.schools.findAll()]);
    return { programs: programs.length, schools: schools.length };
  },
};
