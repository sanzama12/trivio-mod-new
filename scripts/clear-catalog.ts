/**
 * Xóa sạch dữ liệu trường, ngành, điểm trên PostgreSQL.
 * Giữ nguyên schema, dữ liệu tham chiếu (regions, subjects, combos…) và tài khoản.
 * Chạy: npx tsx scripts/clear-catalog.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { Client } from "pg";

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) { console.error("❌ Thiếu DATABASE_URL"); process.exit(1); }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET search_path TO trovio, public");

  // Xóa theo thứ tự foreign key: con → cha
  const steps = [
    "TRUNCATE wishlist_items, saved_programs, outcome_surveys, qa_answers, qa_questions, school_submissions CASCADE",
    "UPDATE data_reports SET program_id = NULL",
    "UPDATE share_comments SET program_id = NULL",
    "UPDATE goals SET ref_program_id = NULL, major_id = NULL",
    "TRUNCATE program_verified_fields, program_cutoffs, program_admission_methods, program_combos, programs CASCADE",
    "TRUNCATE school_reviews, school_outcomes, school_campuses, school_staff, chat_aliases, schools CASCADE",
    "TRUNCATE major_outcomes, major_careers, major_curriculum_items, major_curriculum_blocks, major_riasec, major_work_styles, majors CASCADE",
    "DELETE FROM app_documents WHERE collection = 'program-patch'",
  ];

  for (const sql of steps) {
    try { await client.query(sql); } catch {}
  }

  await client.query("COMMIT");
  console.log("✅ Đã xóa sạch trường, ngành, điểm.");
  await client.end();
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
