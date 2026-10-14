/**
 * DOMAIN — thang đo SUS (System Usability Scale). Module thuần, dùng được ở cả server và trình duyệt.
 */

/** 10 câu SUS chuẩn (Brooke, 1996) — bản tiếng Việt. Câu lẻ tích cực, câu chẵn tiêu cực. */
export const SUS_QUESTIONS = [
  "Tôi nghĩ mình sẽ muốn dùng trang web này thường xuyên.",
  "Tôi thấy trang web phức tạp một cách không cần thiết.",
  "Tôi thấy trang web dễ sử dụng.",
  "Tôi nghĩ mình cần người hỗ trợ kỹ thuật mới dùng được trang web này.",
  "Tôi thấy các chức năng của trang web được kết nối tốt với nhau.",
  "Tôi thấy trang web có quá nhiều chỗ không nhất quán.",
  "Tôi nghĩ hầu hết mọi người sẽ học cách dùng trang web này rất nhanh.",
  "Tôi thấy trang web rất rườm rà, khó thao tác.",
  "Tôi cảm thấy rất tự tin khi dùng trang web.",
  "Tôi cần học nhiều thứ trước khi có thể dùng được trang web này.",
] as const;

export const SUS_ROLES: Record<string, string> = { "hoc-sinh": "Học sinh", "phu-huynh": "Phụ huynh", "giao-vien": "Giáo viên / tư vấn", khac: "Khác" };

/** Điểm SUS 0–100: câu lẻ (x−1), câu chẵn (5−x), tổng × 2,5. */
export function susScore(answers: number[]): number {
  const sum = answers.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0);
  return Math.round(sum * 2.5 * 10) / 10;
}

/** Diễn giải theo thang Bangor et al. (2009). */
export function susGrade(score: number): string {
  if (score >= 85) return "Xuất sắc";
  if (score >= 72) return "Tốt";
  if (score >= 68) return "Trên trung bình";
  if (score >= 51) return "Tạm được";
  return "Kém";
}
