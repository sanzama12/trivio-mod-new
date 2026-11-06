import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

function formatMysqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") {
    if (Number.isFinite(val)) return String(val);
    return "NULL";
  }
  if (val instanceof Date) {
    const iso = val.toISOString().replace("T", " ").replace("Z", "");
    return `'${iso}'`;
  }
  if (Array.isArray(val)) {
    const jsonStr = JSON.stringify(val).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  if (typeof val === "string") {
    const escaped = val.replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${escaped}'`;
  }
  return `'${String(val).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function mapPgTypeToMysql(dataType: string, udtName: string, isPrimaryKey: boolean): string {
  const dt = dataType.toLowerCase();
  const udt = udtName.toLowerCase();

  if (udt === "uuid") return "VARCHAR(36)";
  if (dt === "boolean") return "TINYINT(1)";
  if (dt === "smallint") return "SMALLINT";
  if (dt === "integer") return "INT";
  if (dt === "bigint") return "BIGINT";
  if (dt === "numeric" || dt === "decimal") return "DECIMAL(12,2)";
  if (dt === "double precision" || dt === "real") return "DOUBLE";
  if (dt === "json" || dt === "jsonb") return "JSON";
  if (dt === "ARRAY" || udt.startsWith("_")) return "JSON";
  if (dt.includes("timestamp") || dt.includes("date") || dt.includes("time")) return "DATETIME";
  
  if (dt === "text" || dt.includes("character")) {
    if (isPrimaryKey) return "VARCHAR(191)";
    return "LONGTEXT";
  }

  return "LONGTEXT";
}

async function exportToMysql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Missing DATABASE_URL");

  console.log("⏳ Đang kết nối tới PostgreSQL để chuyển đổi sang MySQL...");
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  await client.connect();

  try {
    const root = process.cwd();

    // Lấy danh sách bảng trong trovio
    const { rows: tableRows } = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'trovio' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    let mysqlSql = `-- ==========================================================================\n`;
    mysqlSql += `-- TROVIO COMPLETE DATABASE SETUP (MYSQL / MARIADB FORMAT)\n`;
    mysqlSql += `-- Tạo tự động: ${new Date().toISOString()}\n`;
    mysqlSql += `-- Tương thích 100% với: MySQL 8.0+, MySQL Workbench, phpMyAdmin, DBeaver\n`;
    mysqlSql += `-- ==========================================================================\n\n`;

    mysqlSql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    mysqlSql += `SET NAMES utf8mb4;\n\n`;
    mysqlSql += `CREATE DATABASE IF NOT EXISTS \`trovio\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    mysqlSql += `USE \`trovio\`;\n\n`;

    // 1. Tạo các bảng trong MySQL
    for (const t of tableRows) {
      const tableName = t.table_name;

      // Lấy danh sách cột
      const { rows: cols } = await client.query<{
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
      }>(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'trovio' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      // Lấy khóa chính
      const { rows: pkRows } = await client.query<{ column_name: string }>(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'trovio'
          AND tc.table_name = $1;
      `, [tableName]);

      const pkCols = pkRows.map((r) => r.column_name);

      mysqlSql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      mysqlSql += `CREATE TABLE \`${tableName}\` (\n`;

      const colDefs: string[] = [];
      for (const col of cols) {
        const isPk = pkCols.includes(col.column_name);
        const mysqlType = mapPgTypeToMysql(col.data_type, col.udt_name, isPk);
        const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
        colDefs.push(`  \`${col.column_name}\` ${mysqlType} ${nullable}`);
      }

      if (pkCols.length > 0) {
        const pkList = pkCols.map((c) => `\`${c}\``).join(", ");
        colDefs.push(`  PRIMARY KEY (${pkList})`);
      }

      mysqlSql += colDefs.join(",\n");
      mysqlSql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
    }

    // 2. Thêm dữ liệu vào các bảng (INSERT IGNORE)
    let totalRows = 0;
    for (const t of tableRows) {
      const tableName = t.table_name;
      const { rows: dataRows } = await client.query(`SELECT * FROM trovio."${tableName}"`);
      if (dataRows.length === 0) continue;

      totalRows += dataRows.length;
      mysqlSql += `-- Dữ liệu cho bảng: \`${tableName}\` (${dataRows.length} dòng)\n`;

      const cols = Object.keys(dataRows[0]);
      const colList = cols.map((c) => `\`${c}\``).join(", ");

      for (const row of dataRows) {
        const valList = cols.map((c) => formatMysqlValue(row[c])).join(", ");
        mysqlSql += `INSERT IGNORE INTO \`${tableName}\` (${colList}) VALUES (${valList});\n`;
      }
      mysqlSql += `\n`;
    }

    mysqlSql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    mysqlSql += `-- Hoàn tất nạp CSDL MySQL: ${totalRows} dòng trên ${tableRows.length} bảng.\n`;

    const out1 = join(root, "database", "dump_triovo_mysql.sql");
    const out2 = join(root, "triovo_mysql_setup.sql");
    const outDesktop = "C:\\Users\\Admin\\Desktop\\triovo_mysql_setup.sql";

    writeFileSync(out1, mysqlSql, "utf8");
    writeFileSync(out2, mysqlSql, "utf8");
    try {
      writeFileSync(outDesktop, mysqlSql, "utf8");
    } catch {}

    console.log(`\n🎉 XUẤT THÀNH CÔNG DUMP DÀNH RIÊNG CHO MYSQL!`);
    console.log(`📁 File 1 (database): ${out1}`);
    console.log(`📁 File 2 (project root): ${out2}`);
    console.log(`📁 File 3 (Desktop): ${outDesktop}`);
    console.log(`📊 Tổng cộng: ${totalRows} dòng dữ liệu trên ${tableRows.length} bảng.`);
  } finally {
    await client.end();
  }
}

exportToMysql().catch((err) => {
  console.error("❌ Lỗi chuyển đổi MySQL:", err);
  process.exit(1);
});
