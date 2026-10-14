# BÁO CÁO BẢO MẬT, ĐỊNH DANH & QUYỀN RIÊNG TƯ (SECURITY & PRIVACY REVIEW)

> **Mã tài liệu**: `docs/remediation/03-security-privacy.md`  
> **Thời điểm nghiệp vụ**: 2026-10-11  
> **Trách nhiệm**: Security Reviewer & Lead Architect  

---

## 1. VÒNG ĐỜI DANH TÍNH GIÁO VIÊN & KIỂM SOÁT TRUY CẬP (RBAC)

### 1.1. Lỗ hổng cũ & Nguy cơ
Trong phiên bản trước, người dùng bất kỳ có thể gọi API `PATCH /api/account` với `{ role: "teacher" }`. Hệ thống ngay lập tức trao quyền giáo viên, cho phép tạo lớp học, cấp mã tham gia và xem hồ sơ dữ liệu cá nhân của học sinh tham gia lớp.

### 1.2. Kiến trúc vòng đời giáo viên mới (Giai đoạn 7)
Triển khai trạng thái định danh chặt chẽ qua [`TeacherVerificationStatus`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/domain/types.ts):
$$\text{user} \xrightarrow{\text{apply}} \text{pending} \xrightarrow{\text{approve / reject}} \text{verified / rejected} \xrightarrow{\text{revoke}} \text{suspended}$$

