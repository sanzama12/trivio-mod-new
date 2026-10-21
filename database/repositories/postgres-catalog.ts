import { query, withTransaction, afterCommit } from "@database/client";
import { loadProgramsBatched, invalidatePostgresCache, postgresMajorRepository, postgresProgramRepository, postgresSchoolRepository } from "./postgres";
import type { CatalogAdminRepository, CatalogRepository, TimelineRepository } from "./types";
import type { Combo, FaqGroup, FinancialAidConfig, GuidanceProgram, Major, MajorGroup, PlanningProgram, Program, School, Subject, TimelineEvent } from "@/domain/types";

type DiscoveryStats = Awaited<ReturnType<CatalogRepository["findDiscoveryStats"]>>;
type DiscoveryCatalog = Awaited<ReturnType<CatalogRepository["findDiscoveryCatalog"]>>;
let discoveryEpoch = 0;
let discoveryStatsCache: DiscoveryStats | null = null;
let discoveryStatsLoadedAt = 0;
let discoveryStatsLoad: Promise<DiscoveryStats> | null = null;
let discoveryCatalogCache: DiscoveryCatalog | null = null;
let discoveryCatalogLoadedAt = 0;
let discoveryCatalogLoad: Promise<DiscoveryCatalog> | null = null;
let planningProgramsCache: PlanningProgram[] | null = null;
let planningProgramsLoadedAt = 0;
let planningProgramsLoad: Promise<PlanningProgram[]> | null = null;
const guidanceProgramsCache = new Map<string, { loadedAt: number; items: GuidanceProgram[] }>();
const guidanceProgramsLoads = new Map<string, Promise<GuidanceProgram[]>>();
const DISCOVERY_STATS_TTL_MS = 2 * 60 * 1000;

export function invalidateDiscoveryStats(): void {
  discoveryEpoch++;
  discoveryStatsCache = null;
  discoveryStatsLoadedAt = 0;
  discoveryStatsLoad = null;
  discoveryCatalogCache = null;
  discoveryCatalogLoadedAt = 0;
  discoveryCatalogLoad = null;
  planningProgramsCache = null;
  planningProgramsLoadedAt = 0;
  planningProgramsLoad = null;
  guidanceProgramsCache.clear();
  guidanceProgramsLoads.clear();
}

async function findGuidancePrograms(majorId: string): Promise<GuidanceProgram[]> {
  const epoch = discoveryEpoch;
  const hit = guidanceProgramsCache.get(majorId);
  if (hit && Date.now() - hit.loadedAt < DISCOVERY_STATS_TTL_MS) return hit.items;
  const running = guidanceProgramsLoads.get(majorId);
  if (running) return running;

  const load = query<any>(`
    SELECT
      p.id, p.slug,
      p.name AS name,
      p.major_id AS "majorId", m.group_id AS "groupId",
      p.school_id AS "schoolId", s.name AS "schoolName", s.code AS "schoolCode",
      s.city, s.region_code AS region,
      p.training_type AS "trainingType",
      COALESCE((
        SELECT jsonb_agg(pc.combo_code ORDER BY pc.combo_code)
        FROM trovio.program_combos pc WHERE pc.program_id = p.id
      ), '[]'::jsonb) AS combos,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'year', c.year, 'score', c.score, 'estimated', c.is_estimated
        ) ORDER BY c.year DESC)
        FROM trovio.program_cutoffs c
        WHERE c.program_id = p.id AND c.method_code = 'thpt' AND NOT c.is_estimated
      ), '[]'::jsonb) AS cutoffs,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'method', c.method_code, 'year', c.year, 'score', c.score, 'estimated', c.is_estimated
        ) ORDER BY c.year DESC)
        FROM trovio.program_cutoffs c
        WHERE c.program_id = p.id AND c.method_code <> 'thpt' AND NOT c.is_estimated
      ), '[]'::jsonb) AS "altCutoffs",
      p.tuition_min AS "tuitionMin",
      p.tuition_max AS "tuitionMax"
    FROM trovio.public_programs p
    JOIN trovio.schools s ON s.id = p.school_id AND NOT s.hidden
    JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
    WHERE NOT p.hidden
      AND p.major_id = $1
     
    ORDER BY p.name, s.name
  `, [majorId]).then((rows) => rows.map((row) => ({
    ...row,
    combos: Array.isArray(row.combos) ? row.combos : [],
    cutoffs: Array.isArray(row.cutoffs) ? row.cutoffs.map((item: any) => ({ ...item, year: Number(item.year), score: Number(item.score) })) : [],
    altCutoffs: Array.isArray(row.altCutoffs) ? row.altCutoffs.map((item: any) => ({ ...item, year: Number(item.year), score: Number(item.score) })) : [],
    tuitionMin: Number(row.tuitionMin) || 0,
    tuitionMax: Number(row.tuitionMax) || 0,
  })) as GuidanceProgram[]).then((items) => {
    if (epoch === discoveryEpoch) guidanceProgramsCache.set(majorId, { loadedAt: Date.now(), items });
    return items;
  }).finally(() => { if (guidanceProgramsLoads.get(majorId) === load) guidanceProgramsLoads.delete(majorId); });

  guidanceProgramsLoads.set(majorId, load);
  return load;
}

