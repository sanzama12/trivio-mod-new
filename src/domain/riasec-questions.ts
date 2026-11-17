import type { RiasecType } from "./types";
import { RIASEC_ORDER } from "./riasec";

// Original Vietnamese activity items for Trovio. This is not a translated
// or normed O*NET assessment. Ten items per Holland interest dimension.
export const RIASEC_ASSESSMENT_VERSION = "trovio-holland-60-vi-v1";
export const RIASEC_SCORING_VERSION = "sum-0-4-v1";
export const RIASEC_SOURCE_URL = "https://www.onetcenter.org/reports/IP_Manual.html";

const ACTIVITIES: Record<RiasecType, string[]> = {
  R: [
    "Lắp ráp một thiết bị từ các linh kiện và bản hướng dẫn.",
    "Sửa chiếc xe đạp hoặc đồ dùng bị hỏng.",
    "Chăm sóc cây trồng và quan sát chúng phát triển.",
    "Sử dụng dụng cụ để làm một món đồ bằng gỗ.",
    "Thực hành vận hành một loại máy móc.",
    "Lắp đặt hệ thống điện hoặc thiết bị trong nhà.",
    "Tham gia công việc khảo sát thực địa ngoài trời.",
    "Chế tạo mô hình có thể chuyển động hoặc hoạt động.",
    "Kiểm tra và bảo dưỡng thiết bị để hoạt động ổn định.",
    "Thực hành kỹ thuật trong xưởng hoặc phòng thực hành.",
  ],
  I: [
    "Tìm nguyên nhân của một hiện tượng tự nhiên.",
    "Thực hiện thí nghiệm để kiểm tra một giả thuyết.",
    "Phân tích số liệu để tìm ra quy luật.",
    "Tìm hiểu cơ chế hoạt động của cơ thể con người.",
    "Giải một vấn đề đòi hỏi suy luận logic.",
    "Đọc tài liệu khoa học để hiểu sâu một chủ đề.",
    "So sánh bằng chứng trước khi đưa ra kết luận.",
    "Lập trình để thử nghiệm cách giải một bài toán.",
    "Nghiên cứu tác động của một chất lên môi trường.",
    "Thiết kế cách khảo sát để trả lời một câu hỏi mới.",
  ],
  A: [
    "Thiết kế hình ảnh cho một câu chuyện hoặc ý tưởng.",
    "Viết truyện, thơ hoặc lời bài hát.",
    "Sáng tác hoặc biểu diễn một tiết mục âm nhạc.",
    "Thử nhiều cách phối màu và bố cục cho một sản phẩm.",
    "Diễn xuất hoặc xây dựng nhân vật cho một vở kịch.",
    "Chụp ảnh để thể hiện góc nhìn riêng.",
    "Làm video với phong cách kể chuyện do mình sáng tạo.",
    "Thiết kế trang phục hoặc không gian theo ý tưởng mới.",
    "Vẽ hoặc làm đồ thủ công để bộc lộ cảm xúc.",
    "Nghĩ ra một cách trình bày độc đáo cho thông điệp.",
  ],
  S: [
    "Hướng dẫn một bạn học hiểu phần kiến thức khó.",
    "Lắng nghe người khác chia sẻ vấn đề của họ.",
    "Tham gia hoạt động hỗ trợ cộng đồng.",
    "Giúp người mới làm quen với một môi trường học tập.",
    "Chăm sóc và hỗ trợ người cần giúp đỡ.",
    "Tổ chức hoạt động để mọi người học hỏi cùng nhau.",
    "Giải thích thông tin để người khác đưa ra lựa chọn.",
    "Hướng dẫn trẻ em thực hiện một hoạt động mới.",
    "Hỗ trợ giải quyết bất đồng giữa các thành viên.",
    "Đồng hành cùng người khác trong quá trình rèn luyện.",
  ],
  E: [
    "Thuyết phục mọi người cùng thực hiện một ý tưởng.",
    "Dẫn dắt nhóm hoàn thành một mục tiêu chung.",
    "Giới thiệu và bán một sản phẩm mình tin tưởng.",
    "Thương lượng để đạt được thỏa thuận giữa hai bên.",
    "Lập kế hoạch phát triển một hoạt động kinh doanh.",
    "Đại diện nhóm trình bày đề xuất trước người khác.",
    "Điều phối nhân lực và nguồn lực cho một sự kiện.",
    "Tìm cơ hội để đưa một sản phẩm mới ra thị trường.",
    "Kết nối đối tác để cùng triển khai một dự án.",
    "Ra quyết định và chịu trách nhiệm cho công việc của nhóm.",
  ],
  C: [
    "Sắp xếp hồ sơ để có thể tìm lại nhanh chóng.",
    "Kiểm tra bảng số liệu để phát hiện sai sót.",
    "Lập bảng tính theo dõi thu chi.",
    "Ghi chép và cập nhật thông tin chính xác theo biểu mẫu.",
    "Thực hiện công việc theo quy trình rõ ràng.",
    "Phân loại tài liệu theo một hệ thống thống nhất.",
    "Đối chiếu chứng từ và số liệu trước khi xác nhận.",
    "Theo dõi lịch trình và các mốc công việc.",
    "Kiểm kê đồ dùng và cập nhật số lượng còn lại.",
    "Chuẩn bị báo cáo theo các yêu cầu chi tiết.",
  ],
};

export const RIASEC_QUESTIONS = Array.from({ length: 10 }, (_, index) =>
  RIASEC_ORDER.map((type) => ({ id: `${type}${index + 1}`, type, text: ACTIVITIES[type][index] })),
).flat();

export const RIASEC_ANSWERS = [
  { value: 0, label: "Rất không thích" },
  { value: 1, label: "Không thích" },
  { value: 2, label: "Chưa rõ" },
  { value: 3, label: "Thích" },
  { value: 4, label: "Rất thích" },
] as const;
