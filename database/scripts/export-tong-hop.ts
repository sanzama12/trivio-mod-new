/**
 * export-tong-hop.ts — Một file CSV tổng để rà soát: trường × ngành × năm × phương thức × điểm.
 *
 * Nguồn: institutions_raw + programs_raw + cutoffs_raw.
 * Trường không có ngành vẫn có 1 dòng (thieu_nganh).
 * Điểm chỉ official khi có số; không công bố → not_announced, cột điểm trống.
 *
 *   npx tsx database/scripts/export-tong-hop.ts
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const CSV_DIR = join(ROOT, "database", "csv");
const OUT = join(ROOT, "database", "TONG_HOP_TUYEN_SINH.csv");

const METHOD_NAME: Record<string, string> = {
  thpt: "Thi tốt nghiệp THPT",
  hoc_ba: "Học bạ",
  dgnl_hn: "ĐGNL ĐHQG Hà Nội",
  dgnl_hcm: "ĐGNL ĐHQG TP.HCM",
  tsa: "Đánh giá tư duy TSA",
  tuyen_thang: "Tuyển thẳng / tài năng",
  ccqt: "Chứng chỉ quốc tế",
  ket_hop: "Xét kết hợp",
};

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
function parseCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^﻿/, "");
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
function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

const HEADERS = [
  "ma_truong",
  "ten_truong",
  "website",
  "ma_nganh",
  "ten_nganh",
  "nam",
  "ma_phuong_thuc",
  "ten_phuong_thuc",
  "to_hop",
  "diem",
  "thang",
  "trang_thai",
  "nguon",
  "ghi_chu",
] as const;

function main(): void {
  const inst = parseCsv(readFileSync(join(CSV_DIR, "institutions_raw.csv"), "utf8"));
  const prog = existsSync(join(CSV_DIR, "programs_raw.csv"))
    ? parseCsv(readFileSync(join(CSV_DIR, "programs_raw.csv"), "utf8"))
    : [];
  const cut = existsSync(join(CSV_DIR, "cutoffs_raw.csv"))
    ? parseCsv(readFileSync(join(CSV_DIR, "cutoffs_raw.csv"), "utf8"))
    : [];

  const instBy = new Map(inst.map((r) => [r.code, r]));
  const progBySchool = new Map<string, Record<string, string>[]>();
  for (const p of prog) {
    if (!p.institution_code) continue;
    const arr = progBySchool.get(p.institution_code) || [];
    arr.push(p);
    progBySchool.set(p.institution_code, arr);
  }
  const cutByProg = new Map<string, Record<string, string>[]>();
  for (const c of cut) {
    const k = `${c.institution_code}|${c.program_code}`;
    const arr = cutByProg.get(k) || [];
    arr.push(c);
    cutByProg.set(k, arr);
  }

  const rows: Record<string, string>[] = [];
  for (const school of inst) {
    const code = school.code;
    const name = school.name_official || school.name || "";
    const website = school.website || "";
    const programs = progBySchool.get(code) || [];
    if (!programs.length) {
      rows.push({
        ma_truong: code,
        ten_truong: name,
        website,
        ma_nganh: "",
        ten_nganh: "",
        nam: "",
        ma_phuong_thuc: "",
        ten_phuong_thuc: "",
        to_hop: "",
        diem: "",
        thang: "",
        trang_thai: "khong_co_du_lieu",
        nguon: website,
        ghi_chu: "không có dữ liệu thật — đã tra website trường, HTML không có bảng ngành/điểm; không dùng demo",
      });
      continue;
    }
    for (const p of programs) {
      const cuts = cutByProg.get(`${code}|${p.program_code}`) || [];
      if (!cuts.length) {
        rows.push({
          ma_truong: code,
          ten_truong: name,
          website,
          ma_nganh: p.program_code,
          ten_nganh: p.name,
          nam: p.year_context || "",
          ma_phuong_thuc: "",
          ten_phuong_thuc: "",
          to_hop: (p.combos || "").replace(/\|/g, " "),
          diem: "",
          thang: "",
          trang_thai: "thieu_diem",
          nguon: p.source_url,
          ghi_chu: "không có dữ liệu thật cho điểm — có ngành trên web, HTML không công bố số điểm",
        });
        continue;
      }
      for (const c of cuts) {
        const official = c.status === "official" && c.score && Number(c.score) > 0;
        rows.push({
          ma_truong: code,
          ten_truong: name,
          website,
          ma_nganh: p.program_code || c.program_code,
          ten_nganh: p.name || c.program_name,
          nam: c.year || p.year_context,
          ma_phuong_thuc: c.method_code,
          ten_phuong_thuc: METHOD_NAME[c.method_code] || c.method_code,
          to_hop: c.combination_code || (p.combos || "").replace(/\|/g, " "),
          diem: official ? c.score : "",
          thang: c.score_scale,
          trang_thai: official ? "official" : c.status || "not_announced",
          nguon: c.source_url || p.source_url,
          ghi_chu: official ? "" : c.notes || "không công bố — không ghi điểm xác nhận",
        });
      }
    }
  }

  const body =
    [HEADERS.join(","), ...rows.map((r) => HEADERS.map((h) => csvEscape(r[h] ?? "")).join(","))].join("\n") + "\n";
  writeFileSync(OUT, "﻿" + body, "utf8");

  const truong = inst.length;
  const coNganh = [...progBySchool.keys()].length;
  const official = rows.filter((r) => r.trang_thai === "official").length;
  const thieuNganh = rows.filter((r) => r.trang_thai === "thieu_nganh").length;
  console.log(
    JSON.stringify(
      {
        file: OUT,
        dong: rows.length,
        truong,
        truong_co_nganh: coNganh,
        truong_thieu_nganh: thieuNganh,
        dong_diem_official: official,
        dong_not_announced: rows.filter((r) => r.trang_thai === "not_announced").length,
      },
      null,
      2,
    ),
  );
}

main();
