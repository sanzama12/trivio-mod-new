/**
 * DATA ACCESS LAYER — PostgreSQL Implementation
 * Triển khai các Repository Interface truy xuất trực tiếp vào cơ sở dữ liệu PostgreSQL (Neon Cloud).
 * Tuân thủ mô hình kiến trúc 3 lớp (3-Layer Architecture).
 */
import { query, withTransaction } from "@database/client";
import { buildCatalogIndex, type CatalogIndex } from "@/lib/catalog-index";

import type {
  School,
  Major,
  MajorGroup,
  Program,
  RiasecQuestion,
  User,
  RiasecType,
  VerifyField,
} from "@/domain/types";
import type {
  SchoolRepository,
  MajorRepository,
  ProgramRepository,
  QuizRepository,
  UserRepository,
} from "./types";

// Bộ nhớ đệm RAM phục vụ tra cứu tức thì (<1ms) không bị nghẽn mạng Cloud
let cachedSchools: School[] = [];
let cachedMajors: Major[] = [];
let cachedPrograms: Program[] = [];
let cachedGroups: MajorGroup[] = [];
let cachedQuiz: RiasecQuestion[] = [];
let catalogIndex: CatalogIndex = buildCatalogIndex(cachedSchools, cachedMajors, cachedPrograms);
let catalogEpoch = 0;
let coreCatalogLoad: Promise<void> | null = null;
let programCatalogLoad: Promise<void> | null = null;
const scopedProgramCache = new Map<string, { loadedAt: number; items: Program[] }>();
const scopedProgramLoads = new Map<string, Promise<Program[]>>();
/** Lần nạp thành công gần nhất, kể cả khi danh mục rỗng. */
let coreCatalogLoadedAt = 0;
let programCatalogLoadedAt = 0;
let coreCatalogHasData = false;
let programCatalogHasData = false;
let coreCatalogFailedAt = 0;
let programCatalogFailedAt = 0;

const CATALOG_FRESH_MS = 2 * 60 * 1000;
const CATALOG_EMPTY_FRESH_MS = 30 * 1000;
const CATALOG_FAIL_BACKOFF_MS = 15 * 1000;

function rebuildIndex(): void {
  catalogIndex = buildCatalogIndex(cachedSchools, cachedMajors, cachedPrograms);
}

type ProgramScope =
  | { kind: "all" }
  | { kind: "id"; value: string }
  | { kind: "slug"; value: string }
  | { kind: "ids"; values: string[] }
  | { kind: "school"; value: string }
  | { kind: "major"; value: string };

function programScopeSql(scope: ProgramScope): { clause: string; params: unknown[] } {
  switch (scope.kind) {
    case "id": return { clause: "AND p.id = $1", params: [scope.value] };
    case "slug": return { clause: "AND p.slug = $1", params: [scope.value] };
    case "ids": return { clause: "AND p.id = ANY($1::text[])", params: [scope.values] };
    case "school": return { clause: "AND p.school_id = $1", params: [scope.value] };
    case "major": return { clause: "AND p.major_id = $1", params: [scope.value] };
    default: return { clause: "", params: [] };
  }
}

function programsFromMemory(scope: ProgramScope): Program[] | null {
  if (!programCatalogLoadedAt || !programCatalogHasData) return null;
  if (!cacheIsFresh(programCatalogLoadedAt, programCatalogHasData)) {
    const backingOff = programCatalogFailedAt && Date.now() - programCatalogFailedAt < CATALOG_FAIL_BACKOFF_MS;
    if (!backingOff) void startProgramCatalogRefresh();
  }
  switch (scope.kind) {
    case "all": return cachedPrograms;
    case "id": { const p=catalogIndex.programById.get(scope.value); return p ? [p] : []; }
    case "slug": { const p=catalogIndex.programBySlug.get(scope.value); return p ? [p] : []; }
    case "ids": {
      const wanted = new Set(scope.values);
      return cachedPrograms.filter((program) => wanted.has(program.id));
    }
    case "school": return catalogIndex.programsBySchool.get(scope.value) ?? [];
    case "major": return catalogIndex.programsByMajor.get(scope.value) ?? [];
  }
}

