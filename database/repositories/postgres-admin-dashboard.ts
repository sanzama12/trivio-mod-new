import type { Program } from "@/domain/types";
import { query } from "@database/client";

export interface AdminDashboardProgram { program: Program; schoolName: string; majorName: string }
type DashboardRow = {
  id: string; slug: string; schoolId: string; majorId: string; name: string;
  admissionCode: string; source: string; sourceUrl: string | null;
  schoolVerifiedAt: string | null; adminVerifiedAt: string | null; hidden: boolean;
  schoolName: string; majorName: string; schoolCount: string | number;
  cutoffs: Program["cutoffs"]; altCutoffs: Program["altCutoffs"];
};


export const postgresAdminDashboardRepository = {
  async overviewCatalog(): Promise<{ programs: AdminDashboardProgram[]; schoolCount: number }> {
    const rows = await query<DashboardRow>(`
      WITH cutoff_agg AS (
        SELECT program_id,
          COALESCE(jsonb_agg(jsonb_build_object('year', year, 'score', score) ORDER BY year DESC)
            FILTER (WHERE method_code = 'thpt'), '[]'::jsonb) AS cutoffs,
          COALESCE(jsonb_agg(jsonb_build_object('method', method_code, 'year', year, 'score', score, 'estimated', is_estimated) ORDER BY year DESC)
            FILTER (WHERE method_code <> 'thpt'), '[]'::jsonb) AS alt_cutoffs
        FROM trovio.program_cutoffs
        GROUP BY program_id
      ),
      school_stats AS (
        SELECT count(*) AS school_count FROM trovio.schools WHERE NOT hidden
      )
      SELECT p.id, p.slug, p.school_id AS "schoolId", p.major_id AS "majorId",
        p.name AS name,
        p.admission_code AS "admissionCode",
        p.source AS source,
        p.source_url AS "sourceUrl",
        p.school_verified_at::text AS "schoolVerifiedAt",
        p.admin_verified_at::text AS "adminVerifiedAt",
        p.hidden AS hidden,
        s.short_name AS "schoolName", m.name AS "majorName",
        stats.school_count AS "schoolCount",
        COALESCE(cutoffs.cutoffs, '[]'::jsonb) AS cutoffs,
        COALESCE(cutoffs.alt_cutoffs, '[]'::jsonb) AS "altCutoffs"
      FROM trovio.programs p
      JOIN trovio.schools s ON s.id = p.school_id
      JOIN trovio.majors m ON m.id = p.major_id
      CROSS JOIN school_stats stats
      LEFT JOIN cutoff_agg cutoffs ON cutoffs.program_id = p.id
      ORDER BY p.id
    `);
    const programs = rows.map((r) => {
      const base: Program = {
        id: r.id, slug: r.slug, schoolId: r.schoolId, majorId: r.majorId,
        name: r.name, admissionCode: r.admissionCode, trainingType: "Chính quy",
        campus: "", combos: [],
        cutoffs: (r.cutoffs ?? []).map((c) => ({ year: Number(c.year), score: Number(c.score) })),
        altCutoffs: (r.altCutoffs ?? []).map((c) => ({ ...c, year: Number(c.year), score: Number(c.score) })),
        tuitionMin: 0, tuitionMax: 0, durationYears: 4, quota: 0,
        competition: "Trung bình", methods: [], overview: "", updatedAt: "",
        source: r.source || "", sourceUrl: r.sourceUrl,
        schoolVerifiedAt: r.schoolVerifiedAt, adminVerifiedAt: r.adminVerifiedAt, hidden: !!r.hidden,
      };
      return { program: base, schoolName: r.schoolName, majorName: r.majorName };
    });
    return { programs, schoolCount: Number(rows[0]?.schoolCount ?? 0) };
  },
  async badges() {
    const [row] = await query<{ qa: string | number; overview: string | number; users: string | number }>(`
      SELECT
        (SELECT COALESCE(sum(CASE WHEN payload->>'status' = 'pending' THEN 1 ELSE 0 END
          + COALESCE((SELECT count(*) FROM jsonb_array_elements(COALESCE(payload->'answers', '[]'::jsonb)) a WHERE a->>'status' = 'pending'), 0)), 0)
          FROM trovio.app_documents WHERE collection = 'qa-question') AS qa,
        0 AS overview,
        0 AS users
    `);
    return { qa: Number(row?.qa ?? 0), overview: Number(row?.overview ?? 0), users: Number(row?.users ?? 0) };
  },
};
