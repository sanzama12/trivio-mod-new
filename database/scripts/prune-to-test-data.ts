import { Client } from "pg";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function getDatabaseUrl(): string {
  const c = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of c.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) return t.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("no DATABASE_URL");
}

const ident = (v: string) => '"' + v.replaceAll('"', '""') + '"';

async function main() {
  const client = new Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== BƯỚC 1: SAO LƯU TOÀN BỘ DATABASE TRƯỚC KHI XÓA ===");
  const tablesRes = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='trovio' AND table_type='BASE TABLE' ORDER BY table_name`
  );
  const tables = tablesRes.rows.map((r) => r.table_name);
  console.log(`Tìm thấy ${tables.length} bảng trong schema trovio.`);

  // Khởi tạo snapshot backup
  const [snapshot] = (
    await client.query(`SELECT jsonb_object_agg(name, records) AS data FROM (${tables
      .map(
        (t) =>
          `SELECT '${t}' AS name, COALESCE(jsonb_agg(to_jsonb(row_data)),'[]'::jsonb) AS records FROM trovio.${ident(
            t
          )} row_data`
      )
      .join(" UNION ALL ")}) backup_tables`)
  ).rows;

  const backupDir = join(process.cwd(), "database", "backups");
  mkdirSync(backupDir, { recursive: true });
  const backupFile = join(backupDir, `before-prune-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify({ format: 1, createdAt: new Date().toISOString(), tables: snapshot.data }, null, 2));
  console.log(`Đã tạo bản sao lưu an toàn tại: ${backupFile}`);

  console.log("\n=== BƯỚC 2: CHỌN DỮ LIỆU ĐỂ GIỮ LẠI CHO TESTING ===");
  // Giữ lại 3 trường: BKA (Bắc), DAD (Trung), DTT (Nam)
  const keptSchoolCodes = ["BKA", "DAD", "DTT"];
  const keptSchoolsRes = await client.query(
    `SELECT id, code, name FROM trovio.schools WHERE code = ANY($1)`,
    [keptSchoolCodes]
  );
  const keptSchoolIds = keptSchoolsRes.rows.map((r) => r.id);
  console.log("Các trường giữ lại:", keptSchoolsRes.rows.map((r) => `${r.code} - ${r.name}`));

  // Giữ lại các chương trình tiêu biểu (4 chương trình mỗi trường = 12 chương trình)
  const keptProgramIds = [
    // BKA
    "bka-cntt-khoa-hoc-may-tinh",
    "bka-cntt-ky-thuat-may-tinh",
    "bka-cong-nghe-thong-tin-global-ict-ct-tien-tien",
    "bka-cong-nghe-det-may",
    // DAD
    "dad-cong-nghe-ky-thuat-dieu-khien-va-tu-dong-hoa",
    "dad-cong-nghe-ky-thuat-o-to",
    "dad-cong-nghe-ky-thuat-xay-dung",
    "dad-cong-nghe-giao-duc",
    // DTT
    "dtt-bao-ho-lao-dong",
    "dtt-cong-nghe-sinh-hoc",
    "dtt-cong-nghe-sinh-hoc-chuong-trinh-tien-tien",
    "dtt-cong-nghe-sinh-hoc-chuong-trinh-dai-hoc-bang-tieng-anh"
  ];

  const keptProgsRes = await client.query(
    `SELECT id, name, admission_code, major_id FROM trovio.programs WHERE id = ANY($1)`,
    [keptProgramIds]
  );
  console.log(`Đã chọn ${keptProgsRes.rows.length} chương trình để giữ lại.`);

  const keptMajorIds = [...new Set(keptProgsRes.rows.map((r) => r.major_id))];
  console.log(`Các ngành tương ứng cần giữ lại (${keptMajorIds.length} ngành):`, keptMajorIds);

  console.log("\n=== BƯỚC 3: TIẾN HÀNH DỌN DẸP DỮ LIỆU TRONG TRANSACTION ===");
  await client.query("BEGIN");
  try {
    // 1. Dọn dẹp các bảng con tham chiếu programs
    // program_admission_methods
    const delMethods = await client.query(
      `DELETE FROM trovio.program_admission_methods WHERE NOT (program_id = ANY($1))`,
      [keptProgramIds]
    );
    console.log(`- Đã xóa ${delMethods.rowCount} dòng từ program_admission_methods`);

    // program_combos
    const delCombos = await client.query(
      `DELETE FROM trovio.program_combos WHERE NOT (program_id = ANY($1))`,
      [keptProgramIds]
    );
    console.log(`- Đã xóa ${delCombos.rowCount} dòng từ program_combos`);

    // program_cutoffs
    const delCutoffs = await client.query(
      `DELETE FROM trovio.program_cutoffs WHERE NOT (program_id = ANY($1))`,
      [keptProgramIds]
    );
    console.log(`- Đã xóa ${delCutoffs.rowCount} dòng từ program_cutoffs`);

    // Kiểm tra và xóa từ các bảng liên quan nếu có
    if (tables.includes("program_baselines")) {
      const delBaselines = await client.query(
        `DELETE FROM trovio.program_baselines WHERE NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delBaselines.rowCount} dòng từ program_baselines`);
    }
    if (tables.includes("program_verified_fields")) {
      const delPv = await client.query(
        `DELETE FROM trovio.program_verified_fields WHERE NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delPv.rowCount} dòng từ program_verified_fields`);
    }
    if (tables.includes("program_offerings")) {
      const delOfferings = await client.query(
        `DELETE FROM trovio.program_offerings WHERE NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delOfferings.rowCount} dòng từ program_offerings`);
    }
    if (tables.includes("user_bookmarks")) {
      const delBookmarks = await client.query(
        `DELETE FROM trovio.user_bookmarks WHERE program_id IS NOT NULL AND NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delBookmarks.rowCount} bookmarks trỏ tới chương trình cũ`);
    }
    if (tables.includes("user_targets")) {
      const delTargets = await client.query(
        `DELETE FROM trovio.user_targets WHERE program_id IS NOT NULL AND NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delTargets.rowCount} targets trỏ tới chương trình cũ`);
    }
    if (tables.includes("program_reviews")) {
      const delReviews = await client.query(
        `DELETE FROM trovio.program_reviews WHERE NOT (program_id = ANY($1))`,
        [keptProgramIds]
      );
      console.log(`- Đã xóa ${delReviews.rowCount} dòng từ program_reviews`);
    }

    // 2. Xóa các programs không thuộc danh sách giữ lại
    const delPrograms = await client.query(
      `DELETE FROM trovio.programs WHERE NOT (id = ANY($1))`,
      [keptProgramIds]
    );
    console.log(`- Đã xóa ${delPrograms.rowCount} programs`);

    // 3. Xóa các bảng con tham chiếu majors
    if (tables.includes("major_code_review")) {
      const delMcr = await client.query(
        `DELETE FROM trovio.major_code_review WHERE NOT (major_id = ANY($1))`,
        [keptMajorIds]
      );
      console.log(`- Đã xóa ${delMcr.rowCount} dòng từ major_code_review`);
    }
    if (tables.includes("major_occupations")) {
      const delMo = await client.query(
        `DELETE FROM trovio.major_occupations WHERE NOT (major_id = ANY($1))`,
        [keptMajorIds]
      );
      console.log(`- Đã xóa ${delMo.rowCount} dòng từ major_occupations`);
    }
    if (tables.includes("major_notes")) {
      const delMn = await client.query(
        `DELETE FROM trovio.major_notes WHERE NOT (major_id = ANY($1))`,
        [keptMajorIds]
      );
      console.log(`- Đã xóa ${delMn.rowCount} dòng từ major_notes`);
    }

    // 4. Xóa majors không được tham chiếu bởi các programs giữ lại
    const delMajors = await client.query(
      `DELETE FROM trovio.majors WHERE NOT (id = ANY($1))`,
      [keptMajorIds]
    );
    console.log(`- Đã xóa ${delMajors.rowCount} majors`);

    // 5. Xóa school_campuses cho các trường không giữ lại
    const delCampuses = await client.query(
      `DELETE FROM trovio.school_campuses WHERE NOT (school_id = ANY($1))`,
      [keptSchoolIds]
    );
    console.log(`- Đã xóa ${delCampuses.rowCount} campuses`);

    // 6. Xóa school_staff nếu có
    if (tables.includes("school_staff")) {
      const delStaff = await client.query(
        `DELETE FROM trovio.school_staff WHERE NOT (school_id = ANY($1))`,
        [keptSchoolIds]
      );
      console.log(`- Đã xóa ${delStaff.rowCount} school_staff`);
    }

    // 7. Xóa schools không thuộc danh sách giữ lại
    const delSchools = await client.query(
      `DELETE FROM trovio.schools WHERE NOT (id = ANY($1))`,
      [keptSchoolIds]
    );
    console.log(`- Đã xóa ${delSchools.rowCount} schools`);

    await client.query("COMMIT");
    console.log("\n>>> TRANSACTION THÀNH CÔNG! <<<");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Lỗi khi thực hiện xóa, đã ROLLBACK:", err);
    throw err;
  }

  console.log("\n=== BƯỚC 4: THỐNG KÊ LẠI DỮ LIỆU SAU KHI DỌN DẸP ===");
  const rSchools = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.schools");
  const rMajors = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.majors");
  const rPrograms = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.programs");
  const rCutoffs = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.program_cutoffs");
  const rCombos = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.program_combos");
  const rCampuses = await client.query("SELECT COUNT(*)::int as cnt FROM trovio.school_campuses");

  console.log(`🏫 Trường (Schools): ${rSchools.rows[0].cnt}`);
  console.log(`🎓 Ngành (Majors): ${rMajors.rows[0].cnt}`);
  console.log(`📋 Chương trình (Programs): ${rPrograms.rows[0].cnt}`);
  console.log(`📊 Điểm chuẩn (Cutoffs): ${rCutoffs.rows[0].cnt}`);
  console.log(`🔢 Tổ hợp (Combos): ${rCombos.rows[0].cnt}`);
  console.log(`🏢 Cơ sở (Campuses): ${rCampuses.rows[0].cnt}`);

  const sampleSchools = await client.query("SELECT code, name, region_code FROM trovio.schools ORDER BY code");
  console.log("\nDanh sách các trường còn lại:");
  console.table(sampleSchools.rows);

  const samplePrograms = await client.query(
    "SELECT p.admission_code, p.name as prog_name, s.code as school, m.name as major FROM trovio.programs p JOIN trovio.schools s ON s.id = p.school_id JOIN trovio.majors m ON m.id = p.major_id ORDER BY s.code, p.name"
  );
  console.log("\nDanh sách các chương trình còn lại:");
  console.table(samplePrograms.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
