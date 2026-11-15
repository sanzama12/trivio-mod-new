/**
 * SERVICE LAYER — nghiệp vụ tìm kiếm, gợi ý và so sánh chương trình đào tạo.
 * Chỉ phụ thuộc repository (qua `repositories`) và domain types.
 */
import type { AdmissionMethodKey, Major, Program, School } from "../domain/types";
import { repositories } from "@database/repositories";
import { matchesQuery } from "../lib/text";
import { hasTuitionData } from "../lib/format";
import { computeFit, cutoffFor, type FitInfo } from "./scoring.service";
import { TUITION_RANGES, type ProgramFilters, type ProgramSort, type TuitionRange } from "./program.filters";
export type { ProgramFilters, ProgramSort, TuitionRange } from "./program.filters";
import type { ProgramSearchResult, ProgramView, SchoolSearchSummary, SearchSuggestion } from "../models/dtos";
export type { ProgramSearchResult, ProgramView, SearchSuggestion };

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
  logoUrl: null,
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
    cutoffMethod: method,
    fit: computeFit(score, program, method),
  }));
}

function inTuitionRange(p: Program, range: TuitionRange): boolean {
  const r = TUITION_RANGES[range];
  // Chương trình phù hợp nếu mức học phí tối thiểu nằm trong khoảng lựa chọn.
  return hasTuitionData(p.tuitionMin, p.tuitionMax) && p.tuitionMin >= r.min && p.tuitionMin < r.max;
}

function applyFilters(views: ProgramView[], f: ProgramFilters): ProgramView[] {
  return views.filter(({ program, school, major, latestCutoff }) => {
    if (f.method && f.method !== "thpt" && !cutoffFor(program, f.method)) return false;
    if (f.score != null && (latestCutoff == null || latestCutoff > f.score)) return false;
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
      return copy.sort((a, b) => {
        const aKnown = hasTuitionData(a.program.tuitionMin, a.program.tuitionMax);
        const bKnown = hasTuitionData(b.program.tuitionMin, b.program.tuitionMax);
        if (aKnown !== bKnown) return aKnown ? -1 : 1;
        return a.program.tuitionMin - b.program.tuitionMin || byCutoffDesc(a, b);
      });
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
  /** Apply the existing admissions filters, then count and paginate distinct schools. */
  async searchSchools(filters: ProgramFilters) {
    const [schools, programs] = await Promise.all([
      repositories.schools.findAll(), repositories.programs.findAll(),
    ]);
    const views = await buildViews(programs, filters.score, filters.method);
    const matching = sortViews(applyFilters(views, filters), filters.sort ?? "phu-hop", filters.score);
    const visibleSchools = new Map(schools.map((school) => [school.id, school]));
    const distinct = new Map<string, School>();
    const matchesBySchool = new Map<string, ProgramView[]>();
    for (const view of matching) {
      const school = visibleSchools.get(view.school.id);
      if (!school) continue;
      distinct.set(school.id, school);
      const matches = matchesBySchool.get(school.id) ?? [];
      matches.push(view);
      matchesBySchool.set(school.id, matches);
    }
    // School-only searches also include schools whose programs have not been entered yet.
    const needsProgram = filters.score != null || filters.method || filters.combos?.length || filters.tuition || filters.groups?.length || filters.majors?.length;
    if (!needsProgram) {
      for (const school of schools) {
        if (filters.regions?.length && !filters.regions.includes(school.region)) continue;
        if (filters.types?.length && !filters.types.includes(school.type)) continue;
        if (filters.q && !matchesQuery(filters.q, school.name, school.shortName, school.code, school.city)) continue;
        if (!distinct.has(school.id)) distinct.set(school.id, school);
      }
    }
    const items = [...distinct.values()];
    if (filters.sort === "ten") items.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    const pageSize = filters.pageSize ?? 24;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
    const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
    const summaries: Record<string, SchoolSearchSummary> = {};
    for (const school of pageItems) {
      const matches = matchesBySchool.get(school.id) ?? [];
      const tuitions = matches.map(({ program }) => program).filter((p) => hasTuitionData(p.tuitionMin, p.tuitionMax));
      const cutoffs = matches.map((view) => view.latestCutoff).filter((score): score is number => score != null);
      const featured = matches[0]?.program;
      summaries[school.id] = {
        programCount: matches.length,
        tuitionMin: tuitions.length ? Math.min(...tuitions.map((p) => p.tuitionMin)) : null,
        tuitionMax: tuitions.length ? Math.max(...tuitions.map((p) => p.tuitionMax)) : null,
        cutoffMin: cutoffs.length ? Math.min(...cutoffs) : null,
        cutoffMax: cutoffs.length ? Math.max(...cutoffs) : null,
        method: filters.method ?? "thpt",
        featuredProgram: featured ? { name: featured.name, slug: featured.slug } : null,
      };
    }
    return { items: pageItems, summaries, total: items.length, page, pageCount, pageSize };
  },

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
      if (filters.score != null) tryRelax("Bỏ giới hạn điểm", { score: undefined });
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

  /** Tối đa 4 chương trình cho trang so sánh. */
  async getByIds(ids: string[], score?: number | null) {
    return buildViews(await repositories.programs.findByIds(ids.slice(0, 4)), score);
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
    const stats = await repositories.catalog.findDiscoveryStats();
    return { programs: stats.totalPrograms, schools: stats.totalSchools };
  },
};
