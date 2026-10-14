import type { ReviewCriterion } from "./types";

/** Hằng số dùng chung (server + client) cho cảm nhận sinh viên. */
export const REVIEW_CRITERIA: Record<ReviewCriterion, string> = {
  teaching: "Chất lượng giảng dạy",
  facilities: "Cơ sở vật chất",
  activities: "Hoạt động sinh viên",
  career: "Hỗ trợ việc làm",
};

export const RELATION_LABELS = { "sinh-vien": "Sinh viên", "cuu-sinh-vien": "Cựu sinh viên" } as const;

export const REVIEW_LIMITS = { titleMin: 5, titleMax: 100, contentMin: 80, contentMax: 2000 } as const;

/** Từ số cảm nhận này trở lên mới hiện bộ lọc theo ngành / khoá (ít hơn thì lọc không có ý nghĩa). */
export const REVIEW_FILTER_MIN = 4;
/** Số cảm nhận hiển thị mỗi lần, bấm "Xem thêm" để tải tiếp. */
export const REVIEW_PAGE_SIZE = 8;

/** Quy tắc cộng đồng hiển thị ở form viết cảm nhận. */
export const REVIEW_GUIDELINES = [
  "Chia sẻ trải nghiệm của chính bạn khi học tại trường (sinh viên hoặc cựu sinh viên).",
  "Không nêu tên, thông tin cá nhân của giảng viên, cán bộ hay sinh viên khác.",
  "Không đăng số điện thoại, email, đường link, quảng cáo hay mua bán tài liệu.",
  "Không xúc phạm, không cáo buộc sai phạm khi không có bằng chứng.",
  "Mọi cảm nhận được kiểm duyệt trước khi hiển thị, thường trong 48 giờ.",
];

export const REPORT_REASONS = {
  spam: "Quảng cáo / spam",
  "xuc-pham": "Ngôn từ xúc phạm",
  "sai-su-that": "Thông tin sai sự thật",
  "thong-tin-ca-nhan": "Lộ thông tin cá nhân",
  khac: "Lý do khác",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const REJECT_REASONS = {
  "vi-pham-quy-tac": "Vi phạm quy tắc cộng đồng",
  "quang-cao": "Có nội dung quảng cáo / liên hệ",
  "thong-tin-ca-nhan": "Nêu thông tin cá nhân của người khác",
  "khong-lien-quan": "Không liên quan đến trải nghiệm học tập",
  "cao-buoc": "Cáo buộc chưa có căn cứ",
} as const;
export type RejectReason = keyof typeof REJECT_REASONS;

/** Nhãn cờ do bộ lọc tự động gắn (cho người kiểm duyệt). */
export const FLAG_LABELS: Record<string, string> = {
  "lien-he": "Có số điện thoại / email / đường link",
  "quang-cao": "Dấu hiệu quảng cáo",
  "ngon-tu": "Ngôn từ không phù hợp",
  "cong-kich": "Cáo buộc nặng — cần kiểm tra kỹ",
  "nhac-ten": "Có thể nêu tên cá nhân",
  "viet-hoa": "Viết hoa quá nhiều",
  "lap-ky-tu": "Lặp ký tự bất thường",
  "bi-bao-cao": "Bị người dùng báo cáo nhiều lần",
};
