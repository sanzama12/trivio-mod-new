/**
 * Các bảng bổ sung theo tài liệu yêu cầu: sở thích, liên kết ngành, thông tin nghề nghiệp,
 * dữ liệu tuyển sinh theo năm, nguồn thông tin cho AI và lượt quan tâm ẩn danh.
 */
import { query, withTransaction } from "@database/client";
import { USAGE_KINDS, type AdmissionStatus, type AiSource, type Interest, type MajorCareerInfo, type ProgramYearData, type SubjectMajorLink, type UsageKind } from "@/domain/types";

const toNumber = (value: unknown): number | null => (value == null ? null : Number(value));

/* ───────────── Thông tin nghề nghiệp của ngành ───────────── */
export const postgresMajorCareerRepository = {
  async getMany(majorIds?: string[]): Promise<MajorCareerInfo[]> {
    const rows = await query<{ majorId: string; knowledge: string; careerOrientation: string; careers: string[] }>(
      `SELECT major_id AS "majorId", knowledge, career_orientation AS "careerOrientation", careers
       FROM trovio.major_career_info ${majorIds ? "WHERE major_id = ANY($1::text[])" : ""}`,
      majorIds ? [majorIds] : [],
    );
    return rows;
  },
  async get(majorId: string): Promise<MajorCareerInfo | null> {
    return (await this.getMany([majorId]))[0] ?? null;
  },
  async upsert(info: MajorCareerInfo): Promise<void> {
    await query(
      `INSERT INTO trovio.major_career_info (major_id, knowledge, career_orientation, careers)
       VALUES ($1, $2, $3, $4::text[])
       ON CONFLICT (major_id) DO UPDATE SET knowledge = EXCLUDED.knowledge,
         career_orientation = EXCLUDED.career_orientation, careers = EXCLUDED.careers`,
      [info.majorId, info.knowledge, info.careerOrientation, info.careers],
    );
  },
};

/* ───────────── Sở thích và liên kết ngành ───────────── */
export const postgresInterestRepository = {
  async list(includeHidden = true): Promise<Interest[]> {
    const rows = await query<Omit<Interest, "majorIds"> & { majorIds: string[] | null }>(
      `SELECT i.id, i.name, i.kind, i.description, i.hidden, i.position,
              COALESCE(array_agg(im.major_id ORDER BY im.major_id) FILTER (WHERE im.major_id IS NOT NULL), '{}') AS "majorIds"
       FROM trovio.interests i LEFT JOIN trovio.interest_majors im ON im.interest_id = i.id
       ${includeHidden ? "" : "WHERE NOT i.hidden"}
       GROUP BY i.id ORDER BY i.kind, i.position, i.name`,
    );
    return rows.map((row) => ({ ...row, majorIds: row.majorIds ?? [] }));
  },
  async upsert(input: Omit<Interest, "majorIds">, majorIds: string[]): Promise<void> {
    await withTransaction(async () => {
      await query(
        `INSERT INTO trovio.interests (id, name, kind, description, hidden, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind,
           description = EXCLUDED.description, hidden = EXCLUDED.hidden, position = EXCLUDED.position`,
        [input.id, input.name, input.kind, input.description, input.hidden, input.position],
      );
      await query("DELETE FROM trovio.interest_majors WHERE interest_id = $1", [input.id]);
      if (majorIds.length) {
        await query(
          `INSERT INTO trovio.interest_majors (interest_id, major_id)
           SELECT $1, m.id FROM trovio.majors m WHERE m.id = ANY($2::text[]) ON CONFLICT DO NOTHING`,
          [input.id, majorIds],
        );
      }
    });
  },
  async remove(id: string): Promise<boolean> {
    const rows = await query("DELETE FROM trovio.interests WHERE id = $1 RETURNING id", [id]);
    return rows.length > 0;
  },
  async listSubjectLinks(): Promise<SubjectMajorLink[]> {
    return query<SubjectMajorLink>(
      `SELECT subject_id AS "subjectId", array_agg(major_id ORDER BY major_id) AS "majorIds"
       FROM trovio.subject_majors GROUP BY subject_id ORDER BY subject_id`,
    );
  },
  async setSubjectLinks(subjectId: string, majorIds: string[]): Promise<void> {
    await withTransaction(async () => {
      await query("DELETE FROM trovio.subject_majors WHERE subject_id = $1", [subjectId]);
      if (majorIds.length) {
        await query(
          `INSERT INTO trovio.subject_majors (subject_id, major_id)
           SELECT $1, m.id FROM trovio.majors m WHERE m.id = ANY($2::text[]) ON CONFLICT DO NOTHING`,
          [subjectId, majorIds],
        );
      }
    });
  },
};

/* ───────────── Dữ liệu tuyển sinh theo năm ───────────── */
type YearRow = { programId: string; year: number; tuitionMin: string | null; tuitionMax: string | null; quota: number | null; status: AdmissionStatus; note: string };
const yearCols = `program_id AS "programId", year::int AS year, tuition_min::text AS "tuitionMin", tuition_max::text AS "tuitionMax", quota, admission_status AS status, note`;
const mapYear = (row: YearRow): ProgramYearData => ({ ...row, tuitionMin: toNumber(row.tuitionMin), tuitionMax: toNumber(row.tuitionMax) });