export async function loadProgramsBatched(scope: ProgramScope = { kind: "all" }, includeHidden = false): Promise<Program[]> {
  const { clause, params } = programScopeSql(scope);
  // Một round-trip: trước đây là 6 câu tuần tự, mỗi câu thêm SET search_path nên trang chương trình và gợi ý chờ vài chục giây lúc lạnh.
  const [bundle] = await query<{
    programs: Array<{
      id: string;
      slug: string;
      schoolId: string;
      majorId: string;
      name: string;
      admissionCode: string;
      trainingType: Program["trainingType"];
      campus: string;
      tuitionMin: string | number;
      tuitionMax: string | number;
      durationYears: string | number;
      quota: string | number;
      competition: Program["competition"];
      overview: string;
      updatedAt: string;
      source: string;
      sourceUrl: string | null;
      sourceNote: string | null;
      hidden: boolean;
      custom: boolean;
      schoolVerifiedAt: string | null;
      schoolVerifiedNote: string | null;
      sourceCheckedAt: string | null;
      adminVerifiedAt: string | null;
    }>;
    combos: Array<{ programId: string; comboCode: string }>;
    methods: Array<{ programId: string; key: string; name: string; desc: string; requirement: string; tag: string }>;
    cutoffs: Array<{ programId: string; method: string; year: string | number; score: string | number; estimated: boolean }>;
    verified: Array<{ programId: string; field: VerifyField; verifiedAt: string }>;
  }>(`
    WITH matched AS (
      SELECT
        p.id, p.slug, p.school_id AS "schoolId", p.major_id AS "majorId",
        p.name, p.admission_code AS "admissionCode", p.training_type AS "trainingType",
        p.campus, p.tuition_min AS "tuitionMin", p.tuition_max AS "tuitionMax",
        p.duration_years AS "durationYears", p.quota, p.competition,
        p.overview, p.data_updated AS "updatedAt", p.source,
        p.source_url AS "sourceUrl", p.source_note AS "sourceNote", p.hidden, p.is_custom AS "custom",
        p.school_verified_at AS "schoolVerifiedAt",
        p.school_verified_note AS "schoolVerifiedNote",
        p.source_checked_at AS "sourceCheckedAt",
        p.admin_verified_at AS "adminVerifiedAt"
      FROM ${includeHidden ? "trovio.programs" : "trovio.public_programs"} p
      WHERE true ${clause}
    )
    SELECT
      COALESCE((SELECT json_agg(to_jsonb(m)) FROM matched m), '[]'::json) AS programs,
      COALESCE((
        SELECT json_agg(json_build_object('programId', c.program_id, 'comboCode', c.combo_code))
        FROM trovio.program_combos c
        WHERE c.program_id IN (SELECT id FROM matched)
      ), '[]'::json) AS combos,
      COALESCE((
        SELECT json_agg(json_build_object(
          'programId', am.program_id, 'key', am.method_code, 'name', am.name,
          'desc', am.description, 'requirement', am.requirement, 'tag', am.tag
        ) ORDER BY am.program_id, am.position)
        FROM trovio.program_admission_methods am
        WHERE am.program_id IN (SELECT id FROM matched)
      ), '[]'::json) AS methods,
      COALESCE((
        SELECT json_agg(json_build_object(
          'programId', cu.program_id, 'method', cu.method_code, 'year', cu.year,
          'score', cu.score, 'estimated', cu.is_estimated
        ))
        FROM trovio.program_cutoffs cu
        WHERE cu.program_id IN (SELECT id FROM matched) ${includeHidden ? "" : "AND NOT cu.is_estimated"}
      ), '[]'::json) AS cutoffs,
      COALESCE((
        SELECT json_agg(json_build_object(
          'programId', vf.program_id, 'field', vf.field, 'verifiedAt', vf.verified_at::text
        ))
        FROM trovio.program_verified_fields vf
        WHERE vf.program_id IN (SELECT id FROM matched)
      ), '[]'::json) AS verified
  `, params);
  const rows = bundle?.programs ?? [];
  if (!rows.length) return [];
  const comboRows = bundle?.combos ?? [];
  const methodRows = bundle?.methods ?? [];
  const cutoffRows = bundle?.cutoffs ?? [];
  const verifiedRows = bundle?.verified ?? [];
  const combos = new Map<string, string[]>();
  for (const r of comboRows) {
    const arr = combos.get(r.programId);
    if (arr) arr.push(r.comboCode);
    else combos.set(r.programId, [r.comboCode]);
  }
  const methods = new Map<string, Program["methods"]>();
  for (const r of methodRows) {
    const arr = methods.get(r.programId) ?? [];
    arr.push({ key: r.key as Program["methods"][number]["key"], name: r.name, desc: r.desc, requirement: r.requirement, tag: r.tag });
    methods.set(r.programId, arr);
  }
  const thpt = new Map<string, Program["cutoffs"]>();
  const alt = new Map<string, NonNullable<Program["altCutoffs"]>>();
  for (const r of cutoffRows) {
    if (r.method === "thpt") {
      const arr = thpt.get(r.programId) ?? [];
      arr.push({ year: Number(r.year), score: Number(r.score), estimated: !!r.estimated });
      thpt.set(r.programId, arr);
    } else {
      const arr = alt.get(r.programId) ?? [];
      arr.push({ method: r.method as NonNullable<Program["altCutoffs"]>[number]["method"], year: Number(r.year), score: Number(r.score), estimated: !!r.estimated });
      alt.set(r.programId, arr);
    }
  }
  const verifiedFields = new Map<string, Partial<Record<VerifyField, string>>>();
  for (const row of verifiedRows) {
    const fields = verifiedFields.get(row.programId) ?? {};
    fields[row.field] = row.verifiedAt;
    verifiedFields.set(row.programId, fields);
  }
  return rows.map((r) => {
    const patched: Program = {
    id: r.id,
    slug: r.slug,
    schoolId: r.schoolId,
    majorId: r.majorId,
    name: r.name,
    admissionCode: r.admissionCode,
    trainingType: r.trainingType,
    campus: r.campus,
    combos: combos.get(r.id) ?? [],
    cutoffs: (thpt.get(r.id) ?? []).sort((a, b) => b.year - a.year),
    altCutoffs: (alt.get(r.id) ?? []).sort((a, b) => b.year - a.year),
    tuitionMin: Number(r.tuitionMin) || 0,
    tuitionMax: Number(r.tuitionMax) || 0,
    durationYears: Number(r.durationYears) || 4,
    quota: Number(r.quota) || 0,
    competition: r.competition || "Trung bình",
    methods: methods.get(r.id) ?? [],
    overview: r.overview || "",
    updatedAt: r.updatedAt || "",
    source: r.source || "",
    sourceUrl: r.sourceUrl || (/^https?:\/\//i.test(r.source) ? r.source : null),
    sourceNote: r.sourceNote,
    sourceCheckedAt: r.sourceCheckedAt || null,
    adminVerifiedAt: r.adminVerifiedAt || null,
    schoolVerifiedAt: r.schoolVerifiedAt || null,
    schoolVerifiedNote: r.schoolVerifiedNote || null,
    verifiedFields: verifiedFields.get(r.id),
    hidden: !!r.hidden,
    custom: !!r.custom,
    };
    return {
      ...patched,
      sourceUrl: patched.sourceUrl || (/^https?:\/\//i.test(patched.source) ? patched.source : null),
      cutoffs: includeHidden ? patched.cutoffs : patched.cutoffs.filter((item) => !item.estimated),
      altCutoffs: includeHidden ? patched.altCutoffs : patched.altCutoffs.filter((item) => !item.estimated),
    };
  });
}

async function loadScopedPrograms(key: string, scope: ProgramScope): Promise<Program[]> {
  const fromMemory = programsFromMemory(scope);
  if (fromMemory) return fromMemory;
  const hit = scopedProgramCache.get(key);
  if (hit && Date.now() - hit.loadedAt < CATALOG_FRESH_MS) return hit.items;
  const running = scopedProgramLoads.get(key);
  if (running) return running;
  const epoch = catalogEpoch;
  const load = loadProgramsBatched(scope)
    .then((items) => {
      if (epoch === catalogEpoch) scopedProgramCache.set(key, { loadedAt: Date.now(), items });
      return items;
    })
    .finally(() => { if (scopedProgramLoads.get(key) === load) scopedProgramLoads.delete(key); });
  scopedProgramLoads.set(key, load);
  return load;
}

async function refreshCoreCatalogCache(): Promise<void> {
  const epoch = catalogEpoch;
  // Đọc tuần tự để tái sử dụng một kết nối Neon thay vì tạo burst kết nối lúc cold start.
  const schools = await query<any>(`
        SELECT 
          s.id, s.slug, s.code, s.name, s.short_name AS "shortName",
          s.type, s.region_code AS "region", s.city, s.founded,
          s.students, s.highlight, s.website,
          NULLIF(to_jsonb(s)->>'logo_url', '') AS "logoUrl",
          NULLIF(to_jsonb(s)->>'cover_url', '') AS "coverUrl", s.description,
          s.scholarships, s.hidden, s.is_custom AS "custom",
          COALESCE(ARRAY_AGG(c.name ORDER BY c.position) FILTER (WHERE c.name IS NOT NULL), '{}') AS campuses
        FROM trovio.schools s
        LEFT JOIN trovio.school_campuses c ON c.school_id = s.id
        WHERE NOT s.hidden
        GROUP BY s.id
        ORDER BY s.name
      `);
  const majors = await query<any>(`
        SELECT 
          m.id, m.slug, COALESCE(m.code, '') AS code, m.name, m.group_id AS "groupId",
          m.summary, m.description, m.hidden,
          m.is_custom AS "custom",
          COALESCE(
            (
              SELECT json_agg(r.riasec_code ORDER BY r.rank)
              FROM trovio.major_riasec r
              WHERE r.major_id = m.id
            ), '[]'::json
          ) AS riasec
        FROM trovio.majors m
        WHERE NOT m.hidden
        ORDER BY m.name
      `);
  const groups = await query<MajorGroup>(`
        SELECT
          g.id, g.slug, g.name, g.icon, g.tone,
          COALESCE(to_jsonb(g)->>'description', '') AS description,
          COALESCE((to_jsonb(g)->>'position')::smallint, 0) AS position,
          COALESCE((to_jsonb(g)->>'featured')::boolean, true) AS featured
        FROM trovio.major_groups g
        WHERE NOT COALESCE((to_jsonb(g)->>'hidden')::boolean, false)
        ORDER BY position, name
      `);

  if (!schools.length || !majors.length) {
    console.warn("[PostgreSQL] Danh mục trường/ngành đang rỗng — chờ import dữ liệu mới.");
  }

  if (epoch !== catalogEpoch) return;
  cachedSchools = schools;
  cachedMajors = majors.map((row: any) => ({
    ...row,
    riasec: row.riasec as [RiasecType, RiasecType, RiasecType],
  }));
  cachedGroups = groups;
  coreCatalogHasData = cachedSchools.length > 0 && cachedMajors.length > 0;
  coreCatalogLoadedAt = Date.now();
  rebuildIndex();
}

async function refreshProgramCatalogCache(): Promise<void> {
  const epoch = catalogEpoch;
  const programs = await loadProgramsBatched();
  if (!programs.length) {
    console.warn("[PostgreSQL] Danh mục chương trình đang rỗng — chờ import dữ liệu mới.");
  }
  if (epoch !== catalogEpoch) return;
  cachedPrograms = programs;
  programCatalogHasData = cachedPrograms.length > 0;
  programCatalogLoadedAt = Date.now();
  rebuildIndex();
}

export async function refreshPostgresCache(): Promise<void> {
  await refreshCoreCatalogCache();
  await refreshProgramCatalogCache();
}

function cacheIsFresh(loadedAt: number, hasData: boolean): boolean {
  if (!loadedAt) return false;
  const ttl = hasData ? CATALOG_FRESH_MS : CATALOG_EMPTY_FRESH_MS;
  return Date.now() - loadedAt < ttl;
}

function startCoreCatalogRefresh(): Promise<void> {
  const epoch = catalogEpoch;
  coreCatalogLoad ??= refreshCoreCatalogCache()
    .then(() => {
      if (epoch === catalogEpoch) coreCatalogFailedAt = 0;
    })
    .catch((err: unknown) => {
      if (epoch !== catalogEpoch) return;
      coreCatalogFailedAt = Date.now();
      const message = err instanceof Error ? err.message : String(err);
      console.error("[PostgreSQL] Không tải được danh mục trường/ngành:", message);
    })
    .finally(() => {
      if (epoch === catalogEpoch) coreCatalogLoad = null;
    });
  return coreCatalogLoad;
}

async function ensureCoreCatalogLoaded(): Promise<void> {
  if (cacheIsFresh(coreCatalogLoadedAt, coreCatalogHasData)) return;
  if (coreCatalogFailedAt && Date.now() - coreCatalogFailedAt < CATALOG_FAIL_BACKOFF_MS) return;
  if (coreCatalogLoadedAt) {
    void startCoreCatalogRefresh();
    return;
  }
  await startCoreCatalogRefresh();
}

function startProgramCatalogRefresh(): Promise<void> {
  const epoch = catalogEpoch;
  programCatalogLoad ??= loadProgramsBatched()
    .then((programs) => {
      if (epoch !== catalogEpoch) return;
      cachedPrograms = programs;
      programCatalogHasData = programs.length > 0;
      programCatalogLoadedAt = Date.now();
      if (epoch === catalogEpoch) programCatalogFailedAt = 0;
      rebuildIndex();
    })
    .catch((err: unknown) => {
      if (epoch !== catalogEpoch) return;
      programCatalogFailedAt = Date.now();
      const message = err instanceof Error ? err.message : String(err);
      console.error("[PostgreSQL] Không tải được chi tiết chương trình:", message);
    })
    .finally(() => {
      if (epoch === catalogEpoch) programCatalogLoad = null;
    });
  return programCatalogLoad;
}

async function ensureProgramCatalogLoaded(): Promise<void> {
  await ensureCoreCatalogLoaded();
  if (cacheIsFresh(programCatalogLoadedAt, programCatalogHasData)) return;
  if (programCatalogFailedAt && Date.now() - programCatalogFailedAt < CATALOG_FAIL_BACKOFF_MS) return;
  if (programCatalogLoadedAt) {
    void startProgramCatalogRefresh();
    return;
  }
  await startProgramCatalogRefresh();
}

export function invalidatePostgresCache() {
  catalogEpoch++;
  coreCatalogLoad = null;
  programCatalogLoad = null;
  cachedSchools = [];
  cachedMajors = [];
  cachedPrograms = [];
  cachedGroups = [];
  coreCatalogLoadedAt = 0;
  programCatalogLoadedAt = 0;
  coreCatalogHasData = false;
  programCatalogHasData = false;
  coreCatalogFailedAt = 0;
  programCatalogFailedAt = 0;
  scopedProgramCache.clear();
  scopedProgramLoads.clear();
  rebuildIndex();
}

// ============================================================================
// 1. School Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresSchoolRepository: SchoolRepository = {
  async findAll(): Promise<School[]> {
    await ensureCoreCatalogLoaded();
    return cachedSchools;
  },

  async findById(id: string): Promise<School | null> {
    await ensureCoreCatalogLoaded();
    return catalogIndex.schoolById.get(id) ?? null;
  },

  async findBySlug(slug: string): Promise<School | null> {
    await ensureCoreCatalogLoaded();
    const s = catalogIndex.schoolBySlug.get(slug);
    return s && !s.hidden ? s : null;
  },
};

// ============================================================================
// 2. Major Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresMajorRepository: MajorRepository = {
  async findAll(): Promise<Major[]> {
    await ensureCoreCatalogLoaded();
    return cachedMajors;
  },

  async findById(id: string): Promise<Major | null> {
    await ensureCoreCatalogLoaded();
    return catalogIndex.majorById.get(id) ?? null;
  },

  async findBySlug(slug: string): Promise<Major | null> {
    await ensureCoreCatalogLoaded();
    const m = catalogIndex.majorBySlug.get(slug);
    return m && !m.hidden ? m : null;
  },

  async findGroups(): Promise<MajorGroup[]> {
    await ensureCoreCatalogLoaded();
    return cachedGroups;
  },
};

