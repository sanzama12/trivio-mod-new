import type { Major, RiasecResult, RiasecType } from "./types";
import { matchMajor } from "./riasec";

export interface RiasecStudyGroup {
  id: string;
  name: string;
  riasec: [RiasecType, RiasecType, RiasecType];
}

export function rankRiasecStudyGroups(
  result: Pick<RiasecResult, "percents" | "isFlatProfile">,
  groups: RiasecStudyGroup[],
  limit = 3,
) {
  if (result.isFlatProfile) return [];
  return groups.map((group) => {
    const score = group.riasec.reduce((sum, type, index) => sum + result.percents[type] * (3 - index), 0) / 6;
    return { ...group, score: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "vi")).slice(0, limit);
}

export interface RiasecMajorSuggestion {
  major: Pick<Major, "id" | "slug" | "code" | "name" | "summary">;
  group: Pick<RiasecStudyGroup, "id" | "name" | "riasec">;
  interestIndex: number;
  basis: "major" | "group";
  programCount: number;
  schoolCount: number;
}

export function suggestRiasecMajors(
  result: Pick<RiasecResult, "percents" | "isFlatProfile">,
  groups: RiasecStudyGroup[],
  majors: Major[],
  counts: { programCountByMajor: Record<string, number>; schoolCountByMajor?: Record<string, number> },
  limit = 6,
): RiasecMajorSuggestion[] {
  const rankedGroups = rankRiasecStudyGroups(result, groups, 3);
  const ranked = rankedGroups.filter((group) => group.score >= Math.max(20, rankedGroups[0].score - 15));
  if (!ranked.length) return [];
  const candidates = ranked.map((group) => majors
    .filter((major) => major.groupId === group.id && (counts.programCountByMajor[major.id] ?? 0) > 0)
    .map((major) => ({
      major: { id: major.id, slug: major.slug, code: major.code, name: major.name, summary: major.summary },
      group: { id: group.id, name: group.name, riasec: group.riasec },
      interestIndex: major.riasec.length ? matchMajor(result, major) : group.score,
      basis: major.riasec.length ? "major" as const : "group" as const,
      programCount: counts.programCountByMajor[major.id],
      schoolCount: counts.schoolCountByMajor?.[major.id] ?? 0,
    }))
    .sort((a, b) => Number(b.basis === "major") - Number(a.basis === "major") ||
      b.interestIndex - a.interestIndex || b.programCount - a.programCount || a.major.name.localeCompare(b.major.name, "vi")));
  const suggestions: RiasecMajorSuggestion[] = [];
  for (let index = 0; suggestions.length < limit && candidates.some((items) => index < items.length); index++) {
    for (const items of candidates) {
      if (items[index]) suggestions.push(items[index]);
      if (suggestions.length >= limit) break;
    }
  }
  return suggestions;
}