export const postgresProgramYearRepository = {
  async listByProgram(programId: string): Promise<ProgramYearData[]> {
    const rows = await query<YearRow>(`SELECT ${yearCols} FROM trovio.program_year_data WHERE program_id = $1 ORDER BY year DESC`, [programId]);
    return rows.map(mapYear);
  },
  async listByPrograms(programIds: string[]): Promise<ProgramYearData[]> {
    if (!programIds.length) return [];
    const rows = await query<YearRow>(`SELECT ${yearCols} FROM trovio.program_year_data WHERE program_id = ANY($1::text[]) ORDER BY program_id, year DESC`, [programIds]);
    return rows.map(mapYear);
  },
  async upsertMany(rows: ProgramYearData[], actorId: string): Promise<void> {
    if (!rows.length) return;
    await withTransaction(async () => {
      for (const r of rows) {
        await query(
          `INSERT INTO trovio.program_year_data (program_id, year, tuition_min, tuition_max, quota, admission_status, note, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (program_id, year) DO UPDATE SET tuition_min = EXCLUDED.tuition_min, tuition_max = EXCLUDED.tuition_max,
             quota = EXCLUDED.quota, admission_status = EXCLUDED.admission_status, note = EXCLUDED.note, updated_by = EXCLUDED.updated_by`,
          [r.programId, r.year, r.tuitionMin, r.tuitionMax, r.quota, r.status, r.note, actorId],
        );
      }
    });
  },
};

/* ───────────── Nguồn thông tin cho trợ lý AI ───────────── */
type AiRow = Omit<AiSource, "updatedAt"> & { updatedAt: string };
const aiCols = `id, title, kind, keywords, content, url, enabled, hits, updated_at::text AS "updatedAt"`;

export const postgresAiSourceRepository = {
  async list(onlyEnabled = false): Promise<AiSource[]> {
    return query<AiRow>(`SELECT ${aiCols} FROM trovio.ai_sources ${onlyEnabled ? "WHERE enabled" : ""} ORDER BY enabled DESC, updated_at DESC`);
  },
  async upsert(input: { id?: string; title: string; kind: AiSource["kind"]; keywords: string; content: string; url: string | null; enabled: boolean }, actorId: string): Promise<AiSource> {
    const rows = input.id
      ? await query<AiRow>(
          `UPDATE trovio.ai_sources SET title=$2, kind=$3, keywords=$4, content=$5, url=$6, enabled=$7
           WHERE id=$1 RETURNING ${aiCols}`,
          [input.id, input.title, input.kind, input.keywords, input.content, input.url, input.enabled],
        )
      : await query<AiRow>(
          `INSERT INTO trovio.ai_sources (title, kind, keywords, content, url, enabled, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${aiCols}`,
          [input.title, input.kind, input.keywords, input.content, input.url, input.enabled, actorId],
        );
    return rows[0];
  },
  async remove(id: string): Promise<boolean> {
    return (await query("DELETE FROM trovio.ai_sources WHERE id = $1 RETURNING id", [id])).length > 0;
  },
  async addHit(id: string): Promise<void> {
    await query("UPDATE trovio.ai_sources SET hits = hits + 1 WHERE id = $1", [id]);
  },
};

/* ───────────── Lượt quan tâm và tìm kiếm ẩn danh ───────────── */
export const postgresUsageRepository = {
  async record(day: string, kind: UsageKind, entityId: string, anonId: string): Promise<void> {
    await query(
      `INSERT INTO trovio.usage_events (day, kind, entity_id, anon_id) VALUES ($1::date, $2, $3, $4)
       ON CONFLICT (day, kind, entity_id, anon_id) DO UPDATE SET hits = LEAST(trovio.usage_events.hits + 1, 1000)`,
      [day, kind, entityId, anonId],
    );
    // Giữ tối đa 365 ngày lịch cho báo cáo năm.
    if (Math.random() < 0.01) await query("DELETE FROM trovio.usage_events WHERE day < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 364");
  },
  /** Xếp hạng theo số trình duyệt khác nhau có ít nhất một sự kiện thuộc các loại được chọn (xem hoặc lưu). */
  async top(kinds: UsageKind[], from: string, to: string, limit: number): Promise<{ entityId: string; people: number; hits: number }[]> {
    const rows = await query<{ entityId: string; people: string; hits: string }>(
      `SELECT entity_id AS "entityId", count(DISTINCT anon_id)::text AS people, sum(hits)::text AS hits
       FROM trovio.usage_events WHERE kind = ANY($1::text[]) AND day BETWEEN $2::date AND $3::date AND entity_id <> ''
       GROUP BY entity_id ORDER BY count(DISTINCT anon_id) DESC, sum(hits) DESC LIMIT $4`,
      [kinds, from, to, limit],
    );
    return rows.map((r) => ({ entityId: r.entityId, people: Number(r.people), hits: Number(r.hits) }));
  },
  async totals(from: string, to: string): Promise<Record<UsageKind, { people: number; hits: number }>> {
    const rows = await query<{ kind: UsageKind; people: string; hits: string }>(
      `SELECT kind, count(DISTINCT anon_id)::text AS people, sum(hits)::text AS hits
       FROM trovio.usage_events WHERE day BETWEEN $1::date AND $2::date GROUP BY kind`,
      [from, to],
    );
    const result = Object.fromEntries(USAGE_KINDS.map((k) => [k, { people: 0, hits: 0 }])) as Record<UsageKind, { people: number; hits: number }>;
    for (const r of rows) result[r.kind] = { people: Number(r.people), hits: Number(r.hits) };
    return result;
  },
};