// ============================================================================
// 3. Program Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresProgramRepository: ProgramRepository = {
  async findAll(): Promise<Program[]> {
    await ensureProgramCatalogLoaded();
    return cachedPrograms;
  },

  async findById(id: string): Promise<Program | null> {
    return (await loadScopedPrograms(`id:${id}`, { kind: "id", value: id }))[0] ?? null;
  },

  async findBySlug(slug: string): Promise<Program | null> {
    return (await loadScopedPrograms(`slug:${slug}`, { kind: "slug", value: slug }))[0] ?? null;
  },

  async findByIds(ids: string[]): Promise<Program[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const key = `ids:${[...unique].sort().join(",")}`;
    const rows = await loadScopedPrograms(key, { kind: "ids", values: unique });
    const byId = new Map(rows.map((program) => [program.id, program]));
    return unique.map((id) => byId.get(id)).filter((program): program is Program => !!program);
  },

  async findBySchool(schoolId: string): Promise<Program[]> {
    return loadScopedPrograms(`school:${schoolId}`, { kind: "school", value: schoolId });
  },

  async findByMajor(majorId: string): Promise<Program[]> {
    return loadScopedPrograms(`major:${majorId}`, { kind: "major", value: majorId });
  },
};

// ============================================================================
// 4. Quiz Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresQuizRepository: QuizRepository = {
  async findQuestions(): Promise<RiasecQuestion[]> {
    if (cachedQuiz.length > 0) return cachedQuiz;
    const rows = await query<any>(`
        SELECT 
          q.id, q.text, q.riasec_code AS "type", q.position
        FROM trovio.riasec_questions q
        ORDER BY q.position
      `);
    cachedQuiz = rows.map((row: any) => ({
      id: Number(row.id),
      text: row.text,
      type: row.type as RiasecType,
    }));
    return cachedQuiz;
  },
};

