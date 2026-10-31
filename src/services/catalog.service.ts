/**
 * SERVICE LAYER — danh mục trường, ngành, tổ hợp môn.
 */
import type { Major, MajorGroup, Program, Region, School, SchoolType } from "../domain/types";
import { repositories } from "@database/repositories";
import { firstLetterVi, matchesQuery } from "../lib/text";

import { countBy } from '../lib/collections';

import type { MajorGroupSummary, MajorListItem, SchoolCompareItem } from "../models/dtos";
export type { MajorGroupSummary, MajorListItem, SchoolCompareItem };

export const catalogService = {
  async getDiscoveryPage(opts: { group?: string; q?: string; letter?: string } = {}) {
    const { groups, majors, schools, stats } = await repositories.catalog.findDiscoveryCatalog();
    const countByGroup = countBy(majors, (major) => major.groupId);
    const summaries: MajorGroupSummary[] = groups.map((group) => ({
      group,
      majorCount: countByGroup.get(group.id) ?? 0,
      programCount: stats.programCountByGroup[group.id] ?? 0,
      schoolCount: stats.schoolCountByGroup[group.id] ?? 0,
    }));
    const groupMap = new Map(groups.map((group) => [group.id, group]));
    const defaultGroup: MajorGroup = { id: "khac", slug: "khac", name: "Khác", icon: "book", tone: "slate" };
    const items: MajorListItem[] = majors
      .filter((major) => !opts.group || major.groupId === opts.group)
      .filter((major) => !opts.q || matchesQuery(opts.q, major.name, major.code, major.summary))
      .filter((major) => !opts.letter || firstLetterVi(major.name) === opts.letter)
      .map((major) => ({
        major,
        group: groupMap.get(major.groupId) ?? defaultGroup,
        programCount: stats.programCountByMajor[major.id] ?? 0,
        schoolCount: stats.schoolCountByMajor?.[major.id] ?? stats.programCountByMajor[major.id] ?? 0,
      }))
      .sort((a, b) => a.major.name.localeCompare(b.major.name, "vi"));
    return { groups: summaries, items, schools };
  },

  /** Danh mục công khai theo thứ tự gốc, dùng cho các luồng lập kế hoạch. */
  async getMajors(): Promise<Major[]> {
    return repositories.majors.findAll();
  },

  async getGroups(): Promise<MajorGroup[]> {
    return repositories.majors.findGroups();
  },

  async getCombos() {
    return repositories.catalog.findCombos();
  },

  async getSubjects() {
    return repositories.catalog.findSubjects();
  },

  async getFaqGroups() {
    return repositories.catalog.findFaq();
  },

  async getGroupsWithCounts(): Promise<MajorGroupSummary[]> {
    const [groups, majors, stats] = await Promise.all([
      repositories.majors.findGroups(),
      repositories.majors.findAll(),
      repositories.catalog.findDiscoveryStats(),
    ]);
    const countByGroup = countBy(majors, (major) => major.groupId);
    return groups.map((group) => ({
      group,
      majorCount: countByGroup.get(group.id) ?? 0,
      programCount: stats.programCountByGroup[group.id] ?? 0,
      schoolCount: stats.schoolCountByGroup[group.id] ?? 0,
    }));
  },

  async listMajors(opts: { group?: string; q?: string; letter?: string } = {}): Promise<MajorListItem[]> {
    const [groups, majors, stats] = await Promise.all([
      repositories.majors.findGroups(),
      repositories.majors.findAll(),
      repositories.catalog.findDiscoveryStats(),
    ]);
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const defaultGroup: MajorGroup = { id: "khac", slug: "khac", name: "Khác", icon: "book", tone: "slate" };
    return majors
      .filter((m) => !opts.group || m.groupId === opts.group)
      .filter((m) => !opts.q || matchesQuery(opts.q, m.name, m.code, m.summary))
      .filter((m) => !opts.letter || firstLetterVi(m.name) === opts.letter)
      .map((major) => ({
        major,
        group: groupMap.get(major.groupId) ?? defaultGroup,
        programCount: stats.programCountByMajor[major.id] ?? 0,
        schoolCount: stats.schoolCountByMajor?.[major.id] ?? stats.programCountByMajor[major.id] ?? 0,
      }))
      .sort((a, b) => a.major.name.localeCompare(b.major.name, "vi"));
  },

  async getMajorBySlug(slug: string) {
    const major = await repositories.majors.findBySlug(slug);
    if (!major) return null;
    const groups = await repositories.majors.findGroups();
    const defaultGroup: MajorGroup = { id: "khac", slug: "khac", name: "Khác", icon: "book", tone: "slate" };
    return { major, group: groups.find((g) => g.id === major.groupId) ?? defaultGroup };
  },

  async getSchoolByIdOrSlug(idOrSlug: string) {
    const [byId, bySlug] = await Promise.all([repositories.schools.findById(idOrSlug), repositories.schools.findBySlug(idOrSlug)]);
    return byId ?? bySlug;
  },

  async getSchoolDetail(idOrSlug: string) {
    const school = await this.getSchoolByIdOrSlug(idOrSlug);
    if (!school) return null;
    return { school, programs: await repositories.programs.findBySchool(school.id) };
  },

  async getMajorDetail(slug: string) {
    const detail = await this.getMajorBySlug(slug);
    if (!detail) return null;
    return { ...detail, programs: await repositories.programs.findByMajor(detail.major.id) };
  },

  async listSchools(): Promise<School[]> {
    return repositories.schools.findAll();
  },

  /** Tìm trường theo tên, khu vực, ngành đào tạo. */
  async searchSchools(input: {
    q?: string;
    region?: Region;
    type?: SchoolType;
    city?: string;
    majorId?: string;
    majorQuery?: string;
    page?: number;
    limit?: number;
  }) {
    let schools = await repositories.schools.findAll();
    let programs: Program[] | null = null;

    if (input.majorId || input.majorQuery) {
      programs = await repositories.programs.findAll();
      const majors = await repositories.majors.findAll();
      const majorMap = new Map(majors.map((m) => [m.id, m]));
      const matchedSchoolIds = new Set<string>();

      for (const p of programs) {
        if (input.majorId && p.majorId === input.majorId) {
          matchedSchoolIds.add(p.schoolId);
        } else if (input.majorQuery) {
          const m = majorMap.get(p.majorId);
          if (matchesQuery(input.majorQuery, p.name, m?.name, m?.code)) {
            matchedSchoolIds.add(p.schoolId);
          }
        }
      }
      schools = schools.filter((s) => matchedSchoolIds.has(s.id));
    }

    if (input.q) {
      if (!programs) programs = await repositories.programs.findAll();
      const schoolProgramMap = new Set<string>();
      for (const p of programs) {
        if (matchesQuery(input.q, p.name)) {
          schoolProgramMap.add(p.schoolId);
        }
      }
      schools = schools.filter(
        (s) =>
          matchesQuery(input.q!, s.name, s.shortName, s.code, s.city, s.description) ||
          schoolProgramMap.has(s.id),
      );
    }
    if (input.region) schools = schools.filter((s) => s.region === input.region);
    if (input.type) schools = schools.filter((s) => s.type === input.type);
    if (input.city) schools = schools.filter((s) => s.city.toLowerCase().includes(input.city!));

    const total = schools.length;
    const limit = Number.isInteger(input.limit) && (input.limit ?? 0) > 0 ? (input.limit as number) : 0;
    const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? (input.page as number) : 1;
    return {
      items: limit > 0 ? schools.slice((page - 1) * limit, page * limit) : schools,
      total,
      page: limit > 0 ? page : 1,
      pageCount: limit > 0 ? Math.ceil(total / limit) : 1,
    };
  },

  async getSchoolBySlug(slug: string) {
    return repositories.schools.findBySlug(slug);
  },

  /** So sánh từ 2 đến 4 trường đại học chi tiết. */
  async compareSchools(schoolIds: string[]): Promise<SchoolCompareItem[]> {
    const safeIds = schoolIds.slice(0, 4);
    if (safeIds.length === 0) return [];

    const allSchools = await repositories.schools.findAll();
    const schoolMap = new Map(allSchools.map((s) => [s.id, s]));
    const allMajors = await repositories.majors.findAll();
    const majorMap = new Map(allMajors.map((m) => [m.id, m]));

    const result: SchoolCompareItem[] = [];

    for (const id of safeIds) {
      const school = schoolMap.get(id) ?? allSchools.find((s) => s.slug === id);
      if (!school) continue;

      const rawPrograms = await repositories.programs.findBySchool(school.id);

      const tuitionMins = rawPrograms.map((p) => p.tuitionMin).filter((t) => t > 0);
      const tuitionMaxs = rawPrograms.map((p) => p.tuitionMax).filter((t) => t > 0);
      const tuitionMin = tuitionMins.length ? Math.min(...tuitionMins) : 0;
      const tuitionMax = tuitionMaxs.length ? Math.max(...tuitionMaxs) : 0;

      // Unique methods
      const methodMap = new Map<string, string>();
      for (const p of rawPrograms) {
        for (const m of p.methods || []) {
          if (!methodMap.has(m.name)) {
            methodMap.set(m.name, m.tag);
          }
        }
      }
      const methods = Array.from(methodMap.entries()).map(([name, tag]) => ({ name, tag }));

      // Unique majors & latest cutoffs
      const majorsDict = new Map<string, { id: string; name: string; code: string; latestCutoff: number | null }>();
      for (const p of rawPrograms) {
        const m = majorMap.get(p.majorId);
        const mName = m?.name ?? p.name;
        const mCode = m?.code ?? p.admissionCode;
        const latest = p.cutoffs?.[0]?.score ?? null;
        if (!majorsDict.has(p.majorId)) {
          majorsDict.set(p.majorId, {
            id: p.majorId,
            name: mName,
            code: mCode,
            latestCutoff: latest,
          });
        }
      }
      const majors = Array.from(majorsDict.values());

      // Cutoffs by year
      const yearScoresMap = new Map<number, number[]>();
      for (const p of rawPrograms) {
        for (const c of p.cutoffs || []) {
          if (typeof c.score === "number" && c.score > 0) {
            if (!yearScoresMap.has(c.year)) yearScoresMap.set(c.year, []);
            yearScoresMap.get(c.year)!.push(c.score);
          }
        }
      }
      const cutoffsByYear = Array.from(yearScoresMap.entries())
        .map(([year, scores]) => ({
          year,
          avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          minScore: Math.min(...scores),
          maxScore: Math.max(...scores),
          count: scores.length,
        }))
        .sort((a, b) => a.year - b.year);

      const programsFormatted = rawPrograms.map((p) => ({
        id: p.id,
        name: p.name,
        admissionCode: p.admissionCode,
        majorId: p.majorId,
        majorName: majorMap.get(p.majorId)?.name ?? p.name,
        tuitionMin: p.tuitionMin,
        tuitionMax: p.tuitionMax,
        combos: p.combos ?? [],
        methods: (p.methods ?? []).map((m) => ({ name: m.name, tag: m.tag })),
        cutoffs: (p.cutoffs ?? []).map((c) => ({ year: c.year, score: c.score })),
      }));

      result.push({
        school,
        tuitionMin,
        tuitionMax,
        programCount: rawPrograms.length,
        majors,
        methods,
        cutoffsByYear,
        programs: programsFormatted,
      });
    }

    return result;
  },
};
