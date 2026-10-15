/**
 * DATA ACCESS LAYER — PostgreSQL Implementation
 * Triển khai các Repository Interface truy xuất trực tiếp vào cơ sở dữ liệu PostgreSQL (Neon Cloud).
 * Tuân thủ mô hình kiến trúc 3 lớp (3-Layer Architecture).
 */
import { query, withTransaction } from "../lib/db";
import { buildCatalogIndex, type CatalogIndex } from "../lib/catalog-index";
import { applyProgramPatch } from "../models/program.model";
import type {
  School,
  Major,
  MajorGroup,
  Program,
  ProgramPatch,
  RiasecQuestion,
  User,
  RiasecType,
} from "../domain/types";
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
let catalogLoad: Promise<void> | null = null;
/** Lần nạp thành công gần nhất, kể cả khi danh mục rỗng. */
let catalogLoadedAt = 0;
let catalogHasData = false;
let catalogFailedAt = 0;

const CATALOG_FRESH_MS = 2 * 60 * 1000;
const CATALOG_EMPTY_FRESH_MS = 30 * 1000;
const CATALOG_FAIL_BACKOFF_MS = 15 * 1000;

function rebuildIndex(): void {
  catalogIndex = buildCatalogIndex(cachedSchools, cachedMajors, cachedPrograms);
}

async function loadProgramsBatched(): Promise<Program[]> {
  const rows = await query<{
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
    hidden: boolean;
    custom: boolean;
    schoolVerifiedAt: string | null;
    schoolVerifiedNote: string | null;
  }>(`
    SELECT
      p.id, p.slug, p.school_id AS "schoolId", p.major_id AS "majorId",
      p.name, p.admission_code AS "admissionCode", p.training_type AS "trainingType",
      p.campus, p.tuition_min AS "tuitionMin", p.tuition_max AS "tuitionMax",
      p.duration_years AS "durationYears", p.quota, p.competition,
      p.overview, p.data_updated AS "updatedAt", p.source,
      p.source_url AS "sourceUrl", p.hidden, p.is_custom AS "custom",
      p.school_verified_at AS "schoolVerifiedAt",
      p.school_verified_note AS "schoolVerifiedNote"
    FROM trovio.programs p
    WHERE NOT p.hidden
  `);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [comboRows, methodRows, cutoffRows, overrideRows] = await Promise.all([
    query<{ programId: string; comboCode: string }>(
      `SELECT program_id AS "programId", combo_code AS "comboCode" FROM trovio.program_combos WHERE program_id = ANY($1::text[])`,
      [ids],
    ),
    query<{ programId: string; key: string; name: string; desc: string; requirement: string; tag: string }>(
      `SELECT program_id AS "programId", method_code AS key, name, description AS "desc", requirement, tag
       FROM trovio.program_admission_methods WHERE program_id = ANY($1::text[]) ORDER BY position`,
      [ids],
    ),
    query<{ programId: string; method: string; year: string | number; score: string | number; estimated: boolean }>(
      `SELECT program_id AS "programId", method_code AS method, year, score, is_estimated AS estimated
       FROM trovio.program_cutoffs WHERE program_id = ANY($1::text[])`,
      [ids],
    ),
    query<{ id: string; payload: ProgramPatch }>(
      `SELECT id, payload FROM trovio.app_documents WHERE collection = 'program-patch' AND id = ANY($1::text[])`,
      [ids],
    ),
  ]);
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
  const thpt = new Map<string, { year: number; score: number }[]>();
  const alt = new Map<string, NonNullable<Program["altCutoffs"]>>();
  for (const r of cutoffRows) {
    if (r.method === "thpt") {
      const arr = thpt.get(r.programId) ?? [];
      arr.push({ year: Number(r.year), score: Number(r.score) });
      thpt.set(r.programId, arr);
    } else {
      const arr = alt.get(r.programId) ?? [];
      arr.push({ method: r.method as NonNullable<Program["altCutoffs"]>[number]["method"], year: Number(r.year), score: Number(r.score), estimated: !!r.estimated });
      alt.set(r.programId, arr);
    }
  }
  const overrides = new Map(overrideRows.map((row) => [row.id, row.payload]));
  return rows.map((r) => applyProgramPatch({
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
    sourceUrl: r.sourceUrl || null,
    schoolVerifiedAt: r.schoolVerifiedAt || null,
    schoolVerifiedNote: r.schoolVerifiedNote || null,
    hidden: !!r.hidden,
    custom: !!r.custom,
  }, overrides.get(r.id)));
}