// ============================================================================
// 5. User Repository (PostgreSQL)
// ============================================================================
function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl ?? null,
    passwordHash: row.passwordHash ?? null,
    googleId: row.googleId ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    verified: Boolean(row.verified),
    locked: Boolean(row.locked),
    lockUntil: row.lockUntil ? new Date(row.lockUntil).toISOString() : null,
    disabled: Boolean(row.disabled),
    failedAttempts: Number(row.failedAttempts ?? 0),
    sessionVersion: Number(row.sessionVersion ?? 0),
    emailOtpHash: row.emailOtpHash ?? null,
    emailOtpExpires: row.emailOtpExpires ? new Date(row.emailOtpExpires).toISOString() : null,
    role: row.role ?? null,
    teacherVerificationStatus: row.teacherVerificationStatus ?? "none",
    teacherVerificationId: row.teacherVerificationId ?? null,
    gradYear: row.gradYear == null ? null : Number(row.gradYear),
    province: row.province ?? null,
    under16: Boolean(row.under16),
    parentConsent: Boolean(row.parentConsent),
    onboarded: Boolean(row.onboarded),
    emailReminders: Boolean(row.emailReminders),
    lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
    moderator: Boolean(row.moderator),
    admin: Boolean(row.admin),
    schoolStaff: row.schoolId
      ? {
          schoolId: row.schoolId,
          status: row.schoolStaffStatus,
          requestedAt: new Date(row.schoolStaffRequestedAt).toISOString(),
          reviewedAt: row.schoolStaffReviewedAt ? new Date(row.schoolStaffReviewedAt).toISOString() : null,
        }
      : null,
  };
}

