import type { Metadata } from "next";
import { LegalPage } from "@/components/help/legal-page";

export const metadata: Metadata = { title: "Điều khoản sử dụng" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Điều khoản sử dụng"
      updated="01/09/2026"
      sections={[
        { id: "chap-nhan", title: "Chấp nhận điều khoản", body: <p>Bằng cách truy cập, đăng ký tài khoản hoặc sử dụng dịch vụ trên Trovio, bạn đồng ý tuân thủ các điều khoản dưới đây.</p> },
        { id: "dich-vu", title: "Mô tả dịch vụ", body: <p>Trovio là nền tảng tra cứu, so sánh chương trình đào tạo, điểm chuẩn, học phí và trắc nghiệm sở thích nghề nghiệp. <strong>Trovio KHÔNG phải cổng đăng ký tuyển sinh chính thức.</strong> Thí sinh vẫn phải đăng ký nguyện vọng trên hệ thống của Bộ GD&ĐT.</p> },
        { id: "tai-khoan", title: "Tài khoản người dùng", body: <p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</p> },
        { id: "hanh-vi", title: "Quy tắc sử dụng", body: <p>Không sử dụng công cụ tự động (crawler, robot) để sao chép hàng loạt dữ liệu khi chưa có sự chấp thuận bằng văn bản của Trovio.</p> },
        { id: "chinh-xac", title: "Độ chính xác của dữ liệu", body: <p>Chúng tôi nỗ lực cập nhật dữ liệu từ đề án tuyển sinh của các trường. Tuy nhiên điểm chuẩn và mức độ phù hợp chỉ mang tính tham khảo; người dùng cần đối chiếu nguồn chính thức trước khi ra quyết định.</p> },
        { id: "so-huu", title: "Sở hữu trí tuệ", body: <p>Giao diện, thuật toán gợi ý và bộ câu hỏi trắc nghiệm là tài sản của Trovio. Mọi hành vi sao chép khi chưa được phép đều bị nghiêm cấm.</p> },
        { id: "gioi-han", title: "Giới hạn trách nhiệm", body: <p>Trovio không chịu trách nhiệm cho kết quả tuyển sinh hay quyết định chọn trường, chọn ngành của người dùng.</p> },
        { id: "thay-doi", title: "Thay đổi điều khoản", body: <p>Điều khoản có thể được cập nhật; thay đổi có hiệu lực kể từ khi đăng tải trên trang này.</p> },
        { id: "lien-he", title: "Thông tin liên hệ", body: <p>Mọi câu hỏi về điều khoản, vui lòng liên hệ contact@trovio.vn.</p> },
      ]}
    />
  );
}
