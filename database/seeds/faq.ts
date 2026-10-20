import type { FaqGroup } from "@/domain/types";

export const faqGroups: FaqGroup[] = [
  {
    title: "Tìm kiếm & Lọc",
    items: [
      { q: "Làm thế nào để tìm chương trình phù hợp với học lực?", a: "Bạn nhập điểm thi THPT dự kiến hoặc điểm học bạ vào bộ lọc. Hệ thống tự động đối chiếu với điểm chuẩn 3 năm gần nhất của các chương trình để hiển thị các lựa chọn vừa sức, an toàn hoặc thử sức." },
      { q: "Bộ lọc thông minh hoạt động như thế nào?", a: "Bộ lọc cho phép kết hợp tổ hợp môn, mức học phí tối đa, khu vực địa lý và loại hình trường. Kết quả cập nhật ngay khi bạn thay đổi điều kiện." },
    ],
  },
  {
    title: "Điểm & Dự đoán",
    items: [
      { q: "Điểm ưu tiên được tính như thế nào?", a: "Điểm ưu tiên khu vực (KV1 +0,75; KV2-NT +0,5; KV2 +0,25) và đối tượng (UT1 +2; UT2 +1) được cộng vào tổng điểm. Từ năm 2023, thí sinh đạt từ 22,5 điểm trở lên (thang 30) được cộng theo công thức [(30 − tổng điểm) / 7,5] × mức ưu tiên." },
      { q: "Chỉ số dự đoán điểm chuẩn có chính xác tuyệt đối không?", a: "Không. Mức độ phù hợp chỉ mang tính tham khảo, dựa trên điểm chuẩn các năm trước. Điểm chuẩn thực tế phụ thuộc chỉ tiêu và phổ điểm từng năm." },
      { q: "Tại sao một số trường không công bố điểm chuẩn thi THPT?", a: "Một số trường chỉ xét học bạ, chứng chỉ quốc tế hoặc kỳ thi riêng. Nếu chương trình chưa có điểm chuẩn chính thức được công bố hoặc sử dụng phương thức riêng, Trovio hiển thị “Chưa có dữ liệu chính thức” thay vì tự suy diễn phương thức xét tuyển." },
    ],
  },
  {
    title: "Tài khoản người dùng",
    items: [
      { q: "Làm thế nào để lưu lại các ngành học yêu thích?", a: "Bấm biểu tượng trái tim ở thẻ chương trình. Danh sách xuất hiện trong mục “Đã lưu & Nguyện vọng”, nơi bạn có thể sắp xếp thứ tự nguyện vọng dự kiến." },
      { q: "Tôi phải làm gì nếu quên mật khẩu?", a: "Tại trang Đăng nhập, chọn “Quên mật khẩu?”, nhập email đã đăng ký. Hệ thống gửi liên kết đặt lại mật khẩu có hiệu lực trong 30 phút." },
    ],
  },
  {
    title: "Dữ liệu & Biên tập",
    items: [
      { q: "Dữ liệu điểm chuẩn và học phí được cập nhật khi nào?", a: "Đội ngũ biên tập rà soát và cập nhật dữ liệu theo đề án tuyển sinh công bố hằng năm của từng trường, kèm ngày kiểm tra gần nhất trên mỗi trang." },
    ],
  },
  {
    title: "Trợ lý hỏi đáp",
    items: [
      { q: "Trợ lý hỏi đáp có dự đoán điểm chuẩn không?", a: "Không. Trợ lý chỉ trả lời từ dữ liệu của Trovio và luôn kèm nguồn để bạn kiểm tra; không dự đoán điểm chuẩn, không cam kết khả năng đỗ. Thông tin tuyển sinh chính thức là đề án của trường và cổng thông tin của Bộ GD&ĐT." },
    ],
  },
];
