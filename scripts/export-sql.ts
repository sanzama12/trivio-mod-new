/**
 * Sinh database/seed.sql từ CHÍNH dữ liệu & hằng số trong mã nguồn → SQL luôn khớp với website.
 *
 *   npx tsx scripts/export-sql.ts > database/seed.sql                 (demo: kèm tài khoản & nội dung minh hoạ)
 *   npx tsx scripts/export-sql.ts --production > database/seed-prod.sql (production: bỏ mục 8–9)
 *   psql -d trovio -f database/schema.sql && psql -d trovio -f database/seed.sql
 *
 * Gồm: danh mục tham chiếu (miền, khu vực/nhóm ưu tiên, phương thức, môn, tổ hợp, RIASEC, 4 trục phong cách, vai trò),
 * nhóm ngành, trường, ngành, chương trình (tổ hợp, phương thức, điểm chuẩn nhiều năm), ngân hàng 60 câu RIASEC,
 * 12 câu mini-test, hồ sơ phong cách ngành, quy tắc & trọng số gợi ý, nguồn dữ liệu, việc làm, mốc tuyển sinh,
 * tài khoản demo (mật khẩu băm scrypt như khi chạy web), cảm nhận / hỏi đáp / lớp / khảo sát minh hoạ.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { subjects, combos } from "../src/data/combos";
import { majorGroups } from "../src/data/major-groups";
import { schools } from "../src/data/schools";
import { majors } from "../src/data/majors";
import { programs } from "../src/data/programs";
import { riasecQuestions } from "../src/data/riasec";
import { dataSources, benchmarks, schoolOutcomes, majorOutcomes } from "../src/data/outcomes";
import { admissionTimeline, TIMELINE_SEASON, TIMELINE_NOTE } from "../src/data/admission-timeline";
import { seedUsers } from "../src/data/users";
import { seedReviews } from "../src/data/reviews";
import { seedQuestions, seedOutcomeSurveys, seedClasses, DEMO_SCHOOL_VERIFIED } from "../src/data/community";
import { RIASEC_INFO, RIASEC_ORDER } from "../src/domain/riasec";
import { AXIS_INFO, WORK_AXES, WORK_STYLE_QUESTIONS, GROUP_STYLE, MAJOR_STYLE } from "../src/domain/work-style";
import { ADMISSION_METHODS, PRIORITY_GROUP_LABELS, PRIORITY_GROUP_POINTS, PRIORITY_REGION_LABELS, PRIORITY_REGION_POINTS } from "../src/services/scoring.service";
import { REGION_LABELS } from "../src/services/program.filters";
import { DEFAULT_REC_WEIGHTS, DEFAULT_RULES } from "../src/services/rules.service";
import { hashPassword } from "../src/services/password.hash";

type V = string | number | boolean | null | undefined;
const q = (v: V): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Số không hợp lệ: ${v}`);
    return String(v);
  }
  return `'${v.replace(/'/g, "''")}'`;
};
const out: string[] = [];
const PRODUCTION = process.argv.includes("--production");
const insert = (table: string, cols: string[], rows: V[][]) => {
  if (rows.length === 0) return;
  out.push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES`);
  out.push(rows.map((r) => `  (${r.map(q).join(", ")})`).join(",\n") + ";\n");
};
const section = (t: string) => out.push(`\n-- ${"=".repeat(96)}\n-- ${t}\n-- ${"=".repeat(96)}`);
const ymd = (s: string) => s.slice(0, 10);

async function main() {
  out.push("-- TỰ ĐỘNG SINH bởi scripts/export-sql.ts từ src/data + src/domain + src/services. Không sửa tay — chạy lại script.");
  out.push(`-- Sinh lúc: ${new Date().toISOString()}`);
  out.push("BEGIN;\nSET search_path TO trovio, public;");

  section("1. Danh mục tham chiếu");
  insert("regions", ["code", "name"], Object.entries(REGION_LABELS).map(([k, v]) => [k, v]));
  insert("priority_regions", ["code", "name", "points"], Object.entries(PRIORITY_REGION_POINTS).map(([k, v]) => [k, PRIORITY_REGION_LABELS[k as keyof typeof PRIORITY_REGION_LABELS], v]));
  insert("priority_groups", ["code", "name", "points"], Object.entries(PRIORITY_GROUP_POINTS).map(([k, v]) => [k, PRIORITY_GROUP_LABELS[k as keyof typeof PRIORITY_GROUP_LABELS], v]));
  insert(
    "admission_methods",
    ["code", "name", "short_name", "max_score", "factor", "decimals", "needs_combo"],
    Object.entries(ADMISSION_METHODS).map(([k, m]) => [k, m.label, m.short, m.max, m.factor, m.decimals, m.needsCombo]),
  );
  insert("subjects", ["id", "name", "short_name"], subjects.map((s) => [s.id, s.name, s.short]));
  insert("combos", ["code"], combos.map((c) => [c.code]));
  insert("combo_subjects", ["combo_code", "position", "subject_id"], combos.flatMap((c) => c.subjects.map((s, i) => [c.code, i + 1, s])));
  insert("riasec_types", ["code", "name_en", "label", "description", "position"], RIASEC_ORDER.map((t, i) => [t, RIASEC_INFO[t].name, RIASEC_INFO[t].label, RIASEC_INFO[t].desc, i + 1]));
  insert("work_axes", ["code", "left_label", "right_label", "position"], WORK_AXES.map((a, i) => [a, AXIS_INFO[a].left, AXIS_INFO[a].right, i + 1]));
  insert("system_roles", ["code", "name", "description"], [
    ["admin", "Quản trị viên", "Toàn quyền dữ liệu tuyển sinh, người dùng, quy tắc gợi ý (A01–A09)"],
    ["moderator", "Kiểm duyệt viên", "Chỉ duyệt cảm nhận và hỏi đáp"],
    ["school_staff", "Cán bộ tuyển sinh", "Xác nhận số liệu / gửi bản sửa cho trường của mình ở Cổng trường"],
  ]);

  section("2. Nhóm ngành, trường, ngành");
  insert("major_groups", ["id", "slug", "name", "icon", "tone", "position"], majorGroups.map((g, i) => [g.id, g.slug, g.name, g.icon, g.tone, i + 1]));
  insert(
    "schools",
    ["id", "slug", "code", "name", "short_name", "type", "region_code", "city", "founded", "students", "highlight", "website", "description", "scholarships", "hidden", "is_custom"],
    schools.map((s) => [s.id, s.slug, s.code, s.name, s.shortName, s.type, s.region, s.city, s.founded, s.students, s.highlight, s.website, s.description, s.scholarships, !!s.hidden, !!s.custom]),
  );
  insert("school_campuses", ["school_id", "name", "position"], schools.flatMap((s) => [...new Set(s.campuses)].map((c, i) => [s.id, c, i + 1])));
  insert(
    "majors",
    ["id", "slug", "code", "name", "group_id", "summary", "description", "demand", "growth", "hidden", "is_custom"],
    majors.map((m) => [m.id, m.slug, m.code, m.name, m.groupId, m.summary, m.description, m.demand, m.growth, !!m.hidden, !!m.custom]),
  );
  insert("major_riasec", ["major_id", "rank", "riasec_code"], majors.flatMap((m) => m.riasec.map((t, i) => [m.id, i + 1, t])));
  // Khối chương trình học: chèn khối rồi lấy id qua (major_id, position)
  for (const m of majors) {
    m.curriculum.forEach((b, bi) => {
      out.push(
        `WITH b AS (INSERT INTO major_curriculum_blocks (major_id, title, position) VALUES (${q(m.id)}, ${q(b.title)}, ${bi + 1}) RETURNING id)\n` +
          (b.items.length
            ? `INSERT INTO major_curriculum_items (block_id, name, description, position) SELECT b.id, x.name, x.description, x.position FROM b, (VALUES ${b.items
                .map((it, ii) => `(${q(it.name)}, ${q(it.desc)}, ${ii + 1})`)
                .join(", ")}) AS x(name, description, position);`
            : "SELECT 1 FROM b;"),
      );
    });
  }
  insert("major_careers", ["major_id", "title", "salary_text", "description", "level", "position"], majors.flatMap((m) => m.careers.map((c, i) => [m.id, c.title, c.salary, c.desc, c.level, i + 1])));

  section("3. Chương trình đào tạo, tổ hợp, phương thức, điểm chuẩn");
  const verified = new Map(DEMO_SCHOOL_VERIFIED);
  insert(
    "programs",
    ["id", "slug", "school_id", "major_id", "name", "admission_code", "training_type", "campus", "tuition_min", "tuition_max", "duration_years", "quota", "competition", "overview", "data_updated", "source", "source_url", "source_checked_at", "source_note", "admin_verified_at", "school_verified_at", "school_verified_note", "hidden", "is_custom"],
    programs.map((p) => [
      p.id, p.slug, p.schoolId, p.majorId, p.name, p.admissionCode, p.trainingType, p.campus, p.tuitionMin, p.tuitionMax, p.durationYears, p.quota, p.competition, p.overview,
      p.updatedAt, p.source, p.sourceUrl ?? null, p.sourceCheckedAt ? ymd(p.sourceCheckedAt) : null, p.sourceNote ?? null, p.adminVerifiedAt ? ymd(p.adminVerifiedAt) : null,
      p.schoolVerifiedAt ? ymd(p.schoolVerifiedAt) : (verified.get(p.id) ?? null), p.schoolVerifiedNote ?? null, !!p.hidden, !!p.custom,
    ]),
  );
  insert("program_combos", ["program_id", "combo_code"], programs.flatMap((p) => [...new Set(p.combos)].map((c) => [p.id, c])));
  insert(
    "program_admission_methods",
    ["program_id", "method_code", "name", "description", "requirement", "tag", "position"],
    programs.flatMap((p) => p.methods.map((m, i) => [p.id, m.key ?? null, m.name, m.desc, m.requirement, m.tag, i + 1])),
  );
  insert(
    "program_cutoffs",
    ["program_id", "method_code", "year", "score", "is_estimated"],
    programs.flatMap((p) => [
      ...p.cutoffs.map((c) => [p.id, "thpt", c.year, c.score, false] as V[]),
      ...p.altCutoffs.map((c) => [p.id, c.method, c.year, c.score, !!c.estimated] as V[]),
    ]),
  );
  insert("program_verified_fields", ["program_id", "field", "verified_at"], programs.flatMap((p) => Object.entries(p.verifiedFields ?? {}).map(([f, d]) => [p.id, f, ymd(String(d))])));

  section("4. Trắc nghiệm RIASEC, mini-test phong cách, hồ sơ phong cách ngành");
  const pos: Record<string, number> = {};
  insert(
    "riasec_questions",
    ["id", "riasec_code", "text", "position", "hidden", "is_custom"],
    riasecQuestions.map((x) => [x.id, x.type, x.text, (pos[x.type] = (pos[x.type] ?? 0) + 1), !!x.hidden, !!x.custom]),
  );
  insert("riasec_type_weights", ["riasec_code", "weight"], RIASEC_ORDER.map((t) => [t, 1.0]));
  insert("work_style_questions", ["id", "axis_code", "prompt", "option_a", "option_b", "flip", "position"], WORK_STYLE_QUESTIONS.map((x, i) => [x.id, x.axis, x.prompt, x.a, x.b, !!x.flip, i + 1]));
  insert("major_group_work_styles", ["group_id", "axis_code", "pole"], Object.entries(GROUP_STYLE).flatMap(([g, prof]) => Object.entries(prof).map(([a, p]) => [g, a, p])));
  const majorIdBySlug = new Map(majors.map((m) => [m.slug, m.id]));
  insert(
    "major_work_styles",
    ["major_id", "axis_code", "pole"],
    Object.entries(MAJOR_STYLE).flatMap(([slug, prof]) => (majorIdBySlug.has(slug) ? Object.entries(prof).map(([a, p]) => [majorIdBySlug.get(slug)!, a, p]) : [])),
  );

  section("5. Cấu hình gợi ý (A09)");
  const W = DEFAULT_REC_WEIGHTS;
  insert("recommend_weights", ["id", "interest", "fit", "place", "group_match"], [[1, W.interest / 100, W.fit / 100, W.place / 100, W.group / 100]]);
  insert(
    "recommend_rules",
    ["id", "kind", "name", "description", "version", "status", "builtin", "position", "updated_at"],
    DEFAULT_RULES.map((r, i) => [r.id, r.kind, r.name, r.description, r.version, r.status, r.builtin, i + 1, r.updatedAt]),
  );
  insert("recommend_rule_params", ["rule_id", "key", "value"], DEFAULT_RULES.flatMap((r) => Object.entries(r.params).map(([k, v]) => [r.id, k, String(v)])));

  section("6. Nguồn dữ liệu, việc làm & thu nhập");
  insert(
    "data_sources",
    ["id", "title", "publisher", "year", "url", "kind", "trust", "note", "accessed_at"],
    dataSources.map((s) => [s.id, s.title, s.publisher, s.year, s.url, s.kind, s.trust, s.note, s.accessedAt]),
  );
  const metricRows: V[][] = [];
  for (const o of majorOutcomes) {
    for (const [key, col] of [["employmentRate", "employment_rate"], ["startingSalary", "starting_salary"], ["experiencedSalary", "experienced_salary"]] as const) {
      const m = o[key];
      if (m) metricRows.push([o.majorId, col, m.value, m.low ?? null, m.high ?? null, m.year, m.sourceId, m.sampleSize ?? null, m.note ?? null, o.updatedAt]);
    }
  }
  insert("major_outcomes", ["major_id", "metric", "value", "low", "high", "year", "source_id", "sample_size", "note", "data_updated"], metricRows);
  insert(
    "school_outcomes",
    ["school_id", "employment_rate", "employment_year", "employment_source_id", "employment_sample_size", "employment_note", "salary_note", "salary_year", "salary_source_id", "cohort"],
    schoolOutcomes.map((s) => [
      s.schoolId, s.employmentRate?.value ?? null, s.employmentRate?.year ?? null, s.employmentRate?.sourceId ?? null, s.employmentRate?.sampleSize ?? null, s.employmentRate?.note ?? null,
      s.salaryNote?.text ?? null, s.salaryNote?.year ?? null, s.salaryNote?.sourceId ?? null, s.cohort ?? null,
    ]),
  );
  insert("benchmarks", ["id", "label", "value", "unit", "year", "source_id"], benchmarks.map((b) => [b.id, b.label, b.value, b.unit, b.year, b.sourceId]));

  section("7. Mốc tuyển sinh");
  insert("timeline_config", ["id", "season", "official", "source_url", "note"], [[1, TIMELINE_SEASON, false, null, TIMELINE_NOTE]]);
  insert("timeline_events", ["id", "title", "start_date", "end_date", "category", "description"], admissionTimeline.map((e) => [e.id, e.title, e.start, e.end ?? null, e.category, e.desc]));

  if (PRODUCTION) {
    out.push("\n-- --production: bỏ tài khoản demo và nội dung cộng đồng minh hoạ (mục 8–9).\nCOMMIT;");
    const sql = out.join("\n") + "\n";
    const targetPath = join(process.cwd(), "database", "seed-prod.sql");
    writeFileSync(targetPath, sql, "utf-8");
    console.log(`✓ Đã xuất thành công ${targetPath}`);
    return;
  }
  section("8. Tài khoản demo (mật khẩu băm scrypt giống web) — CHỈ dùng cho môi trường demo");
  const userIds = new Set(seedUsers.map((u) => u.id));
  const userRows: V[][] = [];
  for (const u of seedUsers) {
    userRows.push([
      u.id, u.email.toLowerCase(), u.name, u.avatarUrl, u.password ? await hashPassword(u.password) : null, u.googleId, u.verified, u.locked, !!u.disabled, u.failedAttempts,
      u.role, u.gradYear, u.province, u.under16, u.parentConsent, u.onboarded, !!u.emailReminders, !!u.surveyOptIn, u.createdAt,
    ]);
  }
  insert(
    "users",
    ["id", "email", "name", "avatar_url", "password_hash", "google_id", "verified", "locked", "disabled", "failed_attempts", "user_role", "grad_year", "province", "under16", "parent_consent", "onboarded", "email_reminders", "survey_opt_in", "created_at"],
    userRows,
  );
  insert(
    "user_system_roles",
    ["user_id", "role_code"],
    seedUsers.flatMap((u) => [...(u.admin ? [[u.id, "admin"]] : []), ...(u.moderator ? [[u.id, "moderator"]] : [])]),
  );
  insert(
    "school_staff",
    ["user_id", "school_id", "status", "requested_at", "reviewed_at"],
    seedUsers.filter((u) => u.schoolStaff).map((u) => [u.id, u.schoolStaff!.schoolId, u.schoolStaff!.status, u.schoolStaff!.requestedAt, u.schoolStaff!.reviewedAt ?? null]),
  );

  section("9. Nội dung cộng đồng minh hoạ (is_demo = true)");
  const uid = (id: string | null | undefined) => (id && userIds.has(id) ? id : null);
  insert(
    "school_reviews",
    ["id", "school_id", "user_id", "author_name", "anonymous", "relation", "cohort", "major_id", "rating_teaching", "rating_facilities", "rating_activities", "rating_career", "title", "content", "status", "reject_reason", "school_email", "is_demo", "created_at", "updated_at", "moderated_at", "moderated_by"],
    seedReviews.map((r) => [
      r.id, r.schoolId, uid(r.userId), r.authorName, r.anonymous, r.relation, r.cohort, r.majorId, r.ratings.teaching, r.ratings.facilities, r.ratings.activities, r.ratings.career,
      r.title, r.content, r.status, r.rejectReason, r.schoolEmail, true, r.createdAt, r.updatedAt, r.moderatedAt, uid(r.moderatedBy),
    ]),
  );
  insert("review_flags", ["review_id", "flag"], seedReviews.flatMap((r) => [...new Set(r.flags)].map((f) => [r.id, f])));
  insert("qa_questions", ["id", "program_id", "user_id", "text", "status", "is_demo", "created_at"], seedQuestions.map((x) => [x.id, x.programId, uid(x.userId), x.text, x.status, true, x.createdAt]));
  insert(
    "qa_answers",
    ["id", "question_id", "user_id", "display_name", "school_domain", "text", "status", "created_at"],
    seedQuestions.flatMap((x) => x.answers.filter((a) => uid(a.userId)).map((a) => [a.id, x.id, a.userId, a.displayName, a.schoolDomain, a.text, a.status, a.createdAt])),
  );
  insert(
    "outcome_surveys",
    ["id", "program_id", "user_id", "satisfaction", "choose_again", "choose_school_again", "trovio_right", "wish", "cohort", "is_demo", "created_at"],
    seedOutcomeSurveys.map((s) => [s.id, s.programId, uid(s.userId), s.satisfaction, s.chooseAgain, s.chooseSchoolAgain ?? null, s.trovioRight, s.wish, s.cohort, true, s.createdAt]),
  );
  insert("teacher_classes", ["id", "teacher_id", "name", "school_name", "code", "last_remind_at", "created_at"], seedClasses.map((c) => [c.id, c.teacherId, c.name, c.school, c.code, c.lastRemindAt, c.createdAt]));
  insert("class_members", ["class_id", "user_id"], seedClasses.flatMap((c) => c.memberIds.filter((m) => userIds.has(m)).map((m) => [c.id, m])));

  out.push("\nCOMMIT;");
  const sql = out.join("\n") + "\n";
  const targetPath = PRODUCTION
    ? join(process.cwd(), "database", "seed-prod.sql")
    : join(process.cwd(), "database", "seed.sql");
  writeFileSync(targetPath, sql, "utf-8");
  console.log(`✓ Đã xuất thành công ${targetPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
