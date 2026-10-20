# LUỒNG HOẠT ĐỘNG NGHIỆP VỤ TROVIO

> Tài liệu cơ sở để vẽ use case, đối chiếu trực tiếp từ mã nguồn tại ngày 19/10/2026.
> Phạm vi là những chức năng có đường vào thực tế qua page/API. Nội dung trong README nhưng không còn page/API hoặc chỉ có service chưa được coi là một use case hoàn chỉnh.

## 1. Cách đọc và nguyên tắc xác minh

- **Nguồn sự thật ưu tiên:** route/page → controller → service → repository. README chỉ dùng để đối chiếu, không dùng thay mã nguồn.
- **Chức năng hoàn chỉnh:** có actor, điểm vào từ giao diện hoặc API, kiểm tra quyền và xử lý nghiệp vụ.
- **Chức năng nội bộ:** có service nhưng không có route/UI; ghi riêng ở mục 12 và không vẽ như chức năng người dùng đang sử dụng.
- **Dữ liệu runtime:** lấy từ PostgreSQL; repository không có cơ chế tự chuyển sang dữ liệu giả khi thiếu database. Bằng chứng: `src/repositories/index.ts`, `src/repositories/postgres*.ts`, `src/lib/db.ts`.
- **Dữ liệu khách:** một số dữ liệu cá nhân được giữ ở `localStorage`; sau khi đăng nhập, dữ liệu được gộp vào tài khoản chứ không ghi đè. Bằng chứng: `src/stores/trovio-store.tsx`, `src/services/user-data.service.ts`.

## 2. Biên hệ thống và actor thực tế

Biên hệ thống nên đặt tên **“Hệ thống định hướng tuyển sinh Trovio”**.

| Actor | Quyền/nghiệp vụ thực tế trong mã |
|---|---|
| **Khách** | Xem và tìm trường/ngành/chương trình; xem chi tiết; so sánh; nhập hồ sơ điểm; nhận gợi ý; tính chi phí; chọn môn lớp 10; xem mốc tuyển sinh và mùa điểm; làm mini-test phong cách; hỏi cộng đồng; dùng chatbot; làm khảo sát. Dữ liệu phù hợp được lưu trên trình duyệt. |
| **Người dùng đã đăng nhập** | Có toàn bộ quyền công khai; đồng bộ dữ liệu; lập nguyện vọng; chia sẻ danh sách; quản lý góp ý; nhận thông báo; tham gia/rời lớp; sửa hồ sơ và phương thức đăng nhập. |
| **Người xem link chia sẻ** *(thường là phụ huynh/thầy cô)* | Xem danh sách được chủ sở hữu cho phép và gửi góp ý, không cần tài khoản. Đây là actor đúng hơn “Phụ huynh”, vì server không kiểm tra vai trò người xem. |
| **Người trả lời thuộc trường** | Người dùng đăng nhập, email đã xác thực và khớp tên miền website của trường liên quan; được gửi câu trả lời hỏi đáp để chờ duyệt. Không bắt buộc `role = school`. |
| **Giáo viên đã xác minh** | `role = teacher` và `teacherVerificationStatus = verified`; tạo/xóa lớp, xem bảng tiến độ, nhắc cả lớp hoặc một thành viên. |
| **Cán bộ tuyển sinh đã được duyệt** | Email công vụ khớp tên miền trường và `schoolStaff.status = approved`; xác nhận dữ liệu trường hoặc gửi bản sửa có minh chứng. |
| **Kiểm duyệt viên** | Tài khoản có cờ `moderator`; chỉ có luồng kiểm duyệt hỏi đáp thông qua `requireStaff`. |
| **Quản trị viên** | Quản trị danh mục, số liệu, nhập dữ liệu, tài khoản, quy tắc gợi ý, lịch, chatbot, thống kê, email và duyệt đề xuất của trường. |
| **Bộ lập lịch Cron** | Gọi job nhắc hạn và kiểm tra xét tuyển bổ sung bằng `CRON_SECRET`. |
| **Google OAuth** | Hệ thống ngoài hỗ trợ đăng nhập/liên kết tài khoản Google. |
| **Dịch vụ email** | Gửi OTP, link đặt lại mật khẩu, email nhắc hạn/thông báo khi được cấu hình. |

Lưu ý khi vẽ kế thừa actor:

- **Người dùng đã đăng nhập** là actor tổng quát của **Giáo viên đã xác minh** và **Cán bộ tuyển sinh đã được duyệt**.
- **Kiểm duyệt viên** và **Quản trị viên** là đặc quyền bằng cờ tài khoản, không phải giá trị trong `UserRole`.
- `UserRole` có `student | parent | teacher | school`, nhưng mã hiện tại không có luồng riêng chỉ dành cho `parent`; không nên tạo một cụm use case phụ huynh ngoài actor xem link chia sẻ.

Bằng chứng: `src/domain/types.ts`, `src/lib/auth.ts`, `src/services/community.service.ts`, `src/services/class.service.ts`, `src/services/school-portal.service.ts`.

## 3. Ma trận use case chuẩn để đưa lên sơ đồ

### 3.1. Khách và người dùng phổ thông

