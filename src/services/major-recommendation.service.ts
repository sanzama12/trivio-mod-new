import 'server-only';

import type { Major, MajorGroup, Subject } from '@/domain/types';
import { RIASEC_INFO } from '@/domain/riasec';
import { matchesQuery } from '@/lib/text';
import { repositories } from '@database/repositories';

export interface MajorRecommendationInput {
  groupIds: string[];
  interestMajorIds: string[];
  strongSubjectIds: string[];
  interestIds?: string[];
  behaviorProgramIds: string[];
  query?: string;
}

export interface MajorRecommendation {
  major: Major;
  group: MajorGroup;
  score: number;
  reasons: string[];
  knowledge: string;
  careerOrientation: string;
  careers: string[];
  schoolCount: number;
  programCount: number;
}

const unique = (values: string[]) => new Set(values);

export const majorRecommendationService = {
  async recommend(input: MajorRecommendationInput, limit = 8): Promise<MajorRecommendation[]> {
    const { groups, majors, schools, stats } = await repositories.catalog.findDiscoveryCatalog();
    const [programs, combos, subjects, interests, subjectLinks, careerInfos] = await Promise.all([
      repositories.programs.findAll(),
      repositories.catalog.findCombos(),
      repositories.catalog.findSubjects(),
      repositories.interests.list(false),
      repositories.interests.listSubjectLinks(),
      repositories.majorCareers.getMany(),
    ]);
    const careerMap = new Map(careerInfos.map((info) => [info.majorId, info]));
    // Sở thích đã chọn → các ngành được quản trị viên liên kết (mỗi ngành ghi nhớ tên sở thích khớp).
    const interestsByMajor = new Map<string, string[]>();
    const selectedInterestIds = unique(input.interestIds ?? []);
    for (const interest of interests) {
      if (!selectedInterestIds.has(interest.id)) continue;
      for (const majorId of interest.majorIds) {
        const names = interestsByMajor.get(majorId);
        if (names) names.push(interest.name);
        else interestsByMajor.set(majorId, [interest.name]);
      }
    }
    const subjectLinkMap = new Map(subjectLinks.map((link) => [link.subjectId, new Set(link.majorIds)]));

    const selectedGroups = unique(input.groupIds);
    const selectedMajors = unique(input.interestMajorIds);
    const strongSubjects = unique(input.strongSubjectIds);
    const behaviorPrograms = unique(input.behaviorProgramIds);
    const majorMap = new Map(majors.map((major) => [major.id, major]));
    const groupMap = new Map(groups.map((group) => [group.id, group]));
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
    const comboMap = new Map(combos.map((combo) => [combo.code, combo.subjects]));
    const programsByMajor = new Map<string, typeof programs>();
    const behaviorMajorCounts = new Map<string, number>();
    const behaviorGroupCounts = new Map<string, number>();

    for (const program of programs) {
      const list = programsByMajor.get(program.majorId);
      if (list) list.push(program);
      else programsByMajor.set(program.majorId, [program]);
      if (!behaviorPrograms.has(program.id)) continue;
      behaviorMajorCounts.set(program.majorId, (behaviorMajorCounts.get(program.majorId) ?? 0) + 1);
      const groupId = majorMap.get(program.majorId)?.groupId;
      if (groupId) behaviorGroupCounts.set(groupId, (behaviorGroupCounts.get(groupId) ?? 0) + 1);
    }

    const selectedMajorGroups = new Set(
      input.interestMajorIds.map((id) => majorMap.get(id)?.groupId).filter((id): id is string => Boolean(id)),
    );
    const query = input.query?.trim().slice(0, 100) ?? '';
    const matchedSchoolIds = new Set(
      query ? schools.filter((school) => matchesQuery(query, school.name, school.shortName, school.code, school.city)).map((school) => school.id) : [],
    );
    const subjectName = (id: string) => subjectMap.get(id)?.short ?? subjectMap.get(id)?.name ?? id;

    return majors
      .map((major): MajorRecommendation | null => {
        const group = groupMap.get(major.groupId);
        if (!group) return null;
        let score = 0;
        const reasons: string[] = [];

        if (query && matchesQuery(query, major.name, major.code, major.summary, major.description)) {
          score += 50;
          reasons.push(`Liên quan trực tiếp tới từ khóa “${query}”`);
        } else if (query && matchesQuery(query, group.name, group.description)) {
          score += 28;
          reasons.push(`Thuộc nhóm ngành khớp từ khóa “${query}”`);
        }

        if (selectedMajors.has(major.id)) {
          score += 55;
          reasons.push('Ngành bạn đã chọn quan tâm');
        } else if (selectedMajorGroups.has(major.groupId)) {
          score += 18;
          reasons.push('Gần với ngành bạn đang quan tâm');
        }
        if (selectedGroups.has(major.groupId)) {
          score += 30;
          reasons.push(`Thuộc lĩnh vực ${group.name} bạn yêu thích`);
        }

        const matchedInterests = interestsByMajor.get(major.id);
        if (matchedInterests?.length) {
          score += Math.min(60, 40 + (matchedInterests.length - 1) * 10);
          reasons.push(`Liên quan sở thích “${matchedInterests.slice(0, 2).join('”, “')}”`);
        }
        const linkedSubjects = [...strongSubjects].filter((id) => subjectLinkMap.get(id)?.has(major.id));
        if (linkedSubjects.length) {
          score += Math.min(30, 22 + (linkedSubjects.length - 1) * 4);
          reasons.push(`Môn thế mạnh ${linkedSubjects.map((id) => subjectMap.get(id)?.short ?? id).join(', ')} gắn với ngành này`);
        }

        const relatedPrograms = programsByMajor.get(major.id) ?? [];
        if (matchedSchoolIds.size && relatedPrograms.some((program) => matchedSchoolIds.has(program.schoolId))) {
          score += 30;
          reasons.push('Được đào tạo tại trường khớp từ khóa tìm kiếm');
        }
        let bestSubjects: string[] = [];
        for (const program of relatedPrograms) {
          for (const comboCode of program.combos) {
            const matched = (comboMap.get(comboCode) ?? []).filter((id) => strongSubjects.has(id));
            if (matched.length > bestSubjects.length) bestSubjects = matched;
          }
        }
        if (strongSubjects.size && bestSubjects.length) {
          score += Math.round(35 * (bestSubjects.length / Math.min(3, strongSubjects.size)));
          reasons.push(`Có tổ hợp phù hợp môn thế mạnh: ${bestSubjects.map(subjectName).join(', ')}`);
        }

        const behaviorExact = behaviorMajorCounts.get(major.id) ?? 0;
        const behaviorGroup = behaviorGroupCounts.get(major.groupId) ?? 0;
        if (behaviorExact) {
          score += Math.min(25, 15 + behaviorExact * 5);
          reasons.push('Phù hợp các chương trình bạn đã chủ động lưu');
        } else if (behaviorGroup) {
          score += Math.min(12, 6 + behaviorGroup * 2);
          reasons.push('Cùng lĩnh vực với các lựa chọn đã lưu');
        }

        if (!score) return null;
        const career = careerMap.get(major.id);
        const riasec = major.riasec.map((type) => RIASEC_INFO[type].label.toLowerCase()).join(', ');
        return {
          major,
          group,
          score: Math.min(100, score),
          reasons: reasons.slice(0, 3),
          knowledge: career?.knowledge || major.description || major.summary,
          careerOrientation: career?.careerOrientation || `Định hướng phù hợp với môi trường công việc thiên về ${riasec}.`,
          careers: career?.careers ?? [],
          schoolCount: stats.schoolCountByMajor?.[major.id] ?? 0,
          programCount: stats.programCountByMajor[major.id] ?? 0,
        };
      })
      .filter((item): item is MajorRecommendation => item !== null)
      .sort((a, b) => b.score - a.score || b.programCount - a.programCount || a.major.name.localeCompare(b.major.name, 'vi'))
      .slice(0, Math.max(1, Math.min(limit, 12)));
  },
};
