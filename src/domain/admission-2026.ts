import type { Subject } from "./types";

/** Điều 3 Quy chế thi THPT, VBHN 02/VBHN-BGDĐT ngày 17/04/2026.
 * https://xaydungchinhsach.chinhphu.vn/van-ban-hop-nhat-so-02-vbhn-bgddt-quy-che-thi-tot-nghiep-trung-hoc-pho-thong-119260419130804242.htm
 * Điểm năng khiếu của trường không phải điểm thi tốt nghiệp THPT.
 */
export const THPT_2026_SUBJECTS: Subject[] = [
  { id: "toan", name: "Toán", short: "Toán" },
  { id: "van", name: "Ngữ văn", short: "Văn" },
  { id: "ly", name: "Vật lý", short: "Lý" },
  { id: "hoa", name: "Hóa học", short: "Hóa" },
  { id: "sinh", name: "Sinh học", short: "Sinh" },
  { id: "su", name: "Lịch sử", short: "Sử" },
  { id: "dia", name: "Địa lý", short: "Địa" },
  { id: "gdktpl", name: "Giáo dục kinh tế và pháp luật", short: "GDKT&PL" },
  { id: "tin", name: "Tin học", short: "Tin" },
  { id: "cong-nghe-cn", name: "Công nghệ Công nghiệp", short: "CN công nghiệp" },
  { id: "cong-nghe-nn", name: "Công nghệ Nông nghiệp", short: "CN nông nghiệp" },
  { id: "anh", name: "Tiếng Anh", short: "Anh" },
  { id: "nga", name: "Tiếng Nga", short: "Nga" },
  { id: "phap", name: "Tiếng Pháp", short: "Pháp" },
  { id: "trung", name: "Tiếng Trung Quốc", short: "Trung" },
  { id: "duc", name: "Tiếng Đức", short: "Đức" },
  { id: "nhat", name: "Tiếng Nhật", short: "Nhật" },
  { id: "han", name: "Tiếng Hàn", short: "Hàn" },
];

export const THPT_2026_SUBJECT_IDS = new Set(THPT_2026_SUBJECTS.map(subject => subject.id));
