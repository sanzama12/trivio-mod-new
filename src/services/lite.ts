/**
 * Dạng rút gọn của ngành/chương trình để truyền xuống client component (công cụ chọn môn, mục tiêu, kế hoạch B…).
 * Chỉ chứa số liệu công khai.
 */
import type { CutoffScore, Major, MethodCutoff, Region } from "../domain/types";
import type { ProgramView } from "./program.service";

export interface LiteMajor {
  id: string;
  slug: string;
  name: string;
  groupId: string;
  riasec: Major["riasec"];
}

export interface LiteProgram {
  id: string;
  slug: string;
  name: string;
  majorId: string;
  groupId: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  city: string;
  region: Region;
  trainingType: string;
  combos: string[];
  cutoffs: CutoffScore[];
  altCutoffs: MethodCutoff[];
  tuitionMin: number;
  tuitionMax: number;
}

export const toLiteMajor = (m: Major): LiteMajor => ({ id: m.id, slug: m.slug, name: m.name, groupId: m.groupId, riasec: m.riasec });

export const toLiteProgram = ({ program: p, school: s, major: m }: ProgramView): LiteProgram => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  majorId: m.id,
  groupId: m.groupId,
  schoolId: s.id,
  schoolName: s.name,
  schoolCode: s.code,
  city: s.city,
  region: s.region,
  trainingType: p.trainingType,
  combos: p.combos,
  cutoffs: p.cutoffs,
  altCutoffs: p.altCutoffs ?? [],
  tuitionMin: p.tuitionMin,
  tuitionMax: p.tuitionMax,
});
