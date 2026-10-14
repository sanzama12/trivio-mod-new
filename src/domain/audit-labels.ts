/** Nhãn tiếng Việt cho nhật ký thay đổi (dùng ở trang quản trị và service tổng quan). */
import type { AuditEntry } from "./types";

export const ACTION_LABEL: Record<AuditEntry["action"], string> = {
  update: "Cập nhật",
  verify: "Đã kiểm tra",
  reset: "Khôi phục gốc",
  approve: "Duyệt",
  reject: "Từ chối",
  delete: "Xoá",
  create: "Thêm",
};
export const TARGET_LABEL: Record<NonNullable<AuditEntry["targetType"]>, string> = {
  program: "Chương trình",
  "major-outcome": "Số liệu việc làm",
  source: "Nguồn dữ liệu",
  review: "Cảm nhận",
  report: "Báo lỗi dữ liệu",
  timeline: "Mốc tuyển sinh",
  "chat-alias": "Từ khoá chatbot",
  school: "Trường",
  major: "Ngành",
  quiz: "Bài test RIASEC",
  rules: "Quy tắc gợi ý",
  import: "Nhập dữ liệu",
  user: "Người dùng",
  "school-submission": "Bản sửa của trường",
};
export const FIELD_LABEL: Record<string, string> = {
  cutoffs: "Điểm chuẩn THPT",
  altCutoffs: "Điểm chuẩn học bạ/ĐGNL",
  tuitionMin: "Học phí tối thiểu",
  tuitionMax: "Học phí tối đa",
  quota: "Chỉ tiêu",
  source: "Nguồn",
  updatedAt: "Ngày cập nhật",
  employmentRate: "Tỷ lệ có việc làm",
  startingSalary: "Lương khởi điểm",
  experiencedSalary: "Thu nhập sau 3–5 năm",
  status: "Trạng thái",
  reason: "Lý do",
  note: "Ghi chú xử lý",
  season: "Mùa tuyển sinh",
  official: "Loại lịch",
  events: "Số mốc",
  alias: "Từ khoá",
  "*": "Toàn bộ",
};

/** "Cập nhật Mốc tuyển sinh · Mùa tuyển sinh (+2)" — mô tả ngắn một dòng nhật ký. */
export function describeAudit(e: Pick<AuditEntry, "action" | "targetType" | "changes">): string {
  const head = `${ACTION_LABEL[e.action] ?? e.action} ${(TARGET_LABEL[e.targetType ?? "program"] ?? "").toLowerCase()}`.trim();
  const f = e.changes[0]?.field;
  if (!f || f === "*") return head;
  return `${head} · ${FIELD_LABEL[f] ?? f}${e.changes.length > 1 ? ` (+${e.changes.length - 1})` : ""}`;
}