async function findPlanningPrograms(): Promise<PlanningProgram[]> {
  const epoch = discoveryEpoch;
  if (planningProgramsCache && Date.now() - planningProgramsLoadedAt < DISCOVERY_STATS_TTL_MS) return planningProgramsCache;
  planningProgramsLoad ??= query<PlanningProgram>(`
    WITH planning_rows AS (
      SELECT p.id, p.major_id AS "majorId",
        COALESCE((
          SELECT jsonb_agg(pc.combo_code ORDER BY pc.combo_code)
          FROM trovio.program_combos pc WHERE pc.program_id = p.id
        ), '[]'::jsonb) AS combos
      FROM trovio.public_programs p
      JOIN trovio.schools s ON s.id = p.school_id AND NOT s.hidden
      JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
      WHERE NOT p.hidden
    )
    SELECT MIN(id) AS id, "majorId", combos, COUNT(*)::int AS count
    FROM planning_rows
    GROUP BY "majorId", combos
    ORDER BY "majorId", id
  `).then((items) => {
    if (epoch !== discoveryEpoch) return items;
    planningProgramsCache = items;
    planningProgramsLoadedAt = Date.now();
    return items;
  }).finally(() => {
    if (epoch === discoveryEpoch) planningProgramsLoad = null;
  });
  return planningProgramsLoad;
}

async function findDiscoveryStats(): Promise<DiscoveryStats> {
  const epoch = discoveryEpoch;
  if (discoveryStatsCache && Date.now() - discoveryStatsLoadedAt < DISCOVERY_STATS_TTL_MS) {
    return discoveryStatsCache;
  }
  discoveryStatsLoad ??= query<DiscoveryStats>(`
    SELECT
      (
        SELECT COALESCE(jsonb_object_agg(counts.major_id, counts.program_count), '{}'::jsonb)
        FROM (
          SELECT p.major_id, COUNT(*)::int AS program_count
          FROM trovio.public_programs p
          WHERE NOT p.hidden
          GROUP BY p.major_id
        ) counts
      ) AS "programCountByMajor",
      (
        SELECT COALESCE(jsonb_object_agg(counts.group_id, counts.program_count), '{}'::jsonb)
        FROM (
          SELECT m.group_id, COUNT(*)::int AS program_count
          FROM trovio.public_programs p
          JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
          WHERE NOT p.hidden
          GROUP BY m.group_id
        ) counts
      ) AS "programCountByGroup",
      (
        SELECT COALESCE(jsonb_object_agg(counts.group_id, counts.school_count), '{}'::jsonb)
        FROM (
          SELECT m.group_id, COUNT(DISTINCT p.school_id)::int AS school_count
          FROM trovio.public_programs p
          JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
          WHERE NOT p.hidden
          GROUP BY m.group_id
        ) counts
      ) AS "schoolCountByGroup",
      (SELECT COUNT(*)::int FROM trovio.public_programs p WHERE NOT p.hidden) AS "totalPrograms",
      (SELECT COUNT(*)::int FROM trovio.schools s WHERE NOT s.hidden) AS "totalSchools"
  `).then((rows) => {
    const value = rows[0] ?? {
      programCountByMajor: {},
      programCountByGroup: {},
      schoolCountByGroup: {},
      totalPrograms: 0,
      totalSchools: 0,
    };
    if (epoch !== discoveryEpoch) return value;
    discoveryStatsCache = value;
    discoveryStatsLoadedAt = Date.now();
    return value;
  }).finally(() => {
    if (epoch === discoveryEpoch) discoveryStatsLoad = null;
  });
  return discoveryStatsLoad;
}

