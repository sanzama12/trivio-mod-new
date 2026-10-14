import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const REQUIRED_BASELINE_TABLES = [
  "regions",
  "schools",
  "majors",
  "programs",
  "users",
  "riasec_questions",
] as const;

// Đọc .env.local nếu chưa nạp process.env.DATABASE_URL
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envContent = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        return trimmed.slice("DATABASE_URL=".length).trim();
      }
    }
  } catch {}
  throw new Error("Không tìm thấy DATABASE_URL trong .env.local hoặc process.env");
}

async function main() {
  const connectionString = getDatabaseUrl();
  console.log("Đang kết nối PostgreSQL (Neon Cloud)...");
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✓ Kết nối PostgreSQL thành công!");

    const fresh = process.argv.includes("--fresh");
    const statusOnly = process.argv.includes("--status");

    const tableRows = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'trovio' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const existingTables = new Set(tableRows.rows.map((row) => row.table_name));

    if (statusOnly) {
      console.log(`- Schema trovio: ${existingTables.size ? "đã tồn tại" : "chưa khởi tạo"}`);
      console.log(`- Số bảng hiện có: ${existingTables.size}`);
      if (existingTables.has("schema_migrations")) {
        const applied = await client.query<{ name: string; applied_at: string }>(
          "SELECT name, applied_at::text FROM trovio.schema_migrations ORDER BY name",
        );
        console.log(`- Migration đã ghi nhận: ${applied.rowCount ?? applied.rows.length}`);
        for (const row of applied.rows) console.log(`  · ${row.name} (${row.applied_at})`);
      }
      return;
    }

    if (fresh) {
      console.log("Đang làm mới schema 'trovio' và 'public' (--fresh)...");
      await client.query("DROP SCHEMA IF EXISTS trovio CASCADE;");
      await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER; GRANT ALL ON SCHEMA public TO public;");
    }

    // 1. Chỉ chạy baseline schema trên database mới. schema.sql dùng CREATE TABLE
    // có chủ đích nên không được chạy lặp lên database đang có dữ liệu.
    if (fresh || existingTables.size === 0) {
      console.log("Đang nạp database/schema.sql (79 bảng, 4 view, triggers, hàm)...");
      const schemaSql = readFileSync(join(process.cwd(), "database", "schema.sql"), "utf8");
      await client.query(schemaSql);
      console.log("✓ Đã khởi tạo schema 'trovio' và các bảng thành công!");
    } else {
      const missing = REQUIRED_BASELINE_TABLES.filter((table) => !existingTables.has(table));
      if (missing.length) {
        throw new Error(
          `Schema trovio đang tồn tại nhưng thiếu bảng nền: ${missing.join(", ")}. ` +
          "Không tự sửa hoặc xoá dữ liệu. Hãy backup và kiểm tra migration thủ công.",
        );
      }
      console.log(`✓ Schema 'trovio' đã có ${existingTables.size} bảng; bỏ qua baseline để bảo toàn dữ liệu.`);
    }

    // 2. Chạy migration có phiên bản; tuyệt đối không tự động nạp seed/sample data.
    await client.query(`
      CREATE TABLE IF NOT EXISTS trovio.schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migrationDir = join(process.cwd(), "database", "migrations");
    const migrations = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
    const appliedRows = await client.query<{ name: string }>("SELECT name FROM trovio.schema_migrations");
    const applied = new Set(appliedRows.rows.map((row) => row.name));
    let appliedCount = 0;
    for (const migration of migrations) {
      if (applied.has(migration)) {
        console.log(`Bỏ qua migration đã chạy ${migration}.`);
        continue;
      }
      console.log(`Đang chạy migration ${migration}...`);
      const source = readFileSync(join(migrationDir, migration), "utf8")
        .replace(/^\s*BEGIN;\s*/i, "")
        .replace(/\s*COMMIT;\s*$/i, "");
      await client.query("BEGIN");
      try {
        await client.query(source);
        await client.query("INSERT INTO trovio.schema_migrations (name) VALUES ($1)", [migration]);
        await client.query("COMMIT");
        appliedCount++;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    console.log(`✓ Đã áp dụng ${appliedCount}/${migrations.length} migration còn thiếu, không nạp dữ liệu mẫu.`);

    // 3. Kiểm tra số lượng bản ghi
    console.log("\n--- THỐNG KÊ DỮ LIỆU ĐÃ NẠP ---");
    const resSchools = await client.query("SELECT COUNT(*) FROM trovio.schools");
    const resMajors = await client.query("SELECT COUNT(*) FROM trovio.majors");
    const resPrograms = await client.query("SELECT COUNT(*) FROM trovio.programs");
    const resCutoffs = await client.query("SELECT COUNT(*) FROM trovio.program_cutoffs");
    const resUsers = await client.query("SELECT COUNT(*) FROM trovio.users");
    const resQuestions = await client.query("SELECT COUNT(*) FROM trovio.riasec_questions");

    console.log(`- Số trường đại học (schools): ${resSchools.rows[0].count}`);
    console.log(`- Số ngành đào tạo (majors): ${resMajors.rows[0].count}`);
    console.log(`- Số chương trình đào tạo (programs): ${resPrograms.rows[0].count}`);
    console.log(`- Số mốc điểm chuẩn (program_cutoffs): ${resCutoffs.rows[0].count}`);
    console.log(`- Số tài khoản (users): ${resUsers.rows[0].count}`);
    console.log(`- Số câu hỏi RIASEC (riasec_questions): ${resQuestions.rows[0].count}`);

    console.log("\n Hoàn tất kết nối và nạp cơ sở dữ liệu PostgreSQL!");
  } catch (error) {
    console.error(" Lỗi kết nối hoặc thực thi SQL:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
