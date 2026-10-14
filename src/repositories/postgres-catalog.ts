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
        school.founded && school.founded >= 1800 ? school.founded : null, school.students, school.highlight, school.website, school.description, school.scholarships,
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

async function saveSchoolsBatch(schools: School[]): Promise<void> {
  if (schools.length === 0) return;
  const payload = JSON.stringify(schools.map((school) => ({
    ...school,
    founded: school.founded && school.founded >= 1800 ? school.founded : null,
    hidden: school.hidden ?? false,
    custom: school.custom ?? false,
  })));

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.schools (
         id, slug, code, name, short_name, type, region_code, city, founded,
         students, highlight, website, description, scholarships, hidden, is_custom
       )
       SELECT item->>'id', item->>'slug', item->>'code', item->>'name', item->>'shortName',
              item->>'type', item->>'region', item->>'city', (item->>'founded')::smallint,
              (item->>'students')::integer, item->>'highlight', item->>'website',
              item->>'description', item->>'scholarships', (item->>'hidden')::boolean,
              (item->>'custom')::boolean
       FROM jsonb_array_elements($1::jsonb) AS data(item)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         short_name=EXCLUDED.short_name, type=EXCLUDED.type,
         region_code=EXCLUDED.region_code, city=EXCLUDED.city,
         founded=EXCLUDED.founded, students=EXCLUDED.students,
         highlight=EXCLUDED.highlight, website=EXCLUDED.website,
         description=EXCLUDED.description, scholarships=EXCLUDED.scholarships,
         hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [payload],
    );
    await client.query(
      `DELETE FROM trovio.school_campuses
       WHERE school_id IN (
         SELECT item->>'id' FROM jsonb_array_elements($1::jsonb) AS data(item)
       )`,
      [payload],
    );
    await client.query(
      `INSERT INTO trovio.school_campuses (school_id, position, name)
       SELECT school.item->>'id', (campus.position - 1)::smallint, campus.name
       FROM jsonb_array_elements($1::jsonb) AS school(item)
       CROSS JOIN LATERAL jsonb_array_elements_text(school.item->'campuses')
         WITH ORDINALITY AS campus(name, position)`,
      [payload],
    );
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

async function saveMajorsBatch(majors: Major[]): Promise<void> {
  if (majors.length === 0) return;
  const payload = JSON.stringify(majors.map((major) => ({
    ...major,
    hidden: major.hidden ?? false,
    custom: major.custom ?? false,
  })));
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.majors (
         id, slug, code, name, group_id, summary, description, demand, growth, hidden, is_custom
       )
       SELECT item->>'id', item->>'slug', item->>'code', item->>'name', item->>'groupId',
              item->>'summary', item->>'description', item->>'demand',
              (item->>'growth')::numeric, (item->>'hidden')::boolean, (item->>'custom')::boolean
       FROM jsonb_array_elements($1::jsonb) AS data(item)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         group_id=EXCLUDED.group_id, summary=EXCLUDED.summary,
         description=EXCLUDED.description, demand=EXCLUDED.demand,
         growth=EXCLUDED.growth, hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [payload],
    );
    await client.query(
      `DELETE FROM trovio.major_riasec
       WHERE major_id IN (
         SELECT item->>'id' FROM jsonb_array_elements($1::jsonb) AS data(item)
       )`,
      [payload],
    );
    await client.query(
      `INSERT INTO trovio.major_riasec (major_id, riasec_code, rank)
       SELECT major.item->>'id', riasec.code, riasec.rank::smallint
       FROM jsonb_array_elements($1::jsonb) AS major(item)
       CROSS JOIN LATERAL jsonb_array_elements_text(major.item->'riasec')
         WITH ORDINALITY AS riasec(code, rank)`,
      [payload],
    );
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

