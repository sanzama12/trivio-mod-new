import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { Client } from "pg";

async function main() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("❌ Lỗi: Chưa tìm thấy biến môi trường DATABASE_URL hoặc POSTGRES_URL.");
    process.exit(1);
  }

  console.log("🚀 Đang kết nối tới Neon PostgreSQL...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Kết nối Neon PostgreSQL thành công!");

  // 1. Run schema.sql (Fresh schema in public)
  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  console.log(`📄 Đang nạp lược đồ (schema.sql) từ ${schemaPath}...`);
  await client.query("DROP SCHEMA IF EXISTS trovio CASCADE;");
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER; GRANT ALL ON SCHEMA public TO public; SET search_path TO public;");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  await client.query(schemaSql);
  console.log("✅ Nạp lược đồ (Schema & Tables & Views & Triggers) thành công!");

  // 2. Run seed.sql (nếu có)
  const seedPath = path.join(process.cwd(), "database", "seed.sql");
  if (fs.existsSync(seedPath)) {
    console.log(`🌱 Đang nạp dữ liệu (seed.sql) từ ${seedPath}...`);
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    await client.query(seedSql);
    console.log("✅ Nạp dữ liệu seed.sql thành công!");
  } else {
    console.log("ℹ️ Không tìm thấy seed.sql, chỉ giữ nguyên schema trắng.");
  }

  // 3. Verify counts in Neon PostgreSQL
  console.log("\n📊 KIỂM TRA DỮ LIỆU ĐÃ NẠP VÀO POSTGRESQL (SCHEMA 'public'):");
  console.log("=================================================");

  const tablesToCheck = [
    "schools",
    "majors",
    "major_groups",
    "programs",
    "program_cutoffs",
    "combos",
    "subjects",
    "riasec_questions",
    "users",
    "benchmarks",
    "school_outcomes",
    "major_outcomes",
  ];

  for (const table of tablesToCheck) {
    const res = await client.query(`SELECT COUNT(*) FROM public.${table};`);
    const count = res.rows[0].count;
    console.log(` • public.${table.padEnd(20)} : ${count.toString().padStart(5, " ")} dòng`);
  }
  console.log("=================================================\n");

  // Sample data check
  const sampleSchools = await client.query(`SELECT code, name, city FROM public.schools LIMIT 3;`);
  console.log("🏫 Mẫu 3 trường trong PostgreSQL (Neon):");
  sampleSchools.rows.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.code}] ${s.name} - ${s.city}`);
  });

  const sampleMajors = await client.query(`SELECT code, name, demand FROM public.majors LIMIT 3;`);
  console.log("\n📚 Mẫu 3 ngành trong PostgreSQL (Neon):");
  sampleMajors.rows.forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.code}] ${m.name} (Nhu cầu: ${m.demand})`);
  });

  console.log("\n🎉 ĐẨY DATABASE LÊN NEON POSTGRESQL HOÀN TẤT 100%!");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Lỗi khi nạp dữ liệu PostgreSQL:", err);
  process.exit(1);
});
