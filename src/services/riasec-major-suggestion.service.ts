import "server-only";
import type { RiasecResult } from "@/domain/types";
import { suggestRiasecMajors } from "@/domain/riasec-guidance";
import { riasecForGroup } from "./major-mapping.service";
import { repositories } from "@database/repositories";

export async function getRiasecMajorSuggestions(result: RiasecResult) {
  if (result.isFlatProfile) return [];
  const { groups, majors, stats } = await repositories.catalog.findDiscoveryCatalog();
  const studyGroups = groups.flatMap((group) => {
    const riasec = riasecForGroup(group.id);
    return riasec ? [{ id: group.id, name: group.name, riasec }] : [];
  });
  return suggestRiasecMajors(result, studyGroups, majors, stats);
}
