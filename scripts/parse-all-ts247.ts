import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), "database", "cache_ts247");

export interface MajorCutoff {
  major_code: string;
  major_name: string;
  block: string;
  mark: number | null;
  quota: number | null;
  note?: string;
  sub_criteria?: string[];
}

export interface MethodAdmission {
  method_name: string;
  method_alias: string;
  year: number;
  cutoffs: MajorCutoff[];
}

export interface SchoolData {
  school_code: string;
  school_name: string;
  school_alias: string;
  file_name: string;
  methods: MethodAdmission[];
  total_cutoffs: number;
  unique_majors_count: number;
}

function extractBalancedJson(text: string, startIndex: number): any {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        depth++;
      } else if (char === "}" || char === "]") {
        depth--;
        if (depth === 0) {
          const raw = text.slice(startIndex, i + 1);
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

export function parseSchoolHtml(fileName: string): SchoolData | null {
  const filePath = join(CACHE_DIR, fileName);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf8");
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match: RegExpExecArray | null;
  let fullText = "";

  while ((match = regex.exec(content)) !== null) {
    try {
      fullText += JSON.parse(`"${match[1]}"`);
    } catch {
      fullText += match[1];
    }
  }

  const schoolMatch = fullText.match(/"school_name":"([^"]+)"/);
  const schoolName = schoolMatch ? schoolMatch[1] : fileName.replace(".html", "");

  const codeMatch = fullText.match(/"schoolAliasCode":\{"alias":"([^"]+)","code":"([^"]+)"\}/);
  const schoolCode = codeMatch ? codeMatch[2] : fileName.replace(".html", "");
  const schoolAlias = codeMatch ? codeMatch[1] : "";

  const searchPattern = /"data":\s*\{"name":/g;
  let sMatch: RegExpExecArray | null;
  const methods: MethodAdmission[] = [];
  const uniqueMajors = new Set<string>();
  let totalCutoffs = 0;

  while ((sMatch = searchPattern.exec(fullText)) !== null) {
    const jsonStart = sMatch.index + '"data":'.length;
    const braceIdx = fullText.indexOf("{", jsonStart);
    if (braceIdx !== -1) {
      const dataObj = extractBalancedJson(fullText, braceIdx);
      if (dataObj && Array.isArray(dataObj.rows)) {
        const cutoffs: MajorCutoff[] = [];
        for (const r of dataObj.rows) {
          const mCode = (r.display_code || r.code || "").trim();
          const mName = (r.name || "").trim();
          if (mCode || mName) {
            uniqueMajors.add(mCode ? `${mCode} - ${mName}` : mName);
          }
          cutoffs.push({
            major_code: mCode,
            major_name: mName,
            block: (r.block || "").trim(),
            mark: typeof r.mark === "number" ? r.mark : (r.mark ? parseFloat(r.mark) : null),
            quota: typeof r.quota === "number" ? r.quota : null,
            note: r.introtext || undefined,
            sub_criteria: Array.isArray(r.sub_mark_type) ? r.sub_mark_type : undefined,
          });
        }
        totalCutoffs += cutoffs.length;
        methods.push({
          method_name: dataObj.name,
          method_alias: dataObj.alias,
          year: dataObj.year,
          cutoffs,
        });
      }
    }
  }

  return {
    school_code: schoolCode,
    school_name: schoolName,
    school_alias: schoolAlias,
    file_name: fileName,
    methods,
    total_cutoffs: totalCutoffs,
    unique_majors_count: uniqueMajors.size,
  };
}

function run() {
  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".html") && f !== "diem_chuan_index.html");
  console.log(`Bắt đầu xử lý ${files.length} trường từ cache_ts247...`);

  const results: SchoolData[] = [];
  let totalAllCutoffs = 0;
  let schoolsWithData = 0;

  for (const file of files) {
    const data = parseSchoolHtml(file);
    if (data) {
      results.push(data);
      totalAllCutoffs += data.total_cutoffs;
      if (data.methods.length > 0) schoolsWithData++;
    }
  }

  console.log(`\n=== TỔNG KẾT PARSE DỮ LIỆU ===`);
  console.log(`• Tổng số trường đã xử lý: ${results.length}`);
  console.log(`• Số trường có dữ liệu điểm/phương thức: ${schoolsWithData}/${results.length}`);
  console.log(`• Tổng số bản ghi điểm chuẩn (cutoffs): ${totalAllCutoffs}`);

  // Lưu bản tóm tắt JSON
  const jsonPath = join(process.cwd(), "database", "ts247_parsed_data.json");
  writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`✅ Đã lưu kết quả JSON vào: ${jsonPath}`);
}

run();
