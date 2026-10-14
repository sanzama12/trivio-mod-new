import { query, withTransaction } from "@/lib/db";
import { invalidatePostgresCache, postgresMajorRepository, postgresProgramRepository, postgresSchoolRepository } from "./postgres";
import type { CatalogAdminRepository, CatalogRepository, TimelineRepository } from "./types";
import type { Combo, FaqGroup, FinancialAidConfig, Major, Program, School, Subject, TimelineEvent } from "@/domain/types";

export const postgresReferenceCatalogRepository: CatalogRepository = {
  async findSubjects(): Promise<Subject[]> {
    const rows = await query<{ id: string; name: string; short: string }>(
      `SELECT id, name, short_name AS short FROM trovio.subjects ORDER BY name`,
    );
    return rows;
  },

  async findCombos(): Promise<Combo[]> {
    const rows = await query<{ code: string; subjects: string[] }>(
      `SELECT c.code,
              array_agg(cs.subject_id ORDER BY cs.position) AS subjects
       FROM trovio.combos c
       JOIN trovio.combo_subjects cs ON cs.combo_code = c.code
       GROUP BY c.code ORDER BY c.code`,
    );
    return rows
      .filter((row) => row.subjects.length === 3)
      .map((row) => ({ code: row.code, subjects: row.subjects as [string, string, string] }));
  },

  async findFaq(): Promise<FaqGroup[]> {
    const rows = await query<{ payload: FaqGroup }>(
      `SELECT payload FROM trovio.app_documents WHERE collection = 'faq' ORDER BY id`,
    );
    return rows.map((row) => row.payload);
  },

  async findFinancialAid(): Promise<FinancialAidConfig | null> {
    const rows = await query<{ payload: FinancialAidConfig }>(
      `SELECT payload FROM trovio.app_documents WHERE collection = 'site-config' AND id = 'financial-aid'`,
    );
    return rows[0]?.payload ?? null;
  },
};

export const postgresTimelineRepository: TimelineRepository = {
  async findAll(): Promise<TimelineEvent[]> {
    const rows = await query<{
      id: string;
      title: string;
      start: string;
      end: string | null;
      category: TimelineEvent["category"];
      desc: string;
    }>(
      `SELECT id, title, start_date::text AS start, end_date::text AS "end",
              category, description AS "desc"
       FROM trovio.timeline_events ORDER BY start_date`,
    );
    return rows.map((row) => ({ ...row, end: row.end ?? undefined }));
  },
};

async function saveSchool(school: School): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.schools (
         id, slug, code, name, short_name, type, region_code, city, founded,
         students, highlight, website, description, scholarships, hidden, is_custom
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         short_name=EXCLUDED.short_name, type=EXCLUDED.type,
         region_code=EXCLUDED.region_code, city=EXCLUDED.city,
         founded=EXCLUDED.founded, students=EXCLUDED.students,
         highlight=EXCLUDED.highlight, website=EXCLUDED.website,
         description=EXCLUDED.description, scholarships=EXCLUDED.scholarships,
         hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [school.id, school.slug, school.code, school.name, school.shortName, school.type, school.region, school.city,
        school.founded, school.students, school.highlight, school.website, school.description, school.scholarships,
        school.hidden ?? false, school.custom ?? false],
    );
    await client.query(`DELETE FROM trovio.school_campuses WHERE school_id = $1`, [school.id]);
    for (const [position, name] of school.campuses.entries()) {
      await client.query(
        `INSERT INTO trovio.school_campuses (school_id, position, name) VALUES ($1,$2,$3)`,
        [school.id, position, name],
      );
    }
  });
  invalidatePostgresCache();
}

async function saveMajor(major: Major): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.majors (
         id, slug, code, name, group_id, summary, description, demand, growth, hidden, is_custom
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         group_id=EXCLUDED.group_id, summary=EXCLUDED.summary,
         description=EXCLUDED.description, demand=EXCLUDED.demand,
         growth=EXCLUDED.growth, hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [major.id, major.slug, major.code, major.name, major.groupId, major.summary, major.description,
        major.demand, major.growth, major.hidden ?? false, major.custom ?? false],
    );
    await client.query(`DELETE FROM trovio.major_riasec WHERE major_id = $1`, [major.id]);
    for (const [rank, code] of major.riasec.entries()) {
      await client.query(
        `INSERT INTO trovio.major_riasec (major_id, riasec_code, rank) VALUES ($1,$2,$3)`,
        [major.id, code, rank + 1],
      );
    }
  });
  invalidatePostgresCache();
}

async function createProgram(program: Program): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.programs (
         id, slug, school_id, major_id, name, admission_code, training_type,
         campus, tuition_min, tuition_max, duration_years, quota, competition,
         overview, data_updated, source, source_url, hidden, is_custom
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [program.id, program.slug, program.schoolId, program.majorId, program.name, program.admissionCode,
        program.trainingType, program.campus, program.tuitionMin, program.tuitionMax, program.durationYears,
        program.quota, program.competition, program.overview, program.updatedAt, program.source,
        program.sourceUrl ?? null, program.hidden ?? false, program.custom ?? true],
    );
    for (const combo of program.combos) {
      await client.query(
        `INSERT INTO trovio.program_combos (program_id, combo_code) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [program.id, combo],
      );
    }
    for (const cutoff of program.cutoffs) {
      await client.query(
        `INSERT INTO trovio.program_cutoffs (program_id, method_code, year, score, is_estimated)
         VALUES ($1,'thpt',$2,$3,false)`,
        [program.id, cutoff.year, cutoff.score],
      );
    }
    for (const cutoff of program.altCutoffs) {
      await client.query(
        `INSERT INTO trovio.program_cutoffs (program_id, method_code, year, score, is_estimated)
         VALUES ($1,$2,$3,$4,$5)`,
        [program.id, cutoff.method, cutoff.year, cutoff.score, cutoff.estimated ?? false],
      );
    }
  });
  invalidatePostgresCache();
}

export const postgresCatalogAdminRepository: CatalogAdminRepository = {
  listSchools: () => postgresSchoolRepository.findAll(),
  saveSchool,
  listMajors: () => postgresMajorRepository.findAll(),
  saveMajor,
  listPrograms: () => postgresProgramRepository.findAll(),
  getProgram: (id) => postgresProgramRepository.findById(id),
  createProgram,
};
