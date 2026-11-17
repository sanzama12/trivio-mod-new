import type { Major, Program } from "../domain/types";
import { contentViewWeight, sanitizeContentViews, type ContentView } from "../domain/browsing";

export function buildBrowsingAffinities(views: ContentView[], majors: Major[], programs: Program[], now = Date.now()) {
  const majorById = new Map(majors.map((major) => [major.id, major]));
  const programById = new Map(programs.map((program) => [program.id, program]));
  const schoolMajors = new Map<string, Set<string>>();
  for (const program of programs) {
    const ids = schoolMajors.get(program.schoolId) ?? new Set<string>();
    ids.add(program.majorId);
    schoolMajors.set(program.schoolId, ids);
  }
  const majorWeights = new Map<string, number>();
  const groupWeights = new Map<string, number>();
  for (const view of sanitizeContentViews(views, now)) {
    const weight = contentViewWeight(view, now);
    const ids = view.kind === "school_view"
      ? [...(schoolMajors.get(view.id) ?? [])]
      : [view.kind === "program_view" ? programById.get(view.id)?.majorId : view.id];
    // A broad university view contributes less to each individual major.
    const share = view.kind === "school_view" ? weight * 0.5 / Math.max(1, ids.length) : weight;
    for (const id of ids) {
      const major = id ? majorById.get(id) : undefined;
      if (!major) continue;
      majorWeights.set(major.id, (majorWeights.get(major.id) ?? 0) + share);
      groupWeights.set(major.groupId, (groupWeights.get(major.groupId) ?? 0) + share);
    }
  }
  return { majorWeights, groupWeights };
}

/** Bounded boosts keep browsing subordinate to explicit interests. */
export function browsingBoost(weight: number, maximum = 24): number {
  return maximum * weight / (weight + 3);
}
