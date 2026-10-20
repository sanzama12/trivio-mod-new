/** Dữ liệu máy chủ cho ma trận quyết định; thuật toán chấm điểm thuần ở decision.ts. */
import { repositories } from "@database/repositories";
import type { DecisionRow } from "./decision";

export const decisionDataService = {
  async getRows(ids: string[]): Promise<DecisionRow[]> {
    const [programs, schools, majors] = await Promise.all([
      repositories.programs.findByIds(ids),
      repositories.schools.findAll(),
      repositories.majors.findAll(),
    ]);
    return ids
      .map((id) => programs.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => {
        const school = schools.find((s) => s.id === p.schoolId)!;
        const major = majors.find((m) => m.id === p.majorId)!;
        const cutoffs: DecisionRow["cutoffs"] = {};
        if (p.cutoffs[0]) cutoffs.thpt = p.cutoffs[0].score;
        for (const a of p.altCutoffs ?? []) cutoffs[a.method] = a.score;
        return {
          programId: p.id,
          slug: p.slug,
          name: p.name,
          schoolName: school.name,
          schoolCode: school.code,
          city: school.city,
          region: school.region,
          majorRiasec: major.riasec,
          cutoffs,
          tuitionMin: p.tuitionMin,
          tuitionMax: p.tuitionMax,
        };
      });
  },
};
