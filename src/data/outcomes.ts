import type { Benchmark, DataSource, MajorOutcome, SchoolOutcome } from "../domain/types";

/**
 * VIỆC LÀM & THU NHẬP — mọi con số đều gắn `sourceId`.
 *
 * - Nguồn có `trust: "cao"` / `"trung-binh"` là nguồn THẬT đã được kiểm tra (xem `url`, ngày truy cập).
 * - Nguồn `trovio-demo` là số liệu MINH HOẠ để dựng giao diện; giao diện luôn gắn nhãn "Minh hoạ".
 *   Quản trị viên thay bằng số liệu từ báo cáo khảo sát việc làm của trường (bắt buộc công khai theo
 *   Thông tư 09/2024/TT-BGDĐT) qua trang /quan-tri/viec-lam.
 */
export const dataSources: DataSource[] = [
  {
    id: "nso-2025",
    title: "Thông cáo báo chí về tình hình dân số, lao động, việc làm quý IV và năm 2025",
    publisher: "Cục Thống kê – Bộ Tài chính",
    year: 2025,
    url: "https://www.nso.gov.vn/tin-tuc-thong-ke/2026/01/thong-cao-bao-chi-ve-tinh-hinh-dan-so-lao-dong-viec-lam-quy-iv-va-nam-2025/",
    kind: "thong-ke",
    trust: "cao",
    note: "Số liệu điều tra lao động – việc làm toàn quốc. Thu nhập bình quân tính cho toàn bộ lao động, không tách theo ngành học hay trình độ đào tạo — chỉ dùng làm mốc so sánh.",
    accessedAt: "2026-09-29",
  },
  {
    id: "tt-01-2024",
    title: "Thông tư 01/2024/TT-BGDĐT ban hành Chuẩn cơ sở giáo dục đại học",
    publisher: "Bộ Giáo dục và Đào tạo",
    year: 2024,
    url: "https://thuvienphapluat.vn/van-ban/Giao-duc/Thong-tu-01-2024-TT-BGDDT-Chuan-co-so-giao-duc-dai-hoc-598459.aspx",
    kind: "van-ban",
    trust: "cao",
    note: "Chuẩn yêu cầu tỷ lệ người tốt nghiệp có việc làm phù hợp với trình độ, tự tạo việc làm hoặc học tiếp trong 12 tháng không thấp hơn 70%; trường công bố kết quả thực hiện chuẩn hằng năm.",
    accessedAt: "2026-09-29",
  },
  {
    id: "tt-09-2024",
    title: "Thông tư 09/2024/TT-BGDĐT quy định về công khai trong hoạt động của các cơ sở giáo dục",
    publisher: "Bộ Giáo dục và Đào tạo",
    year: 2024,
    url: "https://thuvienphapluat.vn/van-ban/Giao-duc/Thong-tu-09-2024-TT-BGDDT-cong-khai-trong-hoat-dong-co-so-giao-duc-quoc-dan-581008.aspx",
    kind: "van-ban",
    trust: "cao",
    note: "Điều 13: cơ sở giáo dục đại học phải công khai tỷ lệ người học tốt nghiệp có việc làm phù hợp với trình độ đào tạo trong 12 tháng sau tốt nghiệp. Đây là nguồn chính thức nên dùng cho số liệu theo từng trường, ngành.",
    accessedAt: "2026-09-29",
  },
  {
    id: "tuoitre-2026-01-viec-lam",
    title: "Trường đại học nào nhiều sinh viên sớm có việc làm, lương cao sau khi ra trường?",
    publisher: "Báo Tuổi Trẻ (21/01/2026)",
    year: 2025,
    url: "https://tuoitre.vn/truong-dai-hoc-nao-nhieu-sinh-vien-som-co-viec-lam-luong-cao-sau-khi-ra-truong-20260121180410959.htm",
    kind: "bao-chi",
    trust: "trung-binh",
    note: "Báo chí tổng hợp kết quả khảo sát do chính các trường thực hiện với sinh viên tốt nghiệp năm 2025. Nên đối chiếu báo cáo gốc của trường; tỷ lệ phản hồi và cách định nghĩa \"có việc làm\" khác nhau giữa các trường.",
    accessedAt: "2026-09-29",
  },
  {
    id: "trovio-demo",
    title: "Số liệu minh hoạ của bản demo Trovio",
    publisher: "Trovio",
    year: 2025,
    url: null,
    kind: "minh-hoa",
    trust: "minh-hoa",
    note: "Ước lượng chỉ để minh hoạ giao diện, KHÔNG phải số liệu thống kê. Cần thay bằng số liệu từ báo cáo khảo sát việc làm của các trường hoặc khảo sát có phương pháp công bố rõ ràng.",
    accessedAt: "2026-09-29",
  },
];

export const benchmarks: Benchmark[] = [
  { id: "income-2025", label: "Thu nhập bình quân tháng của lao động cả nước", value: 8.4, unit: "triệu đồng/tháng", year: 2025, sourceId: "nso-2025" },
  { id: "youth-unemployment-2025", label: "Tỷ lệ thất nghiệp thanh niên 15–24 tuổi", value: 8.64, unit: "%", year: 2025, sourceId: "nso-2025" },
  {
    id: "standard-70",
    label: "Ngưỡng tối thiểu người tốt nghiệp có việc làm phù hợp / học tiếp trong 12 tháng (Chuẩn cơ sở GDĐH)",
    value: 70,
    unit: "%",
    year: 2024,
    sourceId: "tt-01-2024",
  },
];

export const schoolOutcomes: SchoolOutcome[] = [];

export const majorOutcomes: MajorOutcome[] = [];