async function findDiscoveryCatalog(): Promise<DiscoveryCatalog> {
  const epoch = discoveryEpoch;
  if (discoveryCatalogCache && Date.now() - discoveryCatalogLoadedAt < DISCOVERY_STATS_TTL_MS) {
    return discoveryCatalogCache;
  }
  discoveryCatalogLoad ??= query<{
    groups: MajorGroup[];
    majors: Major[];
    schools: School[];
    programCountByMajor: Record<string, number>;
    programCountByGroup: Record<string, number>;
    schoolCountByGroup: Record<string, number>;
    totalPrograms: number;
    totalSchools: number;
  }>(`
    SELECT
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', g.id,
          'slug', g.slug,
          'name', g.name,
          'icon', g.icon,
          'tone', g.tone,
          'description', COALESCE(to_jsonb(g)->>'description', ''),
          'position', COALESCE((to_jsonb(g)->>'position')::smallint, 0),
          'featured', COALESCE((to_jsonb(g)->>'featured')::boolean, true)
        ) ORDER BY COALESCE((to_jsonb(g)->>'position')::smallint, 0), g.name), '[]'::jsonb)
        FROM trovio.major_groups g
        WHERE NOT COALESCE((to_jsonb(g)->>'hidden')::boolean, false)
      ) AS groups,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'slug', m.slug,
          'code', COALESCE(m.code, ''),
          'name', m.name,
          'groupId', m.group_id,
          'summary', m.summary,
          'description', m.description,
          'hidden', m.hidden,
          'custom', m.is_custom,
          'riasec', '[]'::jsonb
        ) ORDER BY m.name), '[]'::jsonb)
        FROM trovio.majors m
        WHERE NOT m.hidden
      ) AS majors,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', s.id,
          'slug', s.slug,
          'code', s.code,
          'name', s.name,
          'shortName', s.short_name,
          'type', s.type,
          'region', s.region_code,
          'city', s.city,
          'campuses', COALESCE((
            SELECT jsonb_agg(c.name ORDER BY c.position)
            FROM trovio.school_campuses c
            WHERE c.school_id = s.id
          ), '[]'::jsonb),
          'founded', COALESCE(s.founded, 0),
          'students', COALESCE(s.students, 0),
          'highlight', s.highlight,
          'website', s.website,
          'logoUrl', NULLIF(to_jsonb(s)->>'logo_url', ''),
          'coverUrl', NULLIF(to_jsonb(s)->>'cover_url', ''),
          'description', s.description,
          'scholarships', s.scholarships,
          'hidden', s.hidden,
          'custom', s.is_custom
        ) ORDER BY s.name), '[]'::jsonb)
        FROM trovio.schools s
        WHERE NOT s.hidden
      ) AS schools,
      (
        SELECT COALESCE(jsonb_object_agg(counts.major_id, counts.program_count), '{}'::jsonb)
        FROM (
          SELECT p.major_id, COUNT(*)::int AS program_count
          FROM trovio.public_programs p
          WHERE NOT p.hidden
          GROUP BY p.major_id
        ) counts
      ) AS "programCountByMajor",
      (
        SELECT COALESCE(jsonb_object_agg(counts.group_id, counts.program_count), '{}'::jsonb)
        FROM (
          SELECT m.group_id, COUNT(*)::int AS program_count
          FROM trovio.public_programs p
          JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
          WHERE NOT p.hidden
          GROUP BY m.group_id
        ) counts
      ) AS "programCountByGroup",
      (
        SELECT COALESCE(jsonb_object_agg(counts.group_id, counts.school_count), '{}'::jsonb)
        FROM (
          SELECT m.group_id, COUNT(DISTINCT p.school_id)::int AS school_count
          FROM trovio.public_programs p
          JOIN trovio.majors m ON m.id = p.major_id AND NOT m.hidden
          WHERE NOT p.hidden
          GROUP BY m.group_id
        ) counts
      ) AS "schoolCountByGroup",
      (SELECT COUNT(*)::int FROM trovio.public_programs p WHERE NOT p.hidden) AS "totalPrograms",
      (SELECT COUNT(*)::int FROM trovio.schools s WHERE NOT s.hidden) AS "totalSchools"
  `).then((rows) => {
    const row = rows[0];
    const value: DiscoveryCatalog = {
      groups: row?.groups ?? [],
      majors: row?.majors ?? [],
      schools: row?.schools ?? [],
      stats: {
        programCountByMajor: row?.programCountByMajor ?? {},
        programCountByGroup: row?.programCountByGroup ?? {},
        schoolCountByGroup: row?.schoolCountByGroup ?? {},
        totalPrograms: row?.totalPrograms ?? 0,
        totalSchools: row?.totalSchools ?? 0,
      },
    };
    if (epoch !== discoveryEpoch) return value;
    discoveryCatalogCache = value;
    discoveryCatalogLoadedAt = Date.now();
    return value;
  }).finally(() => {
    if (epoch === discoveryEpoch) discoveryCatalogLoad = null;
  });
  return discoveryCatalogLoad;
}

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

  findGuidancePrograms,
  findPlanningPrograms,

  findDiscoveryStats,
  findDiscoveryCatalog,
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
         students, highlight, website, logo_url, cover_url, description, scholarships, hidden, is_custom
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         short_name=EXCLUDED.short_name, type=EXCLUDED.type,
         region_code=EXCLUDED.region_code, city=EXCLUDED.city,
         founded=EXCLUDED.founded, students=EXCLUDED.students,
         highlight=EXCLUDED.highlight, website=EXCLUDED.website, logo_url=EXCLUDED.logo_url, cover_url=EXCLUDED.cover_url,
         description=EXCLUDED.description, scholarships=EXCLUDED.scholarships,
         hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [school.id, school.slug, school.code, school.name, school.shortName, school.type, school.region, school.city,
        school.founded && school.founded >= 1800 ? school.founded : null, school.students, school.highlight, school.website, school.logoUrl, school.coverUrl ?? null, school.description, school.scholarships,
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
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
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
         students, highlight, website, logo_url, cover_url, description, scholarships, hidden, is_custom
       )
       SELECT item->>'id', item->>'slug', item->>'code', item->>'name', item->>'shortName',
              item->>'type', item->>'region', item->>'city', (item->>'founded')::smallint,
              (item->>'students')::integer, item->>'highlight', item->>'website',
              NULLIF(item->>'logoUrl', ''), NULLIF(item->>'coverUrl', ''), item->>'description', item->>'scholarships', (item->>'hidden')::boolean,
              (item->>'custom')::boolean
       FROM jsonb_array_elements($1::jsonb) AS data(item)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         short_name=EXCLUDED.short_name, type=EXCLUDED.type,
         region_code=EXCLUDED.region_code, city=EXCLUDED.city,
         founded=EXCLUDED.founded, students=EXCLUDED.students,
         highlight=EXCLUDED.highlight, website=EXCLUDED.website, logo_url=EXCLUDED.logo_url, cover_url=EXCLUDED.cover_url,
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
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
}