const USER_SELECT = `
  SELECT u.id, u.email, u.name, u.avatar_url AS "avatarUrl",
         u.password_hash AS "passwordHash", u.google_id AS "googleId",
         u.created_at AS "createdAt", u.verified, u.locked,
         u.lock_until AS "lockUntil", u.disabled,
         u.failed_attempts AS "failedAttempts", u.session_version AS "sessionVersion",
         u.email_otp_hash AS "emailOtpHash", u.email_otp_expires AS "emailOtpExpires",
         u.user_role AS role,
         u.teacher_verification_status AS "teacherVerificationStatus",
         u.teacher_verification_id AS "teacherVerificationId",
         u.grad_year AS "gradYear", u.province, u.under16,
         u.parent_consent AS "parentConsent", u.onboarded,
         u.email_reminders AS "emailReminders", u.last_login_at AS "lastLoginAt",
         EXISTS (SELECT 1 FROM trovio.user_system_roles r WHERE r.user_id=u.id AND r.role_code='admin') AS admin,
         EXISTS (SELECT 1 FROM trovio.user_system_roles r WHERE r.user_id=u.id AND r.role_code='moderator') AS moderator,
         ss.school_id AS "schoolId", ss.status AS "schoolStaffStatus",
         ss.requested_at AS "schoolStaffRequestedAt", ss.reviewed_at AS "schoolStaffReviewedAt"
  FROM trovio.users u LEFT JOIN trovio.school_staff ss ON ss.user_id = u.id`;

