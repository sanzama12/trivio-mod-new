import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Không tìm thấy DATABASE_URL trong .env.local.");
    console.log("👉 Vui lòng cấu hình DATABASE_URL trong file .env.local:");
    console.log("   Ví dụ: DATABASE_URL=postgresql://postgres:password@localhost:5432/trovio");
    process.exit(1);
  }

  const dumpPath = join(process.cwd(), "database", "dump_triovo_full.sql");
  if (!existsSync(dumpPath)) {
    console.error(`❌ Không tìm thấy file dump SQL: ${dumpPath}`);
    console.log("👉 Vui lòng chạy lệnh: npm run db:dump trước.");
    process.exit(1);
  }

  console.log("🚀 Bắt đầu thiết lập cơ sở dữ liệu TriOVO...");
  console.log(`🔗 Chuỗi kết nối: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("sslmode=require") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 20000,
  });

  await client.connect();

  try {
    console.log("📄 Đang đọc file SQL dump (Schema + Migrations + Data)...");
    const sqlContent = readFileSync(dumpPath, "utf8");

    console.log("⚙️  Đang thực thi các câu lệnh SQL khởi tạo...");
    await client.query(sqlContent);

    // Kiểm tra kết quả
    const { rows: stats } = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'trovio' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("\n✅ THIẾT LẬP CƠ SỞ DỮ LIỆU THÀNH CÔNG RỰC RỠ!");
    console.log(`📊 Đã khởi tạo ${stats.length} bảng trong schema trovio:`);

    for (const t of stats) {
      const countRes = await client.query(`SELECT count(*)::int as c FROM trovio."${t.table_name}"`);
      console.log(`   - trovio.${t.table_name.padEnd(28)} : ${countRes.rows[0].c} dòng`);
    }

    console.log("\n🎉 Bạn có thể bắt đầu chạy ứng dụng với lệnh: npm run dev");
  } catch (err) {
    console.error("❌ Lỗi trong quá trình thiết lập CSDL:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase().catch((err) => {
  console.error("❌ Lỗi ngoài ý muốn:", err);
  process.exit(1);
});
