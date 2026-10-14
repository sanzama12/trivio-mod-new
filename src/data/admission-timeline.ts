import type { TimelineEvent } from "../domain/types";

/**
 * MỐC TUYỂN SINH — FILE CẤU HÌNH, cập nhật mỗi năm.
 * Các ngày dưới đây là MINH HOẠ, ước lượng theo lịch các năm trước; phải đối chiếu hướng dẫn chính thức
 * của Bộ GD&ĐT và ĐHQG trước khi dùng thật. Đổi `TIMELINE_SEASON` và các ngày cho mùa tuyển sinh mới.
 */
export const TIMELINE_SEASON = "2026";
export const TIMELINE_NOTE = "Lịch mùa tuyển sinh 2026 theo hướng dẫn của Bộ GD&ĐT (Thông tư 06/2026/TT-BGDĐT).";

export const admissionTimeline: TimelineEvent[] = [
  {
    id: "2026-dgnl-hn-dot-1",
    title: "Thi đánh giá năng lực ĐHQG Hà Nội (HSA) — đợt đầu",
    start: "2026-03-14",
    end: "2026-03-15",
    category: "dgnl",
    desc: "Các đợt thi HSA thường bắt đầu từ tháng 3. Đăng ký trên cổng thi của ĐHQG Hà Nội trước ngày thi vài tuần.",
  },
  {
    id: "2026-dgnl-hcm-dot-1",
    title: "Thi đánh giá năng lực ĐHQG TP.HCM — đợt 1",
    start: "2026-04-05",
    category: "dgnl",
    desc: "Kỳ thi thang 1200 điểm, thường tổ chức 2 đợt vào tháng 4 và tháng 5–6.",
  },
  {
    id: "2026-dang-ky-thi-thpt",
    title: "Đăng ký dự thi tốt nghiệp THPT",
    start: "2026-04-21",
    end: "2026-05-05",
    category: "dang-ky",
    desc: "Học sinh lớp 12 đăng ký dự thi qua trường THPT hoặc trực tuyến trên hệ thống của Bộ.",
  },
  {
    id: "2026-thi-thpt",
    title: "Kỳ thi tốt nghiệp THPT",
    start: "2026-06-25",
    end: "2026-06-26",
    category: "thi",
    desc: "Hai ngày thi chính thức. Mang theo giấy báo dự thi và giấy tờ tuỳ thân.",
  },
  {
    id: "2026-cong-bo-diem",
    title: "Công bố điểm thi tốt nghiệp THPT",
    start: "2026-07-16",
    category: "ket-qua",
    desc: "Tra cứu điểm thi, sau đó cập nhật điểm vào Trovio để xem lại mức cạnh tranh tham khảo.",
  },
  {
    id: "2026-dang-ky-nguyen-vong",
    title: "Đăng ký & điều chỉnh nguyện vọng xét tuyển",
    start: "2026-07-18",
    end: "2026-07-30",
    category: "dang-ky",
    desc: "Đăng ký tối đa 15 nguyện vọng theo Quy chế tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT), sắp xếp theo mức độ mong muốn thực tế. Dùng “Kiểm tra danh sách” ở trang Đã lưu trước khi nộp.",
  },
  {
    id: "2026-nop-le-phi",
    title: "Nộp lệ phí xét tuyển trực tuyến",
    start: "2026-07-31",
    end: "2026-08-06",
    category: "dang-ky",
    desc: "Nộp đúng số lượng nguyện vọng đã đăng ký. Nguyện vọng chưa nộp lệ phí sẽ không được xét.",
  },
  {
    id: "2026-ket-qua-dot-1",
    title: "Công bố kết quả trúng tuyển đợt 1",
    start: "2026-08-20",
    category: "ket-qua",
    desc: "Mỗi thí sinh chỉ trúng tuyển 1 nguyện vọng — nguyện vọng có thứ tự ưu tiên cao nhất mà bạn đủ điều kiện.",
  },
  {
    id: "2026-xac-nhan-nhap-hoc",
    title: "Xác nhận nhập học trực tuyến",
    start: "2026-08-21",
    end: "2026-08-30",
    category: "nhap-hoc",
    desc: "Xác nhận nhập học trên hệ thống của Bộ trước hạn, sau đó làm thủ tục theo hướng dẫn của trường.",
  },
];