| ID | Use case | Actor chính | Cần đăng nhập | Điểm vào |
|---|---|---|---|---|
| UC01 | Đăng ký bằng email | Khách | Không | `/dang-ky`, `POST /api/auth/register` |
| UC02 | Xác thực email/gửi lại OTP | Khách | Không | `/xac-thuc-email`, `POST /api/auth/verify-email`, `/resend` |
| UC03 | Đăng nhập bằng email hoặc Google | Khách, Google OAuth | Không | `/dang-nhap`, `/api/auth/login`, `/api/auth/google` |
| UC04 | Quên/đặt lại mật khẩu | Khách, dịch vụ email | Không | `/quen-mat-khau`, `/api/auth/forgot-password`, `/reset-password` |
| UC05 | Quản lý hồ sơ và cách đăng nhập | Người dùng | Có | `/ho-so`, `/api/account`, `/api/account/password`, `/api/account/google` |
| UC06 | Thu hồi phiên khác/đăng xuất/xóa tài khoản | Người dùng | Có | `/api/account/sessions`, `/api/auth/logout`, `DELETE /api/account` |
| UC07 | Tìm, lọc chương trình | Khách | Không | `/chuong-trinh`, `GET /api/programs` |
| UC08 | Tra cứu trường và ngành | Khách | Không | `/truong`, `/nganh`, API schools/majors |
| UC09 | Xem chi tiết chương trình/trường/ngành | Khách | Không | Các route `[slug]` |
| UC10 | Lưu chương trình | Khách/Người dùng | Không bắt buộc | `/da-luu`, store; đăng nhập để đồng bộ đa thiết bị |
| UC11 | Nhập hồ sơ điểm và tính điểm xét tuyển | Khách/Người dùng | Không | `/diem-cua-toi`, API scoring |
| UC12 | Nhận gợi ý chương trình có giải thích | Khách/Người dùng | Không | `/goi-y`, `POST /api/recommendations` |
| UC13 | Đặt mục tiêu tuyển sinh | Khách/Người dùng | Không | `/muc-tieu`; đồng bộ khi đăng nhập |
| UC14 | Lập và quản lý nguyện vọng dự kiến | Người dùng | Có | `/da-luu` |
| UC15 | Kiểm tra chiến lược/giả lập thay đổi điểm | Người dùng | Có | `/da-luu` |
| UC16 | So sánh chương trình/ma trận quyết định | Khách/Người dùng | Không | `/so-sanh`, `GET /api/decision` |
| UC17 | Tính tổng chi phí học | Khách/Người dùng | Không | `/chi-phi` |
| UC18 | Lập kế hoạch chọn môn lớp 10 | Khách/Người dùng | Không | `/chon-mon` |
| UC19 | Xem kế hoạch B và đợt xét bổ sung | Khách/Người dùng | Không; đăng nhập để tạo thông báo riêng | `/mua-diem`, `/api/supplementary` |
| UC20 | Theo dõi mốc tuyển sinh/đặt nhắc hạn | Khách/Người dùng | Không bắt buộc; email cần tài khoản xác thực | `/moc-tuyen-sinh` |
| UC21 | Làm mini-test phong cách/ghi MBTI tham khảo | Khách/Người dùng | Không | `/trac-nghiem/phong-cach` |
| UC22 | Dùng trợ lý hỏi đáp tuyển sinh | Khách/Người dùng | Không | `POST /api/chat`, `/api/chat/feedback` |
| UC23 | Xem/gửi/đọc thông báo | Người dùng | Có | `/api/notifications`, `/read` |
| UC24 | Làm khảo sát SUS | Khách/Người dùng | Không | `/khao-sat`, `POST /api/survey` |
| UC25 | Dùng bản nhẹ | Khách/Người dùng | Không | `/nhe` |

### 3.2. Chia sẻ, cộng đồng và lớp học

| ID | Use case | Actor chính | Điều kiện |
|---|---|---|---|
| UC26 | Tạo/xem/thu hồi link chia sẻ nguyện vọng | Người dùng | Đăng nhập; link 7 hoặc 30 ngày |
| UC27 | Xem danh sách qua link và gửi góp ý | Người xem link | Link còn hiệu lực; không cần tài khoản |
| UC28 | Xem, đánh dấu đã đọc, xóa góp ý | Người dùng | Là chủ link/danh sách |
| UC29 | Xem hỏi đáp đã duyệt | Khách | Theo chương trình |
| UC30 | Đặt câu hỏi cộng đồng | Khách/Người dùng | Nội dung chuyển sang chờ duyệt |
| UC31 | Trả lời câu hỏi | Người trả lời thuộc trường | Đăng nhập, email xác thực và đúng tên miền trường |
| UC32 | Đánh dấu hữu ích/báo cáo câu trả lời | Người dùng | Đăng nhập; không tự bình chọn bài mình |
| UC33 | Kiểm duyệt câu hỏi/câu trả lời | Kiểm duyệt viên/Quản trị viên | `requireStaff` |
| UC34 | Tham gia/rời lớp bằng mã | Người dùng | Đăng nhập; UI dành cho vai trò không phải giáo viên |
| UC35 | Tạo và quản lý lớp | Giáo viên đã xác minh | Role và trạng thái xác minh đều hợp lệ |
| UC36 | Xem tiến độ và gửi lời nhắc | Giáo viên đã xác minh | Là chủ lớp |

### 3.3. Cổng trường và quản trị