async function syncUserAccess(user: User): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM trovio.user_system_roles
       WHERE user_id = $1 AND role_code IN ('admin', 'moderator')`,
      [user.id],
    );
    for (const role of [user.admin ? "admin" : null, user.moderator ? "moderator" : null].filter(Boolean)) {
      await client.query(
        `INSERT INTO trovio.user_system_roles (user_id, role_code) VALUES ($1, $2)`,
        [user.id, role],
      );
    }

    await client.query(`DELETE FROM trovio.school_staff WHERE user_id = $1`, [user.id]);
    if (user.schoolStaff) {
      await client.query(
        `INSERT INTO trovio.school_staff (user_id, school_id, status, requested_at, reviewed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.schoolStaff.schoolId, user.schoolStaff.status, user.schoolStaff.requestedAt, user.schoolStaff.reviewedAt],
      );
    }
  });
}

export const postgresUserRepository: UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await query<any>(`${USER_SELECT} WHERE lower(u.email) = lower($1)`, [email]);
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findById(id: string): Promise<User | null> {
    const rows = await query<any>(`${USER_SELECT} WHERE u.id = $1`, [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const rows = await query<any>(`${USER_SELECT} WHERE u.google_id = $1`, [googleId]);
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async list(): Promise<User[]> {
    const rows = await query<any>(`${USER_SELECT} ORDER BY u.created_at DESC`);
    return rows.map(mapUser);
  },

  async create(input: Omit<User, "id" | "createdAt">): Promise<User> {
    const { randomUUID } = await import("node:crypto");
    const id = `u-${randomUUID()}`;
    const rows = await query<any>(`
      INSERT INTO trovio.users (
        id, email, name, avatar_url, password_hash, google_id, verified, locked,
        lock_until, disabled, failed_attempts, session_version,
        email_otp_hash, email_otp_expires, user_role,
        teacher_verification_status, teacher_verification_id,
        grad_year, province, under16, parent_consent, onboarded,
        email_reminders, last_login_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )
    `, [
      id, input.email.toLowerCase(), input.name, input.avatarUrl ?? null, input.passwordHash ?? null,
      input.googleId ?? null, input.verified, input.locked, input.lockUntil ?? null, input.disabled ?? false,
      input.failedAttempts, input.sessionVersion ?? 0, input.emailOtpHash ?? null, input.emailOtpExpires ?? null,
      input.role, input.teacherVerificationStatus ?? "none", input.teacherVerificationId ?? null,
      input.gradYear, input.province, input.under16, input.parentConsent, input.onboarded,
      input.emailReminders ?? false, input.lastLoginAt ?? null,
    ]);
    await syncUserAccess({ ...input, id, createdAt: new Date().toISOString() });
    const created = await this.findById(id);
    if (!created) throw new Error("[PostgreSQL] Không đọc lại được tài khoản vừa tạo.");
    return created;
  },

  async update(id: string, patch: Partial<Omit<User, "id">>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged: User = { ...existing, ...patch };
    await query(`
      UPDATE trovio.users
      SET 
        email = $2,
        password_hash = $3,
        name = $4, avatar_url = $5, user_role = $6, locked = $7,
        lock_until = $8, disabled = $9, google_id = $10,
        verified = $11, failed_attempts = $12, session_version = $13,
        email_otp_hash = $14, email_otp_expires = $15,
        teacher_verification_status = $16, teacher_verification_id = $17,
        grad_year = $18, province = $19, under16 = $20,
        parent_consent = $21, onboarded = $22, email_reminders = $23,
        last_login_at = $24
      WHERE id = $1
    `, [
      id, merged.email.toLowerCase(), merged.passwordHash, merged.name, merged.avatarUrl, merged.role,
      merged.locked, merged.lockUntil ?? null, merged.disabled ?? false, merged.googleId, merged.verified,
      merged.failedAttempts, merged.sessionVersion ?? 0, merged.emailOtpHash ?? null, merged.emailOtpExpires ?? null,
      merged.teacherVerificationStatus ?? "none", merged.teacherVerificationId ?? null,
      merged.gradYear, merged.province, merged.under16, merged.parentConsent, merged.onboarded,
      merged.emailReminders ?? false, merged.lastLoginAt ?? null,
    ]);
    await syncUserAccess(merged);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    return withTransaction(async (client) => {
      await client.query(
        `DELETE FROM trovio.app_documents WHERE owner_id = $1 OR (collection = 'user-data' AND id = $1)`,
        [id],
      );
      const result = await client.query(`DELETE FROM trovio.users WHERE id = $1 RETURNING id`, [id]);
      return result.rows.length > 0;
    });
  },
};