async function saveMajor(major: Major): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO trovio.majors (
         id, slug, code, name, group_id, summary, description, hidden, is_custom
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         group_id=EXCLUDED.group_id, summary=EXCLUDED.summary,
         description=EXCLUDED.description, hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [major.id, major.slug, major.code || null, major.name, major.groupId, major.summary, major.description,
        major.hidden ?? false, major.custom ?? false],
    );
  });
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
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
         id, slug, code, name, group_id, summary, description, hidden, is_custom
       )
       SELECT item->>'id', item->>'slug', NULLIF(item->>'code',''), item->>'name', item->>'groupId',
              item->>'summary', item->>'description', (item->>'hidden')::boolean, (item->>'custom')::boolean
       FROM jsonb_array_elements($1::jsonb) AS data(item)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug, code=EXCLUDED.code, name=EXCLUDED.name,
         group_id=EXCLUDED.group_id, summary=EXCLUDED.summary,
         description=EXCLUDED.description, hidden=EXCLUDED.hidden, is_custom=EXCLUDED.is_custom`,
      [payload],
    );
  });
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
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
        `INSERT INTO trovio.program_combos (program_id, combo_code)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [program.id, combo],
      );
    }
    for (const [position, method] of program.methods.entries()) {
      await client.query(
        `INSERT INTO trovio.program_admission_methods
           (program_id, method_code, name, description, requirement, tag, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [program.id, method.key ?? null, method.name, method.desc, method.requirement, method.tag, position],
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
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
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
      `DELETE FROM trovio.program_admission_methods
       WHERE program_id IN (
         SELECT item->>'id' FROM jsonb_array_elements($1::jsonb) AS data(item)
       )`,
      [payload],
    );
    await client.query(
      `INSERT INTO trovio.program_admission_methods
         (program_id, method_code, name, description, requirement, tag, position)
       SELECT program.item->>'id', NULLIF(method.item->>'key', ''), method.item->>'name',
              COALESCE(method.item->>'desc', ''), COALESCE(method.item->>'requirement', ''),
              COALESCE(method.item->>'tag', ''), (method.position - 1)::smallint
       FROM jsonb_array_elements($1::jsonb) AS program(item)
       CROSS JOIN LATERAL jsonb_array_elements(program.item->'methods')
         WITH ORDINALITY AS method(item, position)`,
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
       UNION ALL
       SELECT program.item->>'id', cutoff.item->>'method', (cutoff.item->>'year')::smallint,
              (cutoff.item->>'score')::numeric, COALESCE((cutoff.item->>'estimated')::boolean, false)
       FROM jsonb_array_elements($1::jsonb) AS program(item)
       CROSS JOIN LATERAL jsonb_array_elements(program.item->'altCutoffs') AS cutoff(item)`,
      [payload],
    );
  });
  afterCommit(invalidatePostgresCache);
  afterCommit(invalidateDiscoveryStats);
}

