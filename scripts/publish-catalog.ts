/**
 * publish-catalog.ts — Đẩy dữ liệu crawl vào bảng app (schools/programs/cutoffs) để web chạy.
 *
 * Chỉ ghi điểm official (score > 0). not_announced không thành điểm giả.
 * Map phương thức dataset → app: hoc_ba→hocba, dgnl_hn→dgnl-hn, dgnl_hcm→dgnl-hcm.
 *
 *   npx tsx scripts/publish-catalog.ts [--dry-run]
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const ROOT = process.cwd();
const CSV_DIR = join(ROOT, "database", "csv");
const DRY = process.argv.includes("--dry-run");

const METHOD_MAP: Record<string, string> = {
  thpt: "thpt",
  hoc_ba: "hocba",
  hocba: "hocba",
  dgnl_hn: "dgnl-hn",
  "dgnl-hn": "dgnl-hn",
  dgnl_hcm: "dgnl-hcm",
  "dgnl-hcm": "dgnl-hcm",
  tsa: "tsa",
};

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const c = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const l of c.split("\n")) {
      const t = l.trim();
      if (t.startsWith("DATABASE_URL=")) return t.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  throw new Error("Không tìm thấy DATABASE_URL");
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
function parseCsv(path: string): Record<string, string>[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const vals = splitCsvLine(line);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = (vals[i] ?? "").trim()));
    if (Object.values(rec).every((v) => v === "")) continue;
    rows.push(rec);
  }
  return rows;
}
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
function regionOf(province: string, name: string): "bac" | "trung" | "nam" {
  const s = `${province} ${name}`.normalize("NFC");
  if (/Hồ Chí Minh|Cần Thơ|Đồng Nai|An Giang|Cà Mau|Đồng Tháp|Vĩnh Long/i.test(s)) return "nam";
  if (/Đà Nẵng|Huế|Khánh Hòa|Quảng Ngãi|Gia Lai|Đắk Lắk|Lâm Đồng|Nghệ An|Thanh Hóa|Hà Tĩnh|Quảng Trị/i.test(s))
    return "trung";
  return "bac";
}
function httpsUrl(u: string): string | null {
  if (!u) return null;
  const t = u.replace(/^http:\/\//i, "https://");
  return /^https:\/\//i.test(t) ? t : null;
}

async function main(): Promise<void> {
  const inst = parseCsv(join(CSV_DIR, "institutions_raw.csv"));
  const prog = parseCsv(join(CSV_DIR, "programs_raw.csv"));
  const cut = parseCsv(join(CSV_DIR, "cutoffs_raw.csv"));
  const majors = parseCsv(join(CSV_DIR, "fields_of_study.csv"));

  if (!majors.length) {
    throw new Error("Thiếu database/csv/fields_of_study.csv; dừng publish để không gán ngành giả hoặc sai ngành.");
  }

  console.log(`publish-catalog dryRun=${DRY} inst=${inst.length} prog=${prog.length} cut=${cut.length}`);
  if (DRY) {
    const official = cut.filter((c) => c.status === "official" && Number(c.score) > 0);
    console.log(`sẽ nạp điểm official: ${official.length}`);
    return;
  }

  const client = new Client({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("SET search_path TO trovio, public");
  await client.query("BEGIN");
  const stats = { schools: 0, programs: 0, cutoffs: 0, skipped_cutoffs: 0, errors: [] as string[] };
  try {
    const existing = await client.query("SELECT id, code FROM schools");
    const schoolIdByCode = new Map<string, string>(existing.rows.map((r) => [String(r.code).toUpperCase(), String(r.id)]));

    const majorRows = await client.query("SELECT id, code FROM majors");
    const majorIdByCode = new Map<string, string>(majorRows.rows.map((r) => [String(r.code), String(r.id)]));

    for (const s of inst) {
      const code = (s.code || "").toUpperCase();
      if (!code) continue;
      if (schoolIdByCode.has(code)) continue;
      const ownership = s.ownership.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const schoolType = /quoc te|international/.test(ownership)
        ? "quoc-te"
        : /tu thuc|private/.test(ownership)
          ? "tu-thuc"
          : /cong lap|public/.test(ownership)
            ? "cong-lap"
            : null;
      if (!schoolType) {
        stats.errors.push(`school ${code}: thiếu ownership đã xác minh`);
        continue;
      }
      const id = slugify(s.local_school_id || code);
      const slug = slugify(s.name_official || s.name_normalized || code) || id;
      const city = s.province_inferred || s.province_name || "Việt Nam";
      const website = httpsUrl(s.website) || "";
      try {
        await client.query(
          `INSERT INTO schools (id, slug, code, name, short_name, type, region_code, city, website, description, highlight, scholarships)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'','')
           ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, website=EXCLUDED.website`,
          [
            id,
            slug,
            code,
            s.name_official || code,
            (s.name_official || code).slice(0, 40),
            schoolType,
            regionOf(city, s.name_official || ""),
            city,
            website,
            s.notes || "Nguồn danh bạ Bộ GDĐT.",
          ],
        );
        schoolIdByCode.set(code, id);
        stats.schools++;
      } catch (e: any) {
        stats.errors.push(`school ${code}: ${e.message?.slice(0, 180)}`);
      }
    }

    for (const p of prog) {
      const schoolId = schoolIdByCode.get((p.institution_code || "").toUpperCase());
      if (!schoolId || !p.program_code || !p.name) continue;
      if (/<|>|loading=/.test(p.name)) continue;
      const pid = `${schoolId}-${slugify(p.program_code)}`.slice(0, 80);
      const slug = `${slugify(p.name)}-${slugify(p.program_code)}`.slice(0, 80);
      const majorId = /^\d{7}$/.test(p.program_code) ? majorIdByCode.get(p.program_code) : undefined;
      if (!majorId) {
        stats.errors.push(`program ${p.institution_code} ${p.program_code}: chưa ánh xạ được mã ngành thật`);
        continue;
      }
      const training =
        p.program_type === "tien_tien" ? "Tiên tiến" : p.program_type === "quoc_te" ? "Quốc tế" : "Chính quy";
      const src = httpsUrl(p.source_url);
      const quota = Number(p.quota) > 0 ? Number(p.quota) : 0;
      try {
        await client.query(
          `INSERT INTO programs (
             id, slug, school_id, major_id, name, admission_code, training_type,
             campus, tuition_min, tuition_max, duration_years, quota, competition,
             overview, data_updated, source, source_url
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,'',0,0,4,$8,'Trung bình',$9,'2026-10',$10,$11)
           ON CONFLICT (school_id, admission_code) DO UPDATE SET
             name=EXCLUDED.name, source_url=EXCLUDED.source_url, quota=EXCLUDED.quota`,
          [pid, slug, schoolId, majorId, p.name, p.program_code, training, quota, p.name, p.source_url || "", src],
        );
        const idRow = await client.query(`SELECT id FROM programs WHERE school_id=$1 AND admission_code=$2`, [
          schoolId,
          p.program_code,
        ]);
        const programId = idRow.rows[0]?.id as string;
        if (programId && p.combos) {
          for (const combo of p.combos.split("|").map((x) => x.trim()).filter((x) => /^[A-Z][0-9]{2}$/.test(x))) {
            await client.query(
              `INSERT INTO combos (code) VALUES ($1) ON CONFLICT DO NOTHING`,
              [combo],
            );
            await client.query(
              `INSERT INTO program_combos (program_id, combo_code) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [programId, combo],
            );
          }
        }
        stats.programs++;
      } catch (e: any) {
        if (stats.errors.length < 40) stats.errors.push(`program ${p.institution_code} ${p.program_code}: ${e.message?.slice(0, 180)}`);
      }
    }

    const progIdCache = new Map<string, string>();
    const pidRes = await client.query(`SELECT id, school_id, admission_code FROM programs`);
    const schoolCodeById = new Map<string, string>();
    for (const [code, sid] of schoolIdByCode) schoolCodeById.set(sid, code);
    for (const r of pidRes.rows) {
      const sc = schoolCodeById.get(String(r.school_id));
      if (sc) progIdCache.set(`${sc}|${r.admission_code}`, String(r.id));
    }

    for (const c of cut) {
      const appMethod = METHOD_MAP[c.method_code];
      if (!appMethod) {
        stats.skipped_cutoffs++;
        continue;
      }
      if (c.status !== "official" || !c.score || Number(c.score) <= 0) {
        stats.skipped_cutoffs++;
        continue;
      }
      const programId = progIdCache.get(`${(c.institution_code || "").toUpperCase()}|${c.program_code}`);
      if (!programId) {
        stats.skipped_cutoffs++;
        continue;
      }
      const year = Number(c.year) || 2026;
      try {
        await client.query(
          `INSERT INTO program_cutoffs (program_id, method_code, year, score, is_estimated)
           VALUES ($1,$2,$3,$4,false)
           ON CONFLICT (program_id, method_code, year) DO UPDATE SET score=EXCLUDED.score`,
          [programId, appMethod, year, Number(c.score.replace(",", "."))],
        );
        await client.query(
          `INSERT INTO program_admission_methods (program_id, method_code, name, tag)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [programId, appMethod, appMethod, appMethod],
        );
        stats.cutoffs++;
      } catch (e: any) {
        stats.skipped_cutoffs++;
        if (stats.errors.length < 40) stats.errors.push(`cutoff ${c.institution_code} ${c.program_code}: ${e.message?.slice(0, 180)}`);
      }
    }

    if (stats.errors.length) {
      throw new Error(`Publish bị từ chối vì có ${stats.errors.length} lỗi dữ liệu: ${stats.errors.slice(0, 5).join(" | ")}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ ok: true, ...stats, err_n: stats.errors.length, err_sample: stats.errors.slice(0, 5) }, null, 2));
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("ROLLBACK", e.message);
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
