/**
 * Đọc bảng tính tải lên (chạy trên server, không thêm thư viện):
 *  - CSV (dấu phẩy hoặc chấm phẩy, có ngoặc kép, BOM)
 *  - XLSX tối giản: sheet đầu tiên, chuỗi dùng chung + số (không công thức/định dạng).
 * Có giới hạn kích thước giải nén để tránh "zip bomb".
 */
import { inflateRawSync } from "node:zlib";

export const MAX_SHEET_ROWS = 2000;
const MAX_UNZIPPED = 8 * 1024 * 1024;

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^[\uFEFF\uFFFE]/, "").replace(/\0/g, "");
  const lines = src.split(/\r\n|\r|\n/);
  const sample = lines.find((l) => l.trim().length > 0) ?? "";

  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;

  let sep = ",";
  if (tabCount > commaCount && tabCount > semiCount) sep = "\t";
  else if (semiCount > commaCount) sep = ";";
  else if (pipeCount > commaCount && pipeCount > semiCount) sep = "|";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (rows.length > MAX_SHEET_ROWS + 1) break;
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Đọc các mục trong file zip theo central directory. */
function unzip(buf: Buffer, wanted: (name: string, lowerName: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not-zip");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad-zip");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const rawName = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;

    const normName = rawName.replace(/\\/g, "/").replace(/^\//, "");
    const lowerName = normName.toLowerCase();

    if (!wanted(normName, lowerName)) continue;
    total += usize;
    if (usize > MAX_UNZIPPED || total > MAX_UNZIPPED) throw new Error("too-large");
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error("bad-zip");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    const raw = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED }) : null;
    if (!raw) throw new Error("unsupported");
    out.set(lowerName, raw.toString("utf8"));
  }
  return out;
}

const decode = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => {
    const map: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return map[e.toLowerCase()] ?? "";
  });

const colIndex = (ref: string) => {
  const letters = /^[A-Za-z]+/.exec(ref)?.[0]?.toUpperCase() ?? "A";
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
};

const cleanXml = (xml: string) => xml.replace(/<(\/)?([a-zA-Z0-9]+:)([a-zA-Z0-9_]+)/g, "<$1$3");

export function parseXlsx(buf: Buffer): string[][] {
  const files = unzip(buf, (_, lower) => {
    return lower === "xl/sharedstrings.xml" || /worksheets\/[^\/]+\.xml$/.test(lower) || lower === "xl/workbook.xml";
  });

  const sheetKeys = [...files.keys()].filter((k) => /^xl\/worksheets\/[^\/]+\.xml$/.test(k) || /worksheets\/[^\/]+\.xml$/.test(k));
  const sheetName = sheetKeys.sort()[0];
  if (!sheetName) throw new Error("no-sheet");

  const shared: string[] = [];
  const ss = cleanXml(files.get("xl/sharedstrings.xml") ?? "");
  if (ss) {
    const siMatches = ss.match(/<si[\s>][\s\S]*?<\/si>/g) ?? [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [];
      const text = tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("");
      shared.push(decode(text));
    }
  }

  const ws = cleanXml(files.get(sheetName) ?? "");
  const rows: string[][] = [];
  const rowMatches = ws.match(/<row[\s>][\s\S]*?<\/row>/g) ?? [];

  for (const r of rowMatches) {
    const row: string[] = [];
    const cellMatches = r.match(/<c[\s>][\s\S]*?(?:\/>|<\/c>)/g) ?? [];
    for (const c of cellMatches) {
      const ref = /r="([A-Za-z]+\d+)"/.exec(c)?.[1]?.toUpperCase() ?? "";
      const t = /t="(\w+)"/.exec(c)?.[1] ?? "";
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1];
      const inlineMatch = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(c)?.[1];

      let value = "";
      if (t === "s") {
        value = vMatch != null ? (shared[Number(vMatch)] ?? "") : "";
      } else if (t === "inlineStr") {
        value = decode(inlineMatch ?? "");
      } else if (t === "str") {
        value = decode(vMatch ?? "");
      } else if (t === "b") {
        value = vMatch === "1" ? "1" : "0";
      } else if (t === "e") {
        value = "";
      } else {
        value = vMatch != null ? decode(vMatch).trim() : "";
      }

      const col = ref ? colIndex(ref) : row.length;
      if (col >= 0) {
        row[col] = value;
      } else {
        row.push(value);
      }
    }
    const maxCol = row.length;
    const filled: string[] = [];
    for (let i = 0; i < maxCol; i++) filled[i] = row[i] ?? "";
    rows.push(filled);
    if (rows.length > MAX_SHEET_ROWS + 1) break;
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
