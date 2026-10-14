import type { RiasecQuestion, RiasecType } from "../domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "../domain/riasec";

export const riasecInfo = RIASEC_INFO;
export const riasecOrder = RIASEC_ORDER;

/**
 * Ngân hàng 60 câu (10 câu/nhóm). Đợt 10/2026 viết lại 24 câu theo TÌNH HUỐNG đời thường của học sinh
 * (1 tình huống – 1 hoạt động, tối đa ~20 chữ, không định kiến giới) để dễ hình dung và trả lời thật hơn.
 * Giữ nguyên THỨ TỰ trong mỗi nhóm: mã câu (id) không đổi nên bài đang làm dở / kết quả đã lưu không bị ảnh hưởng.
 */
const bank: Record<RiasecType, string[]> = {
  R: [
    "Quạt ở nhà bị hỏng, bạn tự mở ra tìm chỗ hỏng để sửa",
    "Làm việc ngoài trời như trồng cây, chăm sóc vườn",
    "Dùng kìm, tua vít, máy khoan để tự làm một món đồ",
    "Được tự vận hành máy in 3D hoặc máy cắt laser ở phòng thực hành",
    "Tự tay làm mô hình, đồ thủ công",
    "Tìm hiểu cách một chiếc xe hoặc động cơ hoạt động",
    "Tham gia hoạt động thể thao, vận động thể chất",
    "Lắp đặt hệ thống điện, nước trong nhà",
    "Giờ Công nghệ, tự tay đấu mạch điện cho bóng đèn sáng",
    "Xây dựng hoặc sửa chữa đồ đạc bằng gỗ",
  ],
  I: [
    "Lớp làm khảo sát, bạn tự tổng hợp số liệu để tìm ra điều thú vị",
    "Tìm hiểu nguyên nhân của các hiện tượng tự nhiên",
    "Giải các bài toán logic và câu đố phức tạp",
    "Xem xong một video khoa học, bạn tìm đọc thêm để hiểu tận gốc",
    "Thực hiện thí nghiệm trong phòng thí nghiệm",
    "Tìm hiểu cách hoạt động của máy tính và phần mềm",
    "Gặp một bài toán lạ, bạn kiên nhẫn thử nhiều cách đến khi ra",
    "Theo dõi tin tức về công nghệ, vũ trụ, y học",
    "Viết chương trình máy tính để giải quyết vấn đề",
    "Đội bóng của lớp thua, bạn ngồi phân tích xem vì sao thua",
  ],
  A: [
    "Vẽ, thiết kế poster hoặc hình ảnh",
    "Viết truyện, thơ hoặc kịch bản",
    "Chơi nhạc cụ hoặc sáng tác âm nhạc",
    "Quay và dựng một video kỷ niệm cho cả lớp",
    "Lớp chuẩn bị cắm trại, bạn nhận phần trang trí, bày biện",
    "Tham gia diễn kịch, biểu diễn trước đám đông",
    "Thiết kế trang phục hoặc phụ kiện",
    "Sáng tạo nội dung cho mạng xã hội",
    "Được tự chọn cách trình bày bài thuyết trình theo phong cách riêng",
    "Cuối tuần rủ bạn bè đi xem một triển lãm tranh, ảnh",
  ],
  S: [
    "Giảng bài, giải thích kiến thức cho bạn bè",
    "Bạn thân đang buồn, bạn ngồi nghe và tìm cách động viên",
    "Tham gia hoạt động tình nguyện, thiện nguyện",
    "Chăm sóc người bệnh, người già hoặc trẻ nhỏ",
    "Kéo các bạn ít nói cùng tham gia để cả nhóm vui hơn",
    "Tổ chức hoạt động cho câu lạc bộ, lớp học",
    "Có bạn mới chuyển lớp, bạn chủ động giúp bạn ấy làm quen",
    "Tìm hiểu tâm lý và cảm xúc của con người",
    "Hai bạn trong nhóm cãi nhau, bạn đứng ra giúp hai bên hiểu nhau",
    "Tham gia các dự án phục vụ cộng đồng",
  ],
  E: [
    "Thuyết phục cả lớp chọn địa điểm đi chơi mà bạn đề xuất",
    "Lãnh đạo một nhóm để đạt mục tiêu",
    "Bán hàng hoặc kinh doanh nhỏ",
    "Lên kế hoạch bán đồ tự làm để gây quỹ cho lớp",
    "Đi mua đồ cho sự kiện của lớp, bạn trả giá để được giá tốt nhất",
    "Phát biểu, thuyết trình trước đám đông",
    "Tranh cử vào ban cán sự lớp, đoàn trường",
    "Tìm hiểu vì sao một thương hiệu đồ uống bỗng nổi tiếng khắp nơi",
    "Đặt mục tiêu cao và cạnh tranh để đạt được",
    "Quản lý ngân sách cho một sự kiện",
  ],
  C: [
    "Sắp xếp góc học tập, sách vở theo từng môn cho gọn gàng",
    "Nhập và kiểm tra dữ liệu trên bảng tính",
    "Làm bài theo đúng từng bước thầy cô hướng dẫn, không bỏ bước nào",
    "Theo dõi thu chi, lập sổ sách cá nhân",
    "Lập thời gian biểu và kế hoạch chi tiết",
    "Soát lỗi chính tả, số liệu cho bài báo cáo của nhóm",
    "Quản lý kho đồ, danh sách vật dụng",
    "Làm việc với các con số và báo cáo",
    "Làm cờ đỏ, theo dõi nề nếp các lớp theo đúng quy định",
    "Lưu trữ, phân loại ảnh và tệp trên máy tính",
  ],
};

export const riasecQuestions: RiasecQuestion[] = riasecOrder.flatMap((type, t) =>
  bank[type].map((text, i) => ({ id: t * 10 + i + 1, type, text })),
);

