import "server-only";
import { repositories } from "@database/repositories";
import { cutoffTrend, type TrendDirection } from "../lib/trend";

export interface ProgramTrendRow {
  programId: string;
  slug: string;
  name: string;
  schoolName: string;
  majorName: string;
  latestYear: number;
  latestScore: number;
  totalChange: number;
  latestChange: number | null;
  direction: TrendDirection;
  years: number;
}

export interface MajorTrendRow {
  majorId: string;
  slug: string;
  name: string;
  programs: number;
  averageChange: number;
  rising: number;
  falling: number;
}

/** Phân tích xu hướng điểm chuẩn điểm thi THPT; chỉ mô tả biến động đã xảy ra, không dự đoán. */
export const trendService = {
  async report(): Promise<{ programs: ProgramTrendRow[]; majors: MajorTrendRow[]; years: number[] }> {
    const [programs, schools, majors] = await Promise.all([repositories.programs.findAll(), repositories.schools.findAll(), repositories.majors.findAll()]);
    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const majorMap = new Map(majors.map((m) => [m.id, m]));
    const rows: ProgramTrendRow[] = [];
    for (const p of programs) {
      if (p.hidden) continue;
      const t = cutoffTrend(p.cutoffs);
      if (t.totalChange == null) continue;
      const last = t.points[t.points.length - 1];
      rows.push({
        programId: p.id,
        slug: p.slug,
        name: p.name,
        schoolName: schoolMap.get(p.schoolId)?.shortName ?? "",
        majorName: majorMap.get(p.majorId)?.name ?? "",
        latestYear: last.year,
        latestScore: last.score,
        totalChange: t.totalChange,
        latestChange: t.latestChange,
        direction: t.direction,
        years: t.points.length,
      });
    }
    const byMajor = new Map<string, ProgramTrendRow[]>();
    for (const r of rows) {
      const id = programs.find((p) => p.id === r.programId)!.majorId;
      (byMajor.get(id) ?? byMajor.set(id, []).get(id)!).push(r);
    }
    const majorRows: MajorTrendRow[] = [...byMajor].map(([majorId, list]) => {
      const m = majorMap.get(majorId)!;
      const avg = list.reduce((sum, r) => sum + r.totalChange, 0) / list.length;
      return {
        majorId,
        slug: m.slug,
        name: m.name,
        programs: list.length,
        averageChange: Math.round(avg * 100) / 100,
        rising: list.filter((r) => r.direction === "tang").length,
        falling: list.filter((r) => r.direction === "giam").length,
      };
    });
    return { programs: rows, majors: majorRows, years: [...new Set(rows.map((r) => r.latestYear))].sort((a, b) => b - a) };
  },
};
