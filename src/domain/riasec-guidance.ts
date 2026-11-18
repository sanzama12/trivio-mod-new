import type { RiasecResult, RiasecType } from "./types";

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
