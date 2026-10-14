/**
 * Chỉ mục RAM cho catalog. Build một lần sau khi nạp cache, tra cứu O(1).
 */
import type { Major, Program, School } from "../domain/types";

export type CatalogIndex = {
  schoolById: Map<string, School>;
  schoolBySlug: Map<string, School>;
  majorById: Map<string, Major>;
  majorBySlug: Map<string, Major>;
  programById: Map<string, Program>;
  programBySlug: Map<string, Program>;
  programsBySchool: Map<string, Program[]>;
  programsByMajor: Map<string, Program[]>;
  programCountByMajor: Map<string, number>;
};

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

export function buildCatalogIndex(schools: School[], majors: Major[], programs: Program[]): CatalogIndex {
  const schoolById = new Map<string, School>();
  const schoolBySlug = new Map<string, School>();
  for (const s of schools) {
    schoolById.set(s.id, s);
    schoolBySlug.set(s.slug, s);
  }
  const majorById = new Map<string, Major>();
  const majorBySlug = new Map<string, Major>();
  for (const m of majors) {
    majorById.set(m.id, m);
    majorBySlug.set(m.slug, m);
  }
  const programById = new Map<string, Program>();
  const programBySlug = new Map<string, Program>();
  const programsBySchool = new Map<string, Program[]>();
  const programsByMajor = new Map<string, Program[]>();
  const programCountByMajor = new Map<string, number>();
  for (const p of programs) {
    programById.set(p.id, p);
    programBySlug.set(p.slug, p);
    push(programsBySchool, p.schoolId, p);
    push(programsByMajor, p.majorId, p);
    programCountByMajor.set(p.majorId, (programCountByMajor.get(p.majorId) ?? 0) + 1);
  }
  return {
    schoolById,
    schoolBySlug,
    majorById,
    majorBySlug,
    programById,
    programBySlug,
    programsBySchool,
    programsByMajor,
    programCountByMajor,
  };
}

export const emptyCatalogIndex = (): CatalogIndex => buildCatalogIndex([], [], []);