export async function refreshPostgresCache(): Promise<void> {
  const [schools, majors, groups, programs] = await Promise.all([
      query<any>(`
        SELECT 
          s.id, s.slug, s.code, s.name, s.short_name AS "shortName",
          s.type, s.region_code AS "region", s.city, s.founded,
          s.students, s.highlight, s.website, s.description,
          s.scholarships, s.hidden, s.is_custom AS "custom",
          COALESCE(ARRAY_AGG(c.name ORDER BY c.position) FILTER (WHERE c.name IS NOT NULL), '{}') AS campuses
        FROM trovio.schools s
        LEFT JOIN trovio.school_campuses c ON c.school_id = s.id
        WHERE NOT s.hidden
        GROUP BY s.id
        ORDER BY s.name
      `),
      query<any>(`
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
        WHERE NOT m.hidden
        ORDER BY m.name
      `),
      query<MajorGroup>(`
        SELECT id, slug, name, icon, tone
        FROM trovio.major_groups
        ORDER BY position
      `),
      loadProgramsBatched(),
  ]);

  if (!schools.length || !majors.length || !programs.length) {
    console.warn("[PostgreSQL] Danh mục đang rỗng — chờ import dữ liệu mới.");
  }

  cachedSchools = schools;
  cachedMajors = majors.map((row: any) => ({
    ...row,
    growth: Number(row.growth),
    riasec: row.riasec as [RiasecType, RiasecType, RiasecType],
    curriculum: [],
    careers: [],
  }));
  cachedGroups = groups;
  cachedPrograms = programs;
  catalogHasData = cachedSchools.length > 0 && cachedMajors.length > 0 && cachedPrograms.length > 0;
  catalogLoadedAt = Date.now();
  rebuildIndex();
}

function catalogIsFresh(): boolean {
  if (!catalogLoadedAt) return false;
  const ttl = catalogHasData ? CATALOG_FRESH_MS : CATALOG_EMPTY_FRESH_MS;
  return Date.now() - catalogLoadedAt < ttl;
}

function startCatalogRefresh(): Promise<void> {
  catalogLoad ??= refreshPostgresCache()
    .then(() => {
      catalogFailedAt = 0;
    })
    .catch((err: unknown) => {
      catalogFailedAt = Date.now();
      const message = err instanceof Error ? err.message : String(err);
      console.error("[PostgreSQL] Không tải được danh mục:", message);
    })
    .finally(() => {
      catalogLoad = null;
    });
  return catalogLoad;
}

async function ensureCatalogLoaded(): Promise<void> {
  if (catalogIsFresh()) return;
  if (catalogFailedAt && Date.now() - catalogFailedAt < CATALOG_FAIL_BACKOFF_MS) return;
  if (catalogLoadedAt) {
    void startCatalogRefresh();
    return;
  }
  await startCatalogRefresh();
}

export function invalidatePostgresCache() {
  cachedSchools = [];
  cachedMajors = [];
  cachedPrograms = [];
  cachedGroups = [];
  catalogLoadedAt = 0;
  catalogHasData = false;
  catalogFailedAt = 0;
  rebuildIndex();
}

// ============================================================================
// 1. School Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresSchoolRepository: SchoolRepository = {
  async findAll(): Promise<School[]> {
    await ensureCatalogLoaded();
    return cachedSchools;
  },

  async findById(id: string): Promise<School | null> {
    await ensureCatalogLoaded();
    return catalogIndex.schoolById.get(id) ?? null;
  },

  async findBySlug(slug: string): Promise<School | null> {
    await ensureCatalogLoaded();
    const s = catalogIndex.schoolBySlug.get(slug);
    return s && !s.hidden ? s : null;
  },
};

// ============================================================================
// 2. Major Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresMajorRepository: MajorRepository = {
  async findAll(): Promise<Major[]> {
    await ensureCatalogLoaded();
    return cachedMajors;
  },

  async findById(id: string): Promise<Major | null> {
    await ensureCatalogLoaded();
    return catalogIndex.majorById.get(id) ?? null;
  },

  async findBySlug(slug: string): Promise<Major | null> {
    await ensureCatalogLoaded();
    const m = catalogIndex.majorBySlug.get(slug);
    return m && !m.hidden ? m : null;
  },

  async findGroups(): Promise<MajorGroup[]> {
    await ensureCatalogLoaded();
    return cachedGroups;
  },
};