1. **Nộp hồ sơ (`apply`)**: Người dùng phải cung cấp đơn vị công tác (`schoolName`), tỉnh/thành (`province`), tổ chuyên môn (`department`), và minh chứng công tác hợp lệ từ 10 đến 1000 ký tự (email đuôi trường, quyết định phân công, liên kết cổng thông tin trường). Trạng thái chuyển sang `pending`.
2. **Thẩm định (`review`)**: Chỉ quản trị viên hệ sinh thái (`admin: true`) mới có quyền phê duyệt (`approve`), từ chối (`reject`) kèm lý do, hoặc thu hồi (`revoke`). Mọi hành động đều ghi nhận thời điểm, định danh người duyệt và ghi vết kiểm toán.
3. **Kiểm tra quyền tại máy chủ (Server-side Enforcement)**:
   - Tại [`class.service.ts`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/services/class.service.ts#L85):
     ```typescript
     if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
       return { ok: false, status: 403, message: "Chỉ giáo viên đã hoàn tất xác minh danh tính chính thức mới được phép tạo lớp..." };
     }
     ```
   - Chặn tuyệt đối việc chỉ ẩn nút bấm trên UI mà không kiểm tra tại backend API.

---

## 2. QUYỀN RIÊNG TƯ HỌC SINH & CƠ CHẾ ĐỒNG Ý CÓ PHÂN QUYỀN (GRANULAR CONSENT)

### 2.1. Ma trận đồng ý chia sẻ dữ liệu (`StudentShareConsent`)
Học sinh sở hữu toàn quyền kiểm soát dữ liệu cá nhân theo từng phạm vi độc lập:

| Phạm vi dữ liệu | Mặc định khi tham gia lớp | Mô tả bảo vệ quyền riêng tư |
| :--- | :--- | :--- |
| **Họ và tên (`shareName`)** | `true` (Tên viết tắt) / `false` (Ẩn danh hoàn toàn) | Khi bật: Hiển thị tên viết tắt làm mờ (Ví dụ: *"Nguyễn Văn An"* $\rightarrow$ *"An N."*). Khi tắt: Ẩn danh hóa hoàn toàn dạng *"Học sinh [mã mờ]"*. |
| **Tiến độ hoàn thành (`shareProgress`)** | `true` | Chỉ giáo viên biết học sinh đã hoàn thành bài test hay chưa (`quizDone: boolean`), không xem được nội dung chi tiết. |
| **Kết quả tính cách RIASEC (`shareRiasec`)** | **`false`** | Ẩn hoàn toàn điểm phần trăm và mã nhóm tính cách. Giáo viên chỉ nhận `riasec: null`. |
| **Danh sách nguyện vọng (`shareWishlist`)** | **`false`** | Ẩn hoàn toàn trường học, ngành học và ghi chú của học sinh. Giáo viên nhận `wishlistCount: 0` và `hasSafe: null`. |
| **Kết quả tư vấn chi tiết (`shareConsultation`)** | **`false`** | Không chia sẻ lịch sử trò chuyện với chatbot hoặc kế hoạch dự phòng. |

### 2.2. Quyền thu hồi đồng ý (Consent Revocation)
- Học sinh có thể gọi `updateConsent` hoặc `revokeConsent` bất kỳ lúc nào.
- Hiệu lực có giá trị **ngay lập tức** trên mọi truy vấn tiếp theo của giáo viên.
- Khi giáo viên truy cập màn hình báo cáo lớp (`classService.dashboard`), hệ thống tự động ghi nhật ký kiểm toán ([`auditService.log`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/services/audit.service.ts)) lưu lại định danh giáo viên, lớp học và thời điểm truy cập.

### 2.3. Mã lớp học an toàn (Class Code Lifecycle)
- **Ký tự khó đoán**: Mã gồm 6 ký tự trích xuất từ bảng ký tự ngẫu nhiên loại bỏ ký tự dễ nhầm lẫn (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- **Thời hạn hiệu lực (TTL)**: Mã có hạn sử dụng tối đa **7 ngày** (`CLASS_CODE_TTL_DAYS = 7`). Hết hạn mã tự động vô hiệu hóa.
- **Thu hồi chủ động (`revokeCode`)**: Giáo viên có thể thu hồi mã lớp ngay khi sĩ số đã đủ hoặc phát hiện rò rỉ mã.

---

## 3. AN TOÀN XÁC THỰC, BẢO MẬT ĐĂNG NHẬP & CHỐNG DÒ QUÉT TÀI KHOẢN

### 3.1. Cơ chế khóa tạm thời cấp tiến (Progressive Temporary Lockout)
Thay thế cơ chế khóa vĩnh viễn cũ bằng thuật toán Exponential Backoff:
- **Lần 1 đến 4**: Không khóa, trả về số lần thử còn lại (`attemptsLeft = 5 - failedAttempts`).
- **Lần 5**: Khóa tạm thời **60 giây** (1 phút).
- **Lần 6**: Khóa tạm thời **300 giây** (5 phút).
- **Lần 7**: Khóa tạm thời **900 giây** (15 phút).
- **Từ lần 8 trở đi**: Khóa tạm thời tối đa **3600 giây** (60 phút).
- **Tự động mở khóa (Auto-unlock)**: Sau khi thời gian `lockUntil` trôi qua, tài khoản tự động mở khóa bình thường mà không cần can thiệp thủ công từ admin.
- **Reset bộ đếm**: Đăng nhập đúng mật khẩu sẽ xóa sạch `failedAttempts` và `lockUntil` về `0` và `null`.

### 3.2. Chống tấn công phân tích thời gian & dò quét tài khoản (Timing Defense & Enumeration Resistance)
- **Vấn đề trước đây**: Email không tồn tại trả về kết quả ngay lập tức (~1ms), trong khi email tồn tại thực hiện thuật toán băm scrypt tốn ~100ms. Kẻ tấn công có thể đo độ trễ để biết email nào đã đăng ký.
- **Giải pháp**: Nếu email không tồn tại trong hệ thống, hàm `authService.login` chủ động thực thi tính toán `verifyPassword(password, DUMMY_HASH)` trên một chuỗi băm chuẩn scrypt trước khi trả về kết quả. Độ trễ phản hồi của email có thật và không có thật là hoàn toàn tương đương nhau (~100ms).

### 3.3. Chống giả mạo IP (IP Spoofing Protection) & Shared Rate Limiter
- Hàm [`clientIp`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/lib/http.ts#L44) không còn ngây thơ lấy phần tử đầu tiên của `X-Forwarded-For`.
- Hệ thống hỗ trợ cấu hình độ sâu proxy tin cậy (`TRUSTED_PROXY_DEPTH`), trích xuất IP từ bên phải sang (phía proxy hạ tầng kiểm soát) để ngăn kẻ tấn công tự gắn header giả.
- Module [`rate-limit.ts`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/lib/rate-limit.ts) cung cấp giao diện [`SharedRateLimitStore`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/lib/rate-limit.ts#L36) sẵn sàng kết nối PostgreSQL / Redis, đồng bộ giới hạn tần suất giữa nhiều instance ứng dụng.