| ID | Use case | Actor chính | Điểm vào |
|---|---|---|---|
| UC37 | Đăng ký quyền cán bộ tuyển sinh | Người dùng có email trường | `/cong-truong`, `POST /api/school-portal` |
| UC38 | Duyệt/từ chối quyền cán bộ tuyển sinh | Quản trị viên | `/quan-tri/nguoi-dung` |
| UC39 | Xem dashboard dữ liệu trường | Cán bộ tuyển sinh đã duyệt | `/cong-truong` |
| UC40 | Xác nhận số liệu của trường | Cán bộ tuyển sinh đã duyệt | `action = confirm` |
| UC41 | Gửi đề xuất sửa số liệu có minh chứng | Cán bộ tuyển sinh đã duyệt | `action = submit` |
| UC42 | Duyệt/từ chối đề xuất của trường | Quản trị viên | `/api/admin/school-submissions/[id]` |
| UC43 | Xem tổng quan và chất lượng dữ liệu | Quản trị viên | `/quan-tri` |
| UC44 | Quản lý trường/ngành/chương trình | Quản trị viên | `/quan-tri/truong`, `/nganh`, `/chuong-trinh` |
| UC45 | Sửa/xác minh/khôi phục số liệu chương trình | Quản trị viên | `/quan-tri/chuong-trinh/[id]` |
| UC46 | Nhập CSV/XLSX và xuất bản dữ liệu | Quản trị viên | `/quan-tri/nhap-du-lieu`, `/api/admin/import` |
| UC47 | Nhập nhanh/sửa nhanh điểm và học phí | Quản trị viên | `/api/admin/unified-entry` |
| UC48 | Quản lý điểm, học phí và nguồn | Quản trị viên | `/quan-tri/diem-hoc-phi`, `/api/admin/scores` |
| UC49 | Quản lý người dùng và phân quyền | Quản trị viên | `/quan-tri/nguoi-dung` |
| UC50 | Cấu hình/chạy thử quy tắc gợi ý | Quản trị viên | `/quan-tri/quy-tac-goi-y` |
| UC51 | Quản lý lịch tuyển sinh | Quản trị viên | `/quan-tri/moc-tuyen-sinh` |
| UC52 | Giám sát chatbot và từ khóa | Quản trị viên | `/quan-tri/chatbot` |
| UC53 | Xem thống kê, SUS và xuất CSV | Quản trị viên | `/quan-tri/thong-ke` |
| UC54 | Gửi email khách hàng | Quản trị viên | `/quan-tri/email-khach-hang` |
| UC55 | Chạy job nhắc hạn/xét tuyển bổ sung | Cron | `/api/cron/reminders` |

## 4. Luồng xác thực và dữ liệu tài khoản

### 4.1. Đăng ký bằng email — UC01, UC02

**Tiền điều kiện:** email chưa bị chiếm theo quy tắc của service; dữ liệu đầu vào hợp lệ.

**Luồng chính:**

1. Khách nhập email, mật khẩu và tên gọi không bắt buộc.
2. API giới hạn kích thước body và tần suất, kiểm tra quy tắc mật khẩu.
3. Service tạo tài khoản, băm mật khẩu bằng scrypt và tạo OTP email.
4. Người dùng nhập OTP tại trang xác thực.
5. OTP đúng, còn hạn và chưa dùng thì email được đánh dấu xác thực; hệ thống gắn phiên đăng nhập.

**Ngoại lệ:** OTP sai/quá số lần/hết hạn; đăng ký trùng; tài khoản khóa. Production gửi OTP qua email, còn chế độ demo có hành vi riêng được kiểm soát bằng cấu hình.

**Dữ liệu thay đổi:** user, password hash, verification token/attempt, session cookie.

