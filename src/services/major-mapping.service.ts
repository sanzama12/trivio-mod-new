import type { Major, MajorGroup, RiasecType } from "../domain/types";
import { normalizeVi } from "../lib/text";

/** A stable identity used by imports. Punctuation and repeated spaces are irrelevant. */
export function normalizeMajorIdentity(value: string): string {
  return normalizeVi(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The program name is authoritative. A Ministry major code may legitimately be
 * shared by multiple specialisations, so code-only matching is unsafe when a
 * meaningful name was supplied.
 */
export function findMajorForImport(majors: Major[], name: string, code?: string): Major | undefined {
  const normalizedName = normalizeMajorIdentity(name);
  if (normalizedName && !/^\d+$/.test(normalizedName)) {
    return majors.find((major) => normalizeMajorIdentity(major.name) === normalizedName);
  }

  const normalizedCode = String(code ?? "").trim().toUpperCase();
  return normalizedCode
    ? majors.find((major) => major.code.trim().toUpperCase() === normalizedCode)
    : undefined;
}

const NAME_RULES: ReadonlyArray<{ groupId: string; keywords: readonly string[] }> = [
  { groupId: "giao-duc", keywords: ["su pham", "giao duc", "giang day", "dao tao giao vien"] },
  { groupId: "y-duoc", keywords: ["rang ham mat", "phuc hoi chuc nang", "ky thuat xet nghiem", "y khoa", "y hoc", "duoc", "dieu duong", "ho sinh", "suc khoe", "dinh duong", "y te"] },
  { groupId: "nong-lam", keywords: ["quan ly tai nguyen", "moi truong", "nong nghiep", "lam nghiep", "thuy san", "chan nuoi", "thu y", "bao ve thuc vat", "nong hoc"] },
  { groupId: "cntt", keywords: ["cong nghe thong tin", "khoa hoc may tinh", "ky thuat phan mem", "an toan thong tin", "tri tue nhan tao", "du lieu", "may tinh", "phan mem", "he thong thong tin", "mang may tinh", "thuong mai dien tu"] },
  { groupId: "nghe-thuat", keywords: ["thiet ke do hoa", "thiet ke thoi trang", "my thuat", "hoi hoa", "am nhac", "dien anh", "san khau", "nhiep anh", "nghe thuat", "thoi trang"] },
  { groupId: "kinh-te", keywords: ["quan tri", "kinh doanh", "kinh te", "ke toan", "kiem toan", "tai chinh", "ngan hang", "marketing", "thuong mai", "logistics", "du lich", "khach san", "bao hiem", "bat dong san"] },
  { groupId: "xa-hoi", keywords: ["quan he quoc te", "cong tac xa hoi", "bao chi", "truyen thong", "tam ly", "ngon ngu", "luat", "xa hoi", "van hoc", "lich su", "triet hoc", "chinh tri", "van hoa", "dong phuong hoc"] },
  { groupId: "ky-thuat", keywords: ["vi mach", "ban dan", "tu dong hoa", "co khi", "dien tu", "ky thuat", "xay dung", "kien truc", "vat lieu", "hoa hoc", "giao thong", "hang khong", "o to", "cong nghe thuc pham"] },
];

const CODE_PREFIX_GROUPS: ReadonlyArray<[string, string]> = [
  ["714", "giao-duc"],
  ["721", "nghe-thuat"],
  ["722", "xa-hoi"],
  ["731", "xa-hoi"],
  ["732", "xa-hoi"],
  ["734", "kinh-te"],
  ["736", "xa-hoi"],
  ["738", "xa-hoi"],
  ["748", "cntt"],
  ["751", "ky-thuat"],
  ["752", "ky-thuat"],
  ["754", "ky-thuat"],
  ["758", "ky-thuat"],
  ["762", "nong-lam"],
  ["764", "nong-lam"],
  ["772", "y-duoc"],
  ["776", "xa-hoi"],
  ["781", "kinh-te"],
  ["784", "ky-thuat"],
  ["785", "nong-lam"],
];

export function inferMajorGroupId(name: string, code: string | undefined, groups: MajorGroup[]): string {
  const available = new Set(groups.map((group) => group.id));
  const normalizedName = normalizeMajorIdentity(name);
  let best: { groupId: string; score: number } | undefined;

  for (const rule of NAME_RULES) {
    if (!available.has(rule.groupId)) continue;
    const score = rule.keywords.reduce(
      (total, keyword) => total + (normalizedName.includes(keyword) ? keyword.length : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { groupId: rule.groupId, score };
  }
  if (best) return best.groupId;

  const digits = String(code ?? "").replace(/\D/g, "");
  const byCode = CODE_PREFIX_GROUPS.find(([prefix, groupId]) => digits.startsWith(prefix) && available.has(groupId));
  if (byCode) return byCode[1];

  return groups.find((group) => group.id === "xa-hoi")?.id ?? groups[0]?.id ?? "xa-hoi";
}

const DEFAULT_RIASEC: Record<string, [RiasecType, RiasecType, RiasecType]> = {
  cntt: ["I", "R", "C"],
  "kinh-te": ["E", "C", "S"],
  "y-duoc": ["S", "I", "R"],
  "ky-thuat": ["R", "I", "C"],
  "xa-hoi": ["S", "A", "E"],
  "nghe-thuat": ["A", "S", "E"],
  "giao-duc": ["S", "A", "I"],
  "nong-lam": ["R", "I", "S"],
};

export function defaultRiasecForGroup(groupId: string): [RiasecType, RiasecType, RiasecType] {
  return DEFAULT_RIASEC[groupId] ?? ["I", "R", "C"];
}
