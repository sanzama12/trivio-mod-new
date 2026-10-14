import type { Metadata } from "next";
import { LegalPage } from "@/components/help/legal-page";
import { TrackingToggle } from "@/components/help/tracking-toggle";

export const metadata: Metadata = { title: "Chính sách riêng tư" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Chính sách riêng tư"
      updated="29/09/2026"
      sections={[
        { id: "gioi-thieu", title: "Giới thiệu chung", body: <p>Trovio cam kết bảo vệ quyền riêng tư của học sinh và phụ huynh. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn dùng nền tảng.</p> },
        {
          id: "du-lieu-thu-thap",
          title: "Dữ liệu chúng tôi thu thập",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Thông tin tài khoản:</strong> họ tên, email; nếu đăng nhập bằng Google thì thêm ảnh đại diện và mã định danh Google (chỉ quyền openid, email, profile). Chúng tôi không thu thập số điện thoại, ngày sinh hay số CCCD.</li>
              <li><strong>Hồ sơ tuỳ chọn:</strong> vai trò (học sinh/phụ huynh), năm tốt nghiệp THPT, tỉnh/thành; xác nhận độ tuổi và sự đồng ý của phụ huynh với người dùng dưới 16 tuổi.</li>
              <li><strong>Dữ liệu học tập & điểm số:</strong> điểm thi dự kiến, tổ hợp môn, khu vực ưu tiên bạn nhập.</li>
              <li><strong>Sở thích nghề nghiệp:</strong> câu trả lời và kết quả trắc nghiệm RIASEC, danh sách ngành quan tâm; kết quả mini-test phong cách làm việc và mã MBTI nếu bạn tự nhập (chỉ để hiển thị giải thích, không dùng tính điểm gợi ý, xoá được bất cứ lúc nào).</li>
              <li><strong>Chia sẻ với phụ huynh (khi bạn chủ động tạo link):</strong> người có link xem được tên (không có email) và danh sách nguyện vọng; điểm và ghi chú chỉ hiện nếu bạn cho phép. Link có hạn 7 hoặc 30 ngày và thu hồi được bất cứ lúc nào. Góp ý người xem gửi (tên tự điền, nội dung) chỉ bạn đọc được.</li>
              <li><strong>Cảm nhận về trường (khi bạn gửi):</strong> nội dung, điểm đánh giá, khoá học; chỉ hiển thị sau khi được kiểm duyệt. Tên hiển thị được rút gọn (VD: “An N.”) hoặc “Ẩn danh” nếu bạn chọn; email không bao giờ hiển thị công khai. Bạn rút lại cảm nhận bất cứ lúc nào; xoá tài khoản sẽ xoá toàn bộ cảm nhận đã viết.</li>
              <li><strong>Trợ lý hỏi đáp:</strong> câu hỏi được lưu ẩn danh (không gắn tài khoản, đã tự che email và số điện thoại) để cải thiện chất lượng trả lời. Đừng nhập thông tin cá nhân vào khung chat.</li>
              <li><strong>Báo dữ liệu sai (khi bạn gửi):</strong> nội dung báo lỗi, trang liên quan và email nhận phản hồi (nếu bạn điền, hoặc email tài khoản khi đã đăng nhập). Email chỉ dùng để báo kết quả xử lý và không hiển thị công khai.</li>
              <li><strong>Nhắc hạn tuyển sinh (khi bạn bật):</strong> các mốc bạn chọn “Nhắc tôi”. Nếu bật “Nhắc qua email”, Trovio gửi email trước mốc 7 ngày và 1 ngày tới email đã xác thực; tắt bất cứ lúc nào ở trang Mốc tuyển sinh.</li>
              <li><strong>Thông báo trong tài khoản:</strong> kết quả kiểm duyệt cảm nhận, kết quả xử lý báo lỗi và nhắc hạn; tự xoá khi xoá tài khoản.</li>
              <li><strong>Thống kê sử dụng ẩn danh:</strong> khi bạn làm xong một bước (vào trang, làm trắc nghiệm, làm mini-test phong cách, nhập mã MBTI, nhập điểm, lưu chương trình, lập nguyện vọng, tạo link chia sẻ, hỏi trợ lý), trình duyệt gửi tên bước kèm một mã ngẫu nhiên do chính trình duyệt tạo. Không gửi tài khoản, địa chỉ IP, nội dung hay đường dẫn; dữ liệu tự xoá sau 180 ngày và chỉ dùng để biết người dùng hay dừng lại ở bước nào.</li>
              <li><strong>Phiếu khảo sát trải nghiệm (nếu bạn tham gia):</strong> điểm 10 câu hỏi, vai trò và góp ý tuỳ chọn; ẩn danh, không gắn tài khoản.</li>
            </ul>
          ),
        },
        { id: "muc-dich", title: "Mục đích sử dụng dữ liệu", body: <p>Dữ liệu chỉ dùng để cá nhân hoá gợi ý chương trình, lưu danh sách nguyện vọng và cải thiện chất lượng dịch vụ. Chúng tôi không dùng dữ liệu cho quảng cáo nhắm mục tiêu.</p> },
        { id: "chia-se", title: "Chia sẻ dữ liệu với bên thứ ba", body: <p>Trovio không bán hoặc trao đổi dữ liệu cá nhân của học sinh cho bất kỳ đơn vị quảng cáo nào. Dữ liệu tổng hợp đã ẩn danh có thể được dùng cho báo cáo thống kê chung.</p> },
        { id: "bao-mat", title: "Bảo mật thông tin", body: <p>Kết nối được mã hoá (SSL/TLS), mật khẩu được băm một chiều, quyền truy cập nội bộ được giới hạn theo vai trò.</p> },
        { id: "quyen", title: "Quyền của người dùng", body: <p>Bạn có quyền xem, sửa hoặc xoá vĩnh viễn tài khoản cùng toàn bộ dữ liệu bất kỳ lúc nào trong mục Hồ sơ cá nhân, hoặc gửi yêu cầu tới privacy@trovio.vn.</p> },
        {
          id: "cookie",
          title: "Cookie & công nghệ theo dõi",
          body: (
            <>
              <p>
                Chúng tôi chỉ dùng cookie cần thiết để duy trì phiên đăng nhập. Khi chưa đăng nhập, danh sách đã lưu được giữ trong bộ nhớ cục bộ (localStorage) của trình duyệt; khi đăng nhập, dữ liệu này
                được gộp vào tài khoản và bản sao trên trình duyệt được xoá khi bạn đăng xuất.
              </p>
              <p className="mt-2">
                Thống kê sử dụng ẩn danh (mục trên) không dùng cookie và không dùng công cụ của bên thứ ba. Trình duyệt bật “Do Not Track” hoặc “Global Privacy Control” sẽ tự động không gửi. Bạn cũng có thể
                tắt ngay tại đây:
              </p>
              <TrackingToggle />
            </>
          ),
        },
        { id: "lien-he", title: "Thông tin liên hệ", body: <p>Mọi thắc mắc về bảo mật thông tin, vui lòng gửi email tới privacy@trovio.vn hoặc gọi 1900 8198.</p> },
      ]}
    />
  );
}