**Bằng chứng:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/verify-email/route.ts`, `src/services/auth.service.ts`, `src/services/password.hash.ts`.

### 4.2. Đăng nhập và khôi phục tài khoản — UC03, UC04

1. Email/mật khẩu: xác thực thông tin, tăng bộ đếm lỗi; 5 lần sai có thể khóa tài khoản.
2. Google: tạo `state` có chữ ký chống CSRF, chuyển sang Google, callback kiểm tra state rồi tạo/liên kết tài khoản cùng email.
3. Quên mật khẩu: tạo token; production gửi link qua email.
4. Đặt lại mật khẩu thành công sẽ đổi mật khẩu và làm mất hiệu lực các phiên cũ thông qua `sessionVersion`.
5. Đăng nhập thành công đặt cookie phiên `httpOnly`, `SameSite=Lax`, có chữ ký.

**Bằng chứng:** `src/lib/auth.ts`, `src/services/auth.service.ts`, `src/services/google-oauth.service.ts`, các route trong `src/app/api/auth/`.

### 4.3. Hồ sơ, đồng bộ và xóa tài khoản — UC05, UC06

1. Người dùng xem/sửa tên, vai trò, năm tốt nghiệp, tỉnh, trạng thái dưới 16 tuổi/đồng ý của phụ huynh, onboarding và nhắc email.
2. Có thể tạo/đổi mật khẩu, liên kết hoặc gỡ Google nhưng phải duy trì ít nhất một cách đăng nhập.
3. Có thể thu hồi các phiên khác; hệ thống tăng phiên bản phiên rồi cấp lại phiên hiện tại.
4. Khi đăng nhập, dữ liệu khách được gộp vào dữ liệu máy chủ: hợp nhất danh sách, giữ ghi chú tài khoản nếu đã có, chọn hồ sơ/mục tiêu/phong cách mới hơn.
5. Xóa tài khoản qua `DELETE /api/account`, sau đó xóa cookie phiên.

**Quy tắc dữ liệu:** tối đa 200 mục đã lưu, 15 nguyện vọng, 50 mốc nhắc; chỉ giữ ID chương trình còn tồn tại.

**Bằng chứng:** `src/controllers/account.controller.ts`, `src/services/user-data.service.ts`, `src/stores/trovio-store.tsx`, `src/app/api/account/`.

## 5. Luồng tra cứu, điểm và ra quyết định

### 5.1. Khám phá danh mục — UC07–UC10

1. Khách tìm chương trình theo từ khóa và các bộ lọc phương thức, điểm, tổ hợp, học phí, vùng, loại trường, nhóm/ngành; server phân trang/sắp xếp.
2. Khách duyệt danh sách trường, ngành và mở trang chi tiết.
3. Chi tiết chương trình hiển thị dữ liệu chương trình, trường/ngành liên quan, điểm chuẩn, học phí, phương thức/tổ hợp và các khối hỗ trợ có dữ liệu.
4. Người dùng có thể lưu chương trình. Khách lưu tại trình duyệt; người đăng nhập tự đồng bộ với tài khoản.
5. Danh mục bị quản trị ẩn không được coi là mục công khai đang hoạt động.

**Bằng chứng:** `src/services/program.service.ts`, `src/services/catalog.service.ts`, `src/services/program.filters.ts`, `src/app/api/programs/`, `src/app/api/schools/`, `src/app/api/majors/`.

### 5.2. Nhập điểm và tính điểm — UC11

1. Người dùng chọn phương thức xét tuyển, nhập điểm môn/chứng chỉ, khu vực/đối tượng và tổ hợp liên quan.
2. Server kiểm tra khoảng điểm theo thang của phương thức.
3. Hệ thống tính tổng, điểm ưu tiên theo quy chế; phần ưu tiên giảm khi tổng đạt ngưỡng 22,5 và được quy đổi theo thang phương thức.
4. Nếu quy đổi chứng chỉ, bắt buộc có trường/chương trình để lấy chính sách riêng; không dùng một bảng quy đổi toàn cục.
5. Với tổ hợp có môn chính, hệ thống hỗ trợ thang 30/40; tie-breaker được đánh giá qua endpoint riêng.
6. Hồ sơ hợp lệ được giữ ở store và đồng bộ nếu đã đăng nhập.

**Kết quả:** hồ sơ điểm dùng cho gợi ý, đánh giá mức An toàn/Vừa sức/Thử sức và kế hoạch B; đây không phải cam kết trúng tuyển.

**Bằng chứng:** `src/controllers/scoring.controller.ts`, `src/services/scoring.service.ts`, `src/services/certificate-policy.service.ts`, `src/services/admission-policy.service.ts`, `src/components/score/score-wizard.tsx`.

### 5.3. Gợi ý và mục tiêu — UC12, UC13

1. Người dùng có thể đặt mục tiêu bằng 4 nhóm thông tin: ngành, phương thức/tổ hợp, điểm mục tiêu, vùng và ngân sách.
2. API gợi ý nhận hồ sơ điểm, ngân sách, vùng, nhóm/ngành quan tâm, ngành mục tiêu và trọng tâm; giới hạn tối đa 12 kết quả.
3. Service lọc theo ngân sách/phạm vi, chấm theo các tiêu chí có dữ liệu và sắp xếp kết quả.
4. Trọng số mặc định trong service: sở thích 45%, độ phù hợp điểm 35%, vị trí 10%, nhóm ngành 10%; chế độ trọng tâm có thể thay đổi trọng số.
5. Tiêu chí thiếu dữ liệu được bỏ khỏi phép chấm thay vì tự gán dữ liệu giả. Độ phù hợp theo điểm cần đủ lịch sử điểm chuẩn; service dùng ngưỡng tối thiểu 3 năm.
6. Kết quả trả lý do, mức khớp mục tiêu và cảnh báo; học phí là điều kiện lọc chứ không phải điểm cộng mặc định.

**Chú ý:** phần RIASEC lõi hiện không tạo được dữ liệu mới qua page/API, xem mục 12. Gợi ý vẫn hoạt động với các tiêu chí còn lại.

**Bằng chứng:** `src/services/recommendation.service.ts`, `src/controllers/recommendation.controller.ts`, `src/services/goal.ts`, `src/app/api/recommendations/route.ts`.

### 5.4. Nguyện vọng, chiến lược và chia sẻ — UC14, UC15, UC26–UC28

1. Người dùng đăng nhập thêm tối đa 15 chương trình vào nguyện vọng; chương trình trong nguyện vọng đồng thời nằm trong danh sách đã lưu.
2. Người dùng sắp xếp, ghi chú, xóa và in danh sách.
3. Bộ kiểm tra cảnh báo các trường hợp có trong code: thiếu lựa chọn An toàn; thứ tự chưa hợp lý; tổ hợp/phương thức không được chấp nhận; vượt ngân sách; biến động điểm; tỷ lệ quá rủi ro/quá an toàn; quá ít lựa chọn; ràng buộc ngành sư phạm.
4. Công cụ “nếu điểm thay đổi” mô phỏng chênh lệch và chỉ ra chương trình đổi mức phù hợp.
5. Người dùng tạo link 7 hoặc 30 ngày, chọn có hiện ghi chú/điểm hay không. Tạo link mới thu hồi link cũ.
6. Người xem link không cần đăng nhập, chỉ thấy tên ngắn và phần chủ sở hữu cho phép; có thể gửi góp ý cho toàn danh sách hoặc một chương trình trong danh sách.
7. Chủ danh sách xem, đánh dấu đã đọc, xóa góp ý hoặc thu hồi link.

**Quy tắc an toàn:** ID link ngẫu nhiên 144 bit; tối đa 30 góp ý/link; rate limit và honeypot; không công khai email chủ sở hữu.

**Bằng chứng:** `src/services/wishlist-strategy.ts`, `src/services/share.service.ts`, `src/components/program/saved-view.tsx`, các route `src/app/api/account/share/` và `src/app/api/share/[id]/comments/route.ts`.

### 5.5. So sánh, chi phí, chọn môn và kế hoạch B — UC16–UC19

**So sánh:** store giới hạn 3 chương trình cho bảng so sánh. Ma trận quyết định có thể dùng tối đa 6 ID từ danh sách so sánh/nguyện vọng, chấm các tiêu chí sở thích, tuyển sinh, học phí, khoảng cách bằng trọng số do người dùng điều chỉnh và có phân tích độ nhạy.

**Chi phí:** tính học phí, số năm, mức tăng, học bổng/giảm trừ, sinh hoạt và chi phí một lần. Các giả định nhập ở trang chi phí không gửi lên máy chủ.

**Chọn môn lớp 10:** yêu cầu đúng 4 môn lựa chọn; xác định tổ hợp/ngành còn mở hoặc bị khóa, gợi ý đổi một môn, hoặc đi ngược từ ngành mục tiêu ra bộ môn phù hợp.

**Kế hoạch B:** đánh giá lại nguyện vọng bằng điểm thực, tổ hợp và phương thức; đề xuất lựa chọn An toàn/Vừa sức và các đợt xét bổ sung đang mở. Người đăng nhập có thể yêu cầu tạo thông báo phù hợp; production dùng ngày thực, ngày mô phỏng chỉ có ở demo.

**Bằng chứng:** `src/services/decision.ts`, `src/lib/cost.ts`, `src/services/grade10.ts`, `src/services/plan-b.ts`, `src/services/supplementary.service.ts`.

## 6. Mốc tuyển sinh, thông báo và chatbot

### 6.1. Mốc và nhắc hạn — UC20, UC23, UC55

1. Người dùng xem lịch theo mùa, trạng thái lịch chính thức và nguồn.
2. Người dùng bật/tắt nhắc cho từng mốc; dữ liệu được đồng bộ nếu đăng nhập.
3. Người dùng có thể thêm mốc vào lịch điện thoại/Google Calendar từ giao diện.
4. Cron xác thực `Authorization: Bearer <CRON_SECRET>` bằng so khớp an toàn.
5. Job gửi nhắc trước 7 ngày và 1 ngày cho tài khoản đã xác thực, không bị khóa, bật email và đang theo dõi mốc; nhật ký chống gửi trùng.
6. Cùng job kiểm tra các đợt xét bổ sung phù hợp và tạo thông báo một lần cho mỗi đợt/người.
7. Người dùng đọc/đánh dấu thông báo; href thông báo chỉ chấp nhận đường dẫn nội bộ an toàn.

**Bằng chứng:** `src/services/timeline.service.ts`, `src/services/reminder.service.ts`, `src/services/supplementary.service.ts`, `src/services/notification.service.ts`, `src/app/api/cron/reminders/route.ts`.

### 6.2. Trợ lý tuyển sinh — UC22

1. Khách gửi câu hỏi cùng ngữ cảnh đã được giới hạn: ngành, trường, dữ liệu sở thích nếu có và trang đang xem.
2. Server giới hạn body 8 KB, 20 câu/phút và 300 câu/ngày theo IP.
3. Service nhận diện thực thể/ý định rồi truy xuất trường, ngành, chương trình, điểm, học phí, tổ hợp, phương thức và timeline từ repository.
4. Hệ thống từ chối yêu cầu gian lận, dự đoán điểm chuẩn hoặc cam kết đỗ; thiếu dữ liệu thì trả “chưa có thông tin”.
5. Câu trả lời kèm nguồn/link kiểm tra. Lớp LLM nếu bật chỉ diễn đạt lại dữ kiện; vi phạm kiểm tra số/link/độ dài hoặc timeout thì quay về câu gốc.
6. Người dùng có thể gửi đánh giá; quản trị xem thống kê và mục cần rà soát.

**Bằng chứng:** `src/controllers/chatbot.controller.ts`, `src/services/chatbot.service.ts`, `src/services/chatbot-llm.ts`, `src/app/api/chat/`.

## 7. Cộng đồng hỏi đáp — UC29–UC33

1. Khách xem các câu hỏi/câu trả lời đã duyệt của một chương trình; người đăng nhập còn thấy nội dung của mình đang chờ.
2. Khách hoặc người dùng gửi câu hỏi; nội dung được làm sạch/che thông tin nhận diện và ở trạng thái `pending`.
3. Chỉ tài khoản đã đăng nhập, đã xác thực email, không bị khóa và email khớp tên miền website của trường thuộc chương trình mới được gửi câu trả lời.
4. Câu trả lời cũng ở trạng thái chờ duyệt.
5. Người đăng nhập có thể bật/tắt “hữu ích” hoặc báo cáo; tác giả không tự bình chọn, một người không báo cáo trùng.
6. Khi số báo cáo đạt ngưỡng trong service, câu trả lời quay về `pending` để ẩn và kiểm duyệt lại.
7. Kiểm duyệt viên hoặc admin duyệt/từ chối; mọi quyết định được audit. Câu trả lời được duyệt tạo thông báo cho người hỏi nếu xác định được tài khoản.

**Bằng chứng:** `src/controllers/community.controller.ts`, `src/services/community.service.ts`, `src/app/api/qa/`, `src/app/api/admin/qa/route.ts`.

## 8. Kênh giáo viên — UC34–UC36

### 8.1. Tham gia/rời lớp

1. Người dùng đăng nhập nhập mã 6 ký tự.
2. Service kiểm tra lớp tồn tại, mã chưa thu hồi/chưa hết hạn, người tham gia không phải giáo viên sở hữu lớp và lớp chưa đủ 80 thành viên.
3. Khi tham gia lần đầu, hệ thống tạo quyền chia sẻ mặc định và ghi audit.
4. Người dùng xem các lớp đã tham gia và có thể rời lớp; rời lớp xóa consent của thành viên.

**Ranh giới thực tế:** route không ép `role = student`, nhưng giao diện chỉ hiện form tham gia cho tài khoản có role khác `teacher`.

### 8.2. Giáo viên quản lý lớp

1. Chỉ `role = teacher` và `teacherVerificationStatus = verified` được tạo lớp.
2. Service tạo mã 6 ký tự có hạn; giới hạn số lớp được repository áp dụng.
3. Giáo viên xem dashboard lớp mình. Service chỉ đưa dữ liệu theo consent: tên hoặc ẩn danh, tiến độ, RIASEC/nguyện vọng/tham vấn nếu từng cờ cho phép; mỗi lần truy cập dashboard được audit.
4. Giáo viên nhắc cả lớp với cooldown 6 giờ hoặc nhắc riêng một thành viên với cooldown 24 giờ; hệ thống tạo thông báo trong ứng dụng.
5. Giáo viên có thể xóa lớp.

**Bằng chứng:** `src/services/class.service.ts`, `src/components/class/`, `src/app/api/classes/`.

## 9. Cổng trường — UC37–UC42

1. Người dùng phải xác thực email; service đối chiếu domain email với website trường và cho gửi yêu cầu quyền cán bộ tuyển sinh.
2. Yêu cầu chuyển sang `pending`, đồng thời thông báo cho admin.
3. Admin duyệt hoặc từ chối tại quản lý người dùng. Chỉ trạng thái `approved` mới vào dashboard của đúng trường.
4. Cán bộ xem các chương trình của trường và tiến độ xác nhận 4 nhóm: tổ hợp, học phí, điểm chuẩn, chỉ tiêu.
5. Nếu dữ liệu đúng, cán bộ xác nhận từng nhóm hoặc tất cả. Đủ 4 nhóm thì chương trình được ghi ngày/nội dung “Trường đã xác nhận”.
6. Nếu dữ liệu sai, cán bộ gửi giá trị đề xuất, ghi chú và bắt buộc URL minh chứng `https`. Một trường dữ liệu không được có hai đề xuất pending; mỗi cán bộ bị giới hạn số đề xuất chờ.
7. Admin duyệt thì service ghi override chương trình, đánh dấu trường dữ liệu đã xác nhận và audit. Từ chối bắt buộc ghi lý do.
8. Kết quả tạo thông báo và email cho cán bộ gửi đề xuất.

**Bằng chứng:** `src/services/school-portal.service.ts`, `src/app/api/school-portal/route.ts`, `src/app/api/admin/school-submissions/[id]/route.ts`, `src/services/user-admin.service.ts`.

## 10. Quản trị và vận hành — UC43–UC55

### 10.1. Danh mục và số liệu

- Admin tạo/sửa trường, ngành, chương trình; thao tác xóa danh mục thực tế là **ẩn/hiện**, không xóa cứng.
- Admin sửa chương trình, đánh dấu đã kiểm tra, đặt/gỡ xác nhận của trường có ghi chú hoặc khôi phục dữ liệu gốc.
- Bảng tổng hợp cho phép lọc thiếu điểm/thiếu học phí/đủ dữ liệu, nhập bản ghi tích hợp và sửa nhanh điểm/học phí.
- Màn điểm/học phí cho phép xuất CSV, xác minh hàng loạt, lưu nguồn và xóa dữ liệu một năm.
- Các thay đổi quan trọng được ghi audit.

**Bằng chứng:** `src/services/catalog-admin.service.ts`, `src/services/admin.service.ts`, `src/services/unified-entry.service.ts`, `src/services/data-ops.service.ts`, các route `src/app/api/admin/catalog`, `programs`, `unified-entry`, `scores`.

### 10.2. Nhập CSV/XLSX

1. Admin tải mẫu CSV đơn giản/đầy đủ hoặc XLSX.
2. Admin tải nội dung lên để `preview`; giao diện và route đều đặt ngưỡng 10 MB, trong đó route áp ngưỡng trên toàn bộ JSON body.
3. Service phân tích dòng, chuẩn hóa và trả lỗi/cảnh báo.
4. Admin có thể `revalidate` sau khi sửa dữ liệu trên màn hình.
5. Chỉ bước `publish` mới ghi vào PostgreSQL và tạo batch/audit; preview không xuất bản.

**Bằng chứng:** `src/app/api/admin/import/route.ts`, `src/services/import.service.ts`.

### 10.3. Người dùng và quyền

- Admin tạo tài khoản và gửi link đặt mật khẩu.
- Admin xem chi tiết, khóa/mở khóa, xóa có xác nhận email, bật/tắt quyền moderator, duyệt/từ chối cán bộ tuyển sinh và gửi lại lời mời.
- Các route đều dùng `requireAdmin`; riêng hàng chờ hỏi đáp dùng `requireStaff` để moderator được thao tác.

**Bằng chứng:** `src/services/user-admin.service.ts`, `src/app/api/admin/users/`, `src/lib/auth.ts`.

### 10.4. Quy tắc, lịch, chatbot, thống kê và email

- **Quy tắc gợi ý:** lưu trọng số, tạo/sửa/bật/tắt quy tắc và chạy mô phỏng trước khi áp dụng.
- **Lịch:** lưu mùa 4 chữ số và 1–40 sự kiện hợp lệ; đánh dấu chính thức bắt buộc nguồn HTTPS; có thể reset.
- **Chatbot:** quản lý alias ngành/trường và xem thống kê/feedback.
- **Thống kê:** xem funnel ẩn danh và SUS, xuất CSV. Event chỉ giữ ngày, tên sự kiện, mã ẩn danh; client tôn trọng DNT/GPC.
- **Email khách hàng:** admin chọn và gửi tới danh sách người nhận theo giới hạn của service/route.
- **Nhắc thủ công:** admin có endpoint vận hành nhắc hạn; job tự động vẫn thuộc actor Cron.

**Bằng chứng:** `src/services/rules.service.ts`, `src/services/timeline.service.ts`, `src/services/analytics.service.ts`, `src/services/lead-email.service.ts`, các page/route tương ứng trong `src/app/(admin)` và `src/app/api/admin`.

## 11. Quan hệ UML nên dùng khi vẽ

Chỉ dùng các quan hệ dưới đây; không nối mọi use case với nhau.

### 11.1. Generalization actor

- Giáo viên đã xác minh —|> Người dùng đã đăng nhập.
- Cán bộ tuyển sinh đã duyệt —|> Người dùng đã đăng nhập.
- Quản trị viên và Kiểm duyệt viên nên vẽ độc lập vì quyền đến từ cờ `admin`/`moderator`, không phải kế thừa role nghiệp vụ trong code.

### 11.2. `<<include>>` chỉ dùng nếu tách các xử lý con thành use case

- **UC36 Xem tiến độ lớp** `include` **Lọc dữ liệu theo consent** và **Ghi audit truy cập**.
- **UC41 Gửi bản sửa** `include` **Kiểm tra quyền sở hữu chương trình** và **Kiểm tra minh chứng HTTPS**.
- **UC42 Duyệt bản sửa** `include` **Cập nhật override**, **Ghi audit** và **Thông báo kết quả**.
- **UC46 Xuất bản dữ liệu nhập** `include` **Kiểm tra lại dữ liệu nhập**.
- **UC55 Job định kỳ** `include` **Gửi nhắc mốc** và **Kiểm tra xét tuyển bổ sung**.

Các bước đăng nhập, kiểm tra role/trạng thái xác minh, đối chiếu domain và kiểm tra quyền admin là **tiền điều kiện/ràng buộc**, không phải use case mục tiêu độc lập. Không nối chúng bằng `include` tới mọi chức năng. UC01 Đăng ký và UC02 Xác thực email là hai use case nối tiếp trong vòng đời tài khoản; mã nguồn không bắt buộc thao tác nhập OTP xảy ra ngay bên trong request đăng ký nên không dùng `include` giữa hai use case này.

### 11.3. `<<extend>>` tùy chọn/điều kiện

- Đăng nhập Google `extend` UC03 Đăng nhập.
- Lưu và đồng bộ đa thiết bị `extend` UC10 Lưu chương trình khi actor đã đăng nhập.
- UC15 Kiểm tra chiến lược `extend` UC14 Quản lý nguyện vọng.
- UC26 Chia sẻ danh sách `extend` UC14 Quản lý nguyện vọng.
- UC27 Gửi góp ý `extend` Xem danh sách qua link.
- UC19 Tạo thông báo xét bổ sung `extend` Xem đợt xét bổ sung khi người dùng đăng nhập.
- Gửi email nhắc `extend` UC20 khi tài khoản đã xác thực và bật nhắc email.
- Lớp LLM diễn đạt lại `extend` UC22 khi có cấu hình; không phải actor/use case chính.

## 12. Phần không được vẽ như chức năng hoàn chỉnh

Đây là các chênh lệch tìm thấy khi đối chiếu README với cây route và service hiện tại:

1. **Trắc nghiệm RIASEC lõi chưa có điểm vào hoạt động.** Không có các page `/trac-nghiem`, `/lam-bai`, `/ket-qua` và không có `/api/quiz/questions`, `/api/quiz/result`, `/api/quiz/recommend` trong cây `src/app`. `scoreAnswers()` ở `src/services/riasec.service.ts` trả `null`; `sanitizeUserData()` đặt `quiz` thành `null`. Vì vậy không vẽ “Làm trắc nghiệm RIASEC” là use case đã hoàn chỉnh. Chỉ mini-test phong cách `/trac-nghiem/phong-cach` đang có page.
2. **Liên kết mini-test → gợi ý theo quiz bị thiếu API.** `src/components/work-style/work-style-view.tsx` gọi `/api/quiz/recommend`, nhưng route này không tồn tại. Mini-test vẫn chấm/lưu phong cách cục bộ; phần đề xuất dựa trên endpoint đó không được coi là hoàn chỉnh.
3. **Xác minh giáo viên chưa có UI/API vòng đời.** `src/services/teacher-verification.service.ts` và repository tồn tại, nhưng không có route/page gọi service. Có thể vẽ “Giáo viên đã xác minh” như tiền điều kiện/actor của lớp học, không vẽ “Gửi hồ sơ xác minh giáo viên” là chức năng đang dùng.
4. **Quản lý consent chi tiết của lớp chưa được expose.** Service có `updateConsent`, `revokeConsent`, `getConsent`, `revokeCode`, nhưng route/UI hiện chỉ hỗ trợ tham gia, rời lớp, tạo/xóa lớp, xem dashboard và nhắc. Không tách các hàm service nội bộ này thành use case người dùng.
5. **Vai trò phụ huynh chưa có cổng riêng.** Giá trị role tồn tại, nhưng nghiệp vụ phụ huynh đang được hiện thực bằng link chia sẻ công khai; không gán thêm quyền đặc biệt cho `role = parent`.
6. **Không coi README là bằng chứng đủ cho endpoint.** Ví dụ các endpoint quiz và một số mô tả cũ có trong README nhưng không có route hiện hành; sơ đồ phải theo danh sách ở mục 3.

## 13. Gợi ý bố cục sơ đồ một trang, ít rối

Để vẽ một trang dễ đọc, chia biên Trovio thành 5 cụm dọc, không nối chéo giữa các use case nếu không có `include/extend` ở mục 11:

1. **Tài khoản:** UC01–UC06.
2. **Khám phá và ra quyết định:** UC07–UC25.
3. **Chia sẻ, cộng đồng, lớp học:** UC26–UC36.
4. **Cổng trường:** UC37–UC42.
5. **Quản trị và vận hành:** UC43–UC55.

Đặt actor **Khách/Người dùng** bên trái; **người xem link, người trả lời thuộc trường, giáo viên, cán bộ tuyển sinh** sát cụm tương ứng; **moderator, admin, Cron, Google OAuth, email** bên phải. Không đưa database thành actor vì PostgreSQL nằm bên trong biên kỹ thuật của hệ thống, không phải tác nhân nghiệp vụ.

## 14. Checklist kiểm tra sơ đồ sau khi vẽ

- [ ] Không có RIASEC lõi như một chức năng hoàn chỉnh; chỉ có mini-test phong cách.
- [ ] Nguyện vọng, chia sẻ, thông báo cá nhân và quản lý hồ sơ có ràng buộc đăng nhập.
- [ ] Lưu chương trình, nhập điểm, gợi ý, so sánh, chi phí và chọn môn vẫn dùng được ở chế độ khách theo phạm vi giao diện.
- [ ] Actor trả lời hỏi đáp là email xác thực đúng domain trường, không tự động đồng nghĩa cán bộ tuyển sinh.
- [ ] Giáo viên tạo/xem lớp phải vừa đúng role vừa có trạng thái `verified`.
- [ ] Cán bộ tuyển sinh chỉ thao tác dữ liệu của trường đã được admin duyệt.
- [ ] Moderator chỉ nối vào kiểm duyệt hỏi đáp; admin nối vào toàn bộ nghiệp vụ quản trị.
- [ ] Link chia sẻ có actor công khai riêng; không bắt buộc người xem đăng nhập.
- [ ] Cron, Google OAuth và dịch vụ email nằm ngoài biên hệ thống.
- [ ] Chỉ vẽ quan hệ `include/extend` đã liệt kê, tránh nối tất cả use case thành mạng rối.

---

### Tệp mã trọng yếu đã dùng để đối chiếu

- Route/page: `src/app/**/page.tsx`, `src/app/api/**/route.ts`
- Quyền và phiên: `src/lib/auth.ts`, `src/services/auth.service.ts`, `src/services/session.service.ts`
- Catalog/điểm/gợi ý: `src/services/catalog.service.ts`, `program.service.ts`, `scoring.service.ts`, `recommendation.service.ts`
- Dữ liệu người dùng: `src/stores/trovio-store.tsx`, `src/services/user-data.service.ts`
- Nguyện vọng/chia sẻ: `src/services/wishlist-strategy.ts`, `src/services/share.service.ts`
- Cộng đồng/lớp/cổng trường: `src/services/community.service.ts`, `class.service.ts`, `school-portal.service.ts`
- Vận hành/admin: `src/services/admin.service.ts`, `catalog-admin.service.ts`, `import.service.ts`, `data-ops.service.ts`, `user-admin.service.ts`, `rules.service.ts`, `timeline.service.ts`
- Repository dữ liệu: `src/repositories/index.ts`, `src/repositories/postgres*.ts`