// ============================================================================
// 3. Program Repository (PostgreSQL + RAM Cache)
// ============================================================================
export const postgresProgramRepository: ProgramRepository = {
  async findAll(): Promise<Program[]> {
    await ensureCatalogLoaded();
    return cachedPrograms;
  },

  async findById(id: string): Promise<Program | null> {
    await ensureCatalogLoaded();
    return catalogIndex.programById.get(id) ?? null;
  },

  async findBySlug(slug: string): Promise<Program | null> {
    await ensureCatalogLoaded();
    return catalogIndex.programBySlug.get(slug) ?? null;
  },

  async findByIds(ids: string[]): Promise<Program[]> {
    await ensureCatalogLoaded();
    const out: Program[] = [];
    for (const id of ids) {
      const p = catalogIndex.programById.get(id);
      if (p) out.push(p);
    }
    return out;
  },

  async findBySchool(schoolId: string): Promise<Program[]> {
    await ensureCatalogLoaded();
    return catalogIndex.programsBySchool.get(schoolId) ?? [];
  },

  async findByMajor(majorId: string): Promise<Program[]> {
    await ensureCatalogLoaded();
    return catalogIndex.programsByMajor.get(majorId) ?? [];
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
    surveyOptIn: Boolean(row.surveyOptIn),
    surveyOptInAt: row.surveyOptInAt ? new Date(row.surveyOptInAt).toISOString() : null,
    surveyInvitedAt: row.surveyInvitedAt ? new Date(row.surveyInvitedAt).toISOString() : null,
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
         u.survey_opt_in AS "surveyOptIn", u.survey_opt_in_at AS "surveyOptInAt",
         u.survey_invited_at AS "surveyInvitedAt",
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
        email_reminders, last_login_at, survey_opt_in, survey_opt_in_at, survey_invited_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      )
    `, [
      id, input.email.toLowerCase(), input.name, input.avatarUrl ?? null, input.passwordHash ?? null,
      input.googleId ?? null, input.verified, input.locked, input.lockUntil ?? null, input.disabled ?? false,
      input.failedAttempts, input.sessionVersion ?? 0, input.emailOtpHash ?? null, input.emailOtpExpires ?? null,
      input.role, input.teacherVerificationStatus ?? "none", input.teacherVerificationId ?? null,
      input.gradYear, input.province, input.under16, input.parentConsent, input.onboarded,
      input.emailReminders ?? false, input.lastLoginAt ?? null, input.surveyOptIn ?? false,
      input.surveyOptInAt ?? null, input.surveyInvitedAt ?? null,
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
        last_login_at = $24, survey_opt_in = $25, survey_opt_in_at = $26,
        survey_invited_at = $27
      WHERE id = $1
    `, [
      id, merged.email.toLowerCase(), merged.passwordHash, merged.name, merged.avatarUrl, merged.role,
      merged.locked, merged.lockUntil ?? null, merged.disabled ?? false, merged.googleId, merged.verified,
      merged.failedAttempts, merged.sessionVersion ?? 0, merged.emailOtpHash ?? null, merged.emailOtpExpires ?? null,
      merged.teacherVerificationStatus ?? "none", merged.teacherVerificationId ?? null,
      merged.gradYear, merged.province, merged.under16, merged.parentConsent, merged.onboarded,
      merged.emailReminders ?? false, merged.lastLoginAt ?? null, merged.surveyOptIn ?? false,
      merged.surveyOptInAt ?? null, merged.surveyInvitedAt ?? null,
    ]);
    await syncUserAccess(merged);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    return withTransaction(async (client) => {
      await client.query(
        `UPDATE trovio.app_documents
         SET payload = jsonb_set(
           payload,
           '{helpful}',
           COALESCE(
             (SELECT jsonb_agg(elem) FROM jsonb_array_elements(COALESCE(payload->'helpful', '[]'::jsonb)) elem WHERE elem #>> '{}' <> $1),
             '[]'::jsonb
           )
         )
         WHERE collection = 'review' AND COALESCE(payload->'helpful', '[]'::jsonb) @> to_jsonb($1::text)`,
        [id],
      );
      await client.query(
        `DELETE FROM trovio.app_documents WHERE owner_id = $1 OR (collection = 'user-data' AND id = $1)`,
        [id],
      );
      const result = await client.query(`DELETE FROM trovio.users WHERE id = $1 RETURNING id`, [id]);
      return result.rows.length > 0;
    });
  },
};
