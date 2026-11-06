import { config } from "dotenv";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

function formatSqlValue(val: any, udtType?: string): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") {
    if (Number.isFinite(val)) return String(val);
    return "NULL";
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Array.isArray(val)) {
    const elements = val.map((item) => formatSqlValue(item)).join(", ");
    return `ARRAY[${elements}]`;
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  if (typeof val === "string") {
    // Escape single quotes for SQL string literal
    const escaped = val.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function dumpFullDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }

  console.log("⏳ Đang kết nối tới PostgreSQL để trích xuất dữ liệu...");
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  await client.connect();

  try {
    const root = process.cwd();
    const schemaSql = readFileSync(join(root, "database", "schema.sql"), "utf8");
    const migrationsSql = readFileSync(join(root, "database", "migrations", "all.sql"), "utf8");

    // Lấy danh sách toàn bộ các bảng trong schema trovio
    const { rows: tableRows } = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'trovio' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    // Thứ tự bảng để không vi phạm Foreign Key constraints khi insert
    const preferredOrder = [
      "regions",
      "priority_regions",
      "priority_groups",
      "admission_methods",
      "subjects",
      "combos",
      "combo_subjects",
      "major_groups",
      "schools",
      "school_campuses",
      "majors",
      "programs",
      "program_combos",
      "program_admission_methods",
      "program_cutoffs",
      "program_verified_fields",
      "users",
      "user_accounts",
      "sessions",
      "app_documents",
      "materials",
      "news_articles",
      "donations",
      "schema_migrations",
    ];

    const allTables = new Set(tableRows.map((r) => r.table_name));
    const orderedTables = [
      ...preferredOrder.filter((t) => allTables.has(t)),
      ...[...allTables].filter((t) => !preferredOrder.includes(t)),
    ];

    let fullSql = `-- ==========================================================================\n`;
    fullSql += `-- TROVIO COMPLETE DATABASE BACKUP & SETUP DUMP\n`;
    fullSql += `-- Xuất bản tự động: ${new Date().toISOString()}\n`;
    fullSql += `-- Bao gồm: Toàn bộ Lược đồ Schema (DDL) + Tất cả Migrations + Dữ liệu thực tế\n`;
    fullSql += `-- ==========================================================================\n\n`;
    fullSql += `CREATE SCHEMA IF NOT EXISTS trovio;\n`;
    fullSql += `SET search_path TO trovio, public;\n\n`;

    // 1. DDL Lược đồ cơ sở dữ liệu
    fullSql += `-- ==========================================================================\n`;
    fullSql += `-- PHẦN 1: TẠO CẤU TRÚC BẢNG, INDEX, TRIGGER, FUNCTION (SCHEMA DDL)\n`;
    fullSql += `-- ==========================================================================\n`;
    fullSql += schemaSql + "\n\n";

    // 2. Các Migrations
    fullSql += `-- ==========================================================================\n`;
    fullSql += `-- PHẦN 2: CÁC MIGRATION BỔ SUNG\n`;
    fullSql += `-- ==========================================================================\n`;
    fullSql += migrationsSql + "\n\n";

    // 3. Dữ liệu thực tế
    fullSql += `-- ==========================================================================\n`;
    fullSql += `-- PHẦN 3: DỮ LIỆU CSDL ĐẦY ĐỦ (TABLE DATA INSERTS)\n`;
    fullSql += `-- ==========================================================================\n`;
    fullSql += `BEGIN;\nSET search_path TO trovio, public;\n\n`;

    let totalRowsExported = 0;

    for (const table of orderedTables) {
      const { rows } = await client.query(`SELECT * FROM trovio."${table}"`);
      if (rows.length === 0) continue;

      totalRowsExported += rows.length;
      console.log(`📦 Đã trích xuất ${String(rows.length).padStart(4)} dòng từ bảng: trovio.${table}`);

      fullSql += `-- Bảng: trovio.${table} (${rows.length} dòng)\n`;
      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `"${c}"`).join(", ");

      for (const row of rows) {
        const valList = cols.map((c) => formatSqlValue(row[c])).join(", ");
        fullSql += `INSERT INTO trovio."${table}" (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING;\n`;
      }
      fullSql += `\n`;
    }

    fullSql += `COMMIT;\n\n`;
    fullSql += `-- Hoàn tất trích xuất CSDL: ${totalRowsExported} dòng dữ liệu.\n`;

    const outputPath1 = join(root, "database", "dump_triovo_full.sql");
    const outputPath2 = join(root, "triovo_database_setup.sql");

    writeFileSync(outputPath1, fullSql, "utf8");
    writeFileSync(outputPath2, fullSql, "utf8");

    console.log(`\n🎉 XUẤT THÀNH CÔNG FILE SQL ĐẦY ĐỦ!`);
    console.log(`📁 File 1: ${outputPath1}`);
    console.log(`📁 File 2 (gốc dự án): ${outputPath2}`);
    console.log(`📊 Tổng số dòng dữ liệu: ${totalRowsExported} dòng trên ${orderedTables.length} bảng.`);
  } finally {
    await client.end();
  }
}

dumpFullDatabase().catch((err) => {
  console.error("❌ Lỗi khi xuất CSDL:", err);
  process.exit(1);
});
