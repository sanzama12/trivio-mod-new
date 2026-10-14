/**
 * SERVICE LAYER — danh mục trường, ngành, tổ hợp môn.
 */
import type { Major, MajorGroup, Region, School, SchoolType } from "../domain/types";
import { repositories } from "../repositories";
import { firstLetterVi, matchesQuery } from "../lib/text";

export interface MajorListItem {
  major: Major;
  group: MajorGroup;
  programCount: number;
}

export const catalogService = {
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

  async getGroupsWithCounts() {
    const [groups, majors] = await Promise.all([repositories.majors.findGroups(), repositories.majors.findAll()]);
    return groups.map((g) => ({ group: g, majorCount: majors.filter((m) => m.groupId === g.id).length }));
  },

  async listMajors(opts: { group?: string; q?: string; letter?: string } = {}): Promise<MajorListItem[]> {
    const [groups, majors, programs] = await Promise.all([
      repositories.majors.findGroups(),
      repositories.majors.findAll(),
      repositories.programs.findAll(),
    ]);
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const defaultGroup: MajorGroup = { id: "khac", slug: "khac", name: "Khác", icon: "book", tone: "slate" };
    const countByMajor = new Map<string, number>();
    for (const p of programs) countByMajor.set(p.majorId, (countByMajor.get(p.majorId) ?? 0) + 1);
    return majors
      .filter((m) => !opts.group || m.groupId === opts.group)
      .filter((m) => !opts.q || matchesQuery(opts.q, m.name, m.code, m.summary))
      .filter((m) => !opts.letter || firstLetterVi(m.name) === opts.letter)
      .map((major) => ({
        major,
        group: groupMap.get(major.groupId) ?? defaultGroup,
        programCount: countByMajor.get(major.id) ?? 0,
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

  async listSchools(): Promise<School[]> {
    return repositories.schools.findAll();
  },

  /** Tìm trường; giữ quy ước limit = 0 là trả toàn bộ danh sách. */
  async searchSchools(input: { q?: string; region?: Region; type?: SchoolType; city?: string; page: number; limit: number }) {
    let schools = await repositories.schools.findAll();
    if (input.q) schools = schools.filter((s) => matchesQuery(input.q!, s.name, s.shortName, s.code, s.city, s.description));
    if (input.region) schools = schools.filter((s) => s.region === input.region);
    if (input.type) schools = schools.filter((s) => s.type === input.type);
    if (input.city) schools = schools.filter((s) => s.city.toLowerCase().includes(input.city!));
    const total = schools.length;
    const limit = Number.isInteger(input.limit) && input.limit > 0 ? input.limit : 0;
    const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
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
};