async function listAllSchoolsAdmin(): Promise<School[]> {
  const rows = await query<any>(`
    SELECT 
      s.id, s.slug, s.code, s.name, s.short_name AS "shortName",
      s.type, s.region_code AS "region", s.city, s.founded,
      s.students, s.highlight, s.website,
      NULLIF(to_jsonb(s)->>'logo_url', '') AS "logoUrl", NULLIF(to_jsonb(s)->>'cover_url', '') AS "coverUrl", s.description,
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
      m.id, m.slug, COALESCE(m.code, '') AS code, m.name, m.group_id AS "groupId",
      m.summary, m.description, m.hidden,
      m.is_custom AS "custom",
      '[]'::json AS riasec
    FROM trovio.majors m
    ORDER BY m.name
  `);
  return rows.map((r: any) => ({ ...r, riasec: r.riasec }));
}

export const postgresCatalogAdminRepository: CatalogAdminRepository = {
  listSchools: listAllSchoolsAdmin,
  saveSchool,
  saveSchoolsBatch,
  listMajors: listAllMajorsAdmin,
  saveMajor,
  saveMajorsBatch,
  listPrograms: () => loadProgramsBatched({ kind: "all" }, true),
  getProgram: async (id) => (await loadProgramsBatched({ kind: "id", value: id }, true))[0] ?? null,
  createProgram,
  createProgramsBatch,
};
