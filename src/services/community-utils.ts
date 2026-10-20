import { normalizeVi } from "../lib/text";

export const CONTENT_FLAG_LABELS: Record<string, string> = {
  "lien-he": "Có số điện thoại / email / đường link",
  "quang-cao": "Dấu hiệu quảng cáo",
  "ngon-tu": "Ngôn từ không phù hợp",
  "cong-kich": "Cáo buộc nặng — cần kiểm tra kỹ",
  "nhac-ten": "Có thể nêu tên cá nhân",
  "viet-hoa": "Viết hoa quá nhiều",
  "lap-ky-tu": "Lặp ký tự bất thường",
};

/** Rút gọn tên để không công khai họ tên đầy đủ trong nội dung cộng đồng. */
export function privateDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Người dùng";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

/** Kiểm tra email có thuộc tên miền của trường hay không. */
export function isSchoolEmail(email: string, website: string): boolean {
  try {
    const host = new URL(website).hostname.replace(/^www\./, "").replace(/^daihoc\./, "");
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    return !!domain && (domain === host || domain.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

const PROFANITY = ["dm", "dmm", "dcm", "dkm", "vcl", "vkl", "clgt", "cmm", "djt", "occho", "oc cho", "do ngu", "ngu nhu bo", "cho chet"];
const ADS = ["inbox", "ib minh", "gia re", "mua ban", "khuyen mai", "zalo", "lam ho", "ban tai lieu", "chiet khau", "dich vu"];
const ACCUSE = ["lua dao", "tham nhung", "an tien", "hoi lo", "ban diem", "rac ruoi", "vo dung", "te nhat"];

/** Gắn cờ nội dung cộng đồng để hỗ trợ kiểm duyệt thủ công. */
export function screenCommunityContent(title: string, content: string): string[] {
  const raw = `${title}\n${content}`;
  const norm = ` ${normalizeVi(raw).replace(/[^a-z0-9]+/g, " ")} `;
  const has = (list: string[]) => list.some((word) => norm.includes(` ${word} `));
  const flags = new Set<string>();
  if (/(\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/.test(raw) || /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(raw) || /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|vn|net|org|io|xyz|info|me)\b)/i.test(raw)) flags.add("lien-he");
  if (has(ADS)) flags.add("quang-cao");
  if (has(PROFANITY)) flags.add("ngon-tu");
  if (has(ACCUSE)) flags.add("cong-kich");
  if (/(?<!\p{L})(?:[Tt]hầy|[Cc]ô|[Gg]iảng viên|[Gg][Vv]|[Pp]?[Gg][Ss]\.?|[Tt][Ss]\.?)\s+\p{Lu}\p{Ll}+/u.test(raw.normalize("NFC"))) flags.add("nhac-ten");
  const letters = raw.replace(/[^A-Za-zÀ-ỹĐđ]/g, "");
  if (letters.length >= 20 && letters.replace(/[^A-ZÀ-ỸĐ]/g, "").length / letters.length > 0.6) flags.add("viet-hoa");
  if (/(.)\1{5,}/u.test(raw)) flags.add("lap-ky-tu");
  return [...flags];
}