async function createProgramsBatch(programs: Program[]): Promise<void> {
  if (programs.length === 0) return;
  const payload = JSON.stringify(programs.map((program) => ({
    ...program,
    hidden: program.hidden ?? false,
    custom: program.custom ?? true,
  })));
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.programs (
         id, slug, school_id, major_id, name, admission_code, training_type,
         campus, tuition_min, tuition_max, duration_years, quota, competition,
         overview, data_updated, source, source_url, hidden, is_custom
       )
       SELECT item->>'id', item->>'slug', item->>'schoolId', item->>'majorId', item->>'name',
              item->>'admissionCode', item->>'trainingType', item->>'campus',
              (item->>'tuitionMin')::numeric, (item->>'tuitionMax')::numeric,
              (item->>'durationYears')::numeric, (item->>'quota')::integer,
              item->>'competition', item->>'overview', item->>'updatedAt', item->>'source',
              NULLIF(item->>'sourceUrl', ''), (item->>'hidden')::boolean, (item->>'custom')::boolean
       FROM jsonb_array_elements($1::jsonb) AS data(item)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, school_id=EXCLUDED.school_id, major_id=EXCLUDED.major_id,
         name=EXCLUDED.name, admission_code=EXCLUDED.admission_code,
         training_type=EXCLUDED.training_type, campus=EXCLUDED.campus,
         tuition_min=EXCLUDED.tuition_min, tuition_max=EXCLUDED.tuition_max,
         duration_years=EXCLUDED.duration_years, quota=EXCLUDED.quota,
         competition=EXCLUDED.competition, overview=EXCLUDED.overview,
         data_updated=EXCLUDED.data_updated, source=EXCLUDED.source,
         source_url=EXCLUDED.source_url, hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [payload],
    );
    await client.query(
      `DELETE FROM trovio.program_combos
       WHERE program_id IN (
         SELECT item->>'id' FROM jsonb_array_elements($1::jsonb) AS data(item)
       )`,
      [payload],
    );
    await client.query(
      `INSERT INTO trovio.program_combos (program_id, combo_code)
       SELECT program.item->>'id', combo.code
       FROM jsonb_array_elements($1::jsonb) AS program(item)
       CROSS JOIN LATERAL jsonb_array_elements_text(program.item->'combos') AS combo(code)
       ON CONFLICT DO NOTHING`,
      [payload],
    );
    await client.query(
      `DELETE FROM trovio.program_cutoffs
       WHERE program_id IN (
         SELECT item->>'id' FROM jsonb_array_elements($1::jsonb) AS data(item)
       )`,
      [payload],
    );
    await client.query(
      `INSERT INTO trovio.program_cutoffs (program_id, method_code, year, score, is_estimated)
       SELECT program.item->>'id', 'thpt', (cutoff.item->>'year')::smallint,
              (cutoff.item->>'score')::numeric, false
       FROM jsonb_array_elements($1::jsonb) AS program(item)
       CROSS JOIN LATERAL jsonb_array_elements(program.item->'cutoffs') AS cutoff(item)
       WHERE (cutoff.item->>'score')::numeric > 0
       UNION ALL
       SELECT program.item->>'id', cutoff.item->>'method', (cutoff.item->>'year')::smallint,
              (cutoff.item->>'score')::numeric, COALESCE((cutoff.item->>'estimated')::boolean, false)
       FROM jsonb_array_elements($1::jsonb) AS program(item)
       CROSS JOIN LATERAL jsonb_array_elements(program.item->'altCutoffs') AS cutoff(item)
       WHERE (cutoff.item->>'score')::numeric > 0`,
      [payload],
    );
  });
  invalidatePostgresCache();
}

async function listAllSchoolsAdmin(): Promise<School[]> {
  const rows = await query<any>(`
    SELECT 
      s.id, s.slug, s.code, s.name, s.short_name AS "shortName",
      s.type, s.region_code AS "region", s.city, s.founded,
      s.students, s.highlight, s.website, s.description,
      s.scholarships, s.hidden, s.is_custom AS "custom",
      COALESCE(ARRAY_AGG(c.name ORDER BY c.position) FILTER (WHERE c.name IS NOT NULL), '{}') AS campuses
    FROM trovio.schools s
    LEFT JOIN trovio.school_campuses c ON c.school_id = s.id
    GROUP BY s.id
    ORDER BY s.name
  `);
  return rows;
}

async function listAllMajorsAdmin(): Promise<Major[]> {
  const rows = await query<any>(`
    SELECT 
      m.id, m.slug, m.code, m.name, m.group_id AS "groupId",
      m.summary, m.description, m.demand, m.growth, m.hidden,
      m.is_custom AS "custom",
      COALESCE(
        (
          SELECT json_agg(r.riasec_code ORDER BY r.rank)
          FROM trovio.major_riasec r
          WHERE r.major_id = m.id
        ), '[]'::json
      ) AS riasec
    FROM trovio.majors m
    ORDER BY m.name
  `);
  return rows.map((r: any) => ({
    ...r,
    growth: Number(r.growth),
    riasec: r.riasec,
    curriculum: [],
    careers: [],
  }));
}

export const postgresCatalogAdminRepository: CatalogAdminRepository = {
  listSchools: listAllSchoolsAdmin,
  saveSchool,
  saveSchoolsBatch,
  listMajors: listAllMajorsAdmin,
  saveMajor,
  saveMajorsBatch,
  listPrograms: () => postgresProgramRepository.findAll(),
  getProgram: (id) => postgresProgramRepository.findById(id),
  createProgram,
  createProgramsBatch,
};
