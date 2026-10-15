import type { Program, SchoolSubmission } from "../domain/types";
import { query } from "../lib/db";

export interface AdminDashboardProgram { program: Program; schoolName: string; majorName: string }
export interface AdminSubmissionItem extends SchoolSubmission {
  fieldLabel: string; programName: string; schoolName: string; byEmail: string;
}
type DashboardRow = {
  id: string; slug: string; schoolId: string; majorId: string; name: string;
  admissionCode: string; source: string; sourceUrl: string | null;
  schoolVerifiedAt: string | null; adminVerifiedAt: string | null; hidden: boolean;
  schoolName: string; majorName: string; schoolCount: string | number;
  cutoffs: Program["cutoffs"]; altCutoffs: Program["altCutoffs"];
};
const FIELD_LABELS: Record<SchoolSubmission["field"], string> = {
  combos: "Tổ hợp", tuition: "Học phí", cutoff: "Điểm chuẩn", quota: "Chỉ tiêu",
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
        COALESCE(patch.payload->>'name', p.name) AS name,
        COALESCE(patch.payload->>'admissionCode', p.admission_code) AS "admissionCode",
        COALESCE(patch.payload->>'source', p.source) AS source,
        CASE WHEN patch.payload ? 'sourceUrl' THEN NULLIF(patch.payload->>'sourceUrl', '') ELSE p.source_url END AS "sourceUrl",
        CASE WHEN patch.payload ? 'schoolVerifiedAt' THEN NULLIF(patch.payload->>'schoolVerifiedAt', '') ELSE p.school_verified_at::text END AS "schoolVerifiedAt",
        CASE WHEN patch.payload ? 'adminVerifiedAt' THEN NULLIF(patch.payload->>'adminVerifiedAt', '') ELSE p.admin_verified_at::text END AS "adminVerifiedAt",
        COALESCE((patch.payload->>'hidden')::boolean, p.hidden) AS hidden,
        s.short_name AS "schoolName", m.name AS "majorName",
        stats.school_count AS "schoolCount",
        CASE WHEN patch.payload ? 'cutoffs' THEN patch.payload->'cutoffs' ELSE COALESCE(cutoffs.cutoffs, '[]'::jsonb) END AS cutoffs,
        CASE WHEN patch.payload ? 'altCutoffs' THEN patch.payload->'altCutoffs' ELSE COALESCE(cutoffs.alt_cutoffs, '[]'::jsonb) END AS "altCutoffs"
      FROM trovio.programs p
      JOIN trovio.schools s ON s.id = p.school_id
      JOIN trovio.majors m ON m.id = p.major_id
      CROSS JOIN school_stats stats
      LEFT JOIN cutoff_agg cutoffs ON cutoffs.program_id = p.id
      LEFT JOIN trovio.app_documents patch ON patch.collection = 'program-patch' AND patch.id = p.id
      WHERE NOT p.hidden ORDER BY p.id
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
  async pendingSubmissions(): Promise<AdminSubmissionItem[]> {
    const rows = await query<{ payload: SchoolSubmission; programName: string | null; schoolName: string | null; byEmail: string | null }>(`
      SELECT d.payload, p.name AS "programName", s.short_name AS "schoolName", u.email AS "byEmail"
      FROM trovio.app_documents d
      LEFT JOIN trovio.programs p ON p.id = d.payload->>'programId'
      LEFT JOIN trovio.schools s ON s.id = d.payload->>'schoolId'
      LEFT JOIN trovio.users u ON u.id = d.payload->>'userId'
      WHERE d.collection = 'school-submission' AND d.status = 'pending'
      ORDER BY d.updated_at DESC
    `);
    return rows.map((r) => ({ ...r.payload,
      fieldLabel: FIELD_LABELS[r.payload.field] ?? r.payload.field,
      programName: r.programName ?? r.payload.programId,
      schoolName: r.schoolName ?? r.payload.schoolId,
      byEmail: r.byEmail ?? "(đã xoá)",
    }));
  },
  async badges() {
    const [row] = await query<{ reviews: string | number; qa: string | number; overview: string | number; users: string | number }>(`
      SELECT
        (SELECT count(*) FROM trovio.app_documents WHERE collection = 'review' AND status IN ('pending', 'hidden')) AS reviews,
        (SELECT COALESCE(sum(CASE WHEN payload->>'status' = 'pending' THEN 1 ELSE 0 END
          + COALESCE((SELECT count(*) FROM jsonb_array_elements(COALESCE(payload->'answers', '[]'::jsonb)) a WHERE a->>'status' = 'pending'), 0)), 0)
          FROM trovio.app_documents WHERE collection = 'qa-question') AS qa,
        (SELECT count(*) FROM trovio.app_documents WHERE collection = 'school-submission' AND status = 'pending') AS overview,
        (SELECT count(*) FROM trovio.school_staff WHERE status = 'pending') AS users
    `);
    return { reviews: Number(row?.reviews ?? 0), qa: Number(row?.qa ?? 0),
      overview: Number(row?.overview ?? 0), users: Number(row?.users ?? 0) };
  },
};
