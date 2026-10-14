/** Dữ liệu máy chủ cho ma trận quyết định; thuật toán chấm điểm thuần ở decision.ts. */
import { repositories } from "../repositories";
import type { DecisionRow } from "./decision";
import { outcomeService } from "./outcome.service";
import { summarize } from "./review.service";

export const decisionDataService = {
  async getRows(ids: string[]): Promise<DecisionRow[]> {
    const [programs, schools, majors, outcomes, reviews] = await Promise.all([
      repositories.programs.findByIds(ids),
      repositories.schools.findAll(),
      repositories.majors.findAll(),
      outcomeService.listMajors(),
      repositories.reviews.listByStatus(["approved"]),
    ]);
    return ids
      .map((id) => programs.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => {
        const school = schools.find((s) => s.id === p.schoolId)!;
        const major = majors.find((m) => m.id === p.majorId)!;
        const out = outcomes.find((o) => o.major.id === p.majorId)?.outcome ?? null;
        const sum = summarize(reviews.filter((r) => r.schoolId === p.schoolId));
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
          salaryStart: out?.startingSalary?.metric.value ?? null,
          salaryDemo: out?.demoOnly ?? true,
          reviewAvg: sum.overall,
          reviewCount: sum.count,
        };
      });
  },
};
