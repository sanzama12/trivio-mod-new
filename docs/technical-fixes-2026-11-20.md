# Sửa lỗi kỹ thuật — 20/11/2026

Phạm vi: sửa các vấn đề kỹ thuật trong báo cáo rà soát, giữ nguyên quy tắc nghiệp vụ. Không triển khai 5 chức năng doanh nghiệp đề xuất.

## Đã sửa

| Nhóm trong báo cáo | Thay đổi |
|---|---|
| F01 — dependency | Next 16.4.6, React/React DOM 19.3.1; cập nhật source-map-js; override gRPC 1.14.7 và uuid 11.1.1 tương thích CommonJS của ExcelJS. Không hạ Firebase/ExcelJS theo `audit fix --force`. Audit hiện không có cảnh báo. |
| F02 — body JSON | Đọc stream theo byte, hủy reader ngay khi vượt trần, không chờ toàn bộ request vào RAM. |
| F03 — rate limit | API async; cập nhật mọi call site, chạy các giới hạn độc lập song song. Production dùng PostgreSQL chung giữa các instance, thao tác nguyên tử trong transaction, key được hash và dọn dữ liệu hết hạn theo lô. Development vẫn dùng memory. Ngưỡng giới hạn hiện có giữ nguyên. |
| F04 — TLS | Xác thực certificate cho database từ xa, loại tham số SSL trong URL có thể ghi đè cấu hình kiểm tra; hỗ trợ CA riêng qua `PG_SSL_CA`. Database localhost không bị buộc dùng TLS. |
| F05 — đồng bộ tài khoản | Compare-and-swap bằng `updatedAt`, tăng phiên bản đơn điệu dưới khóa transaction. API trả 409 khi bản cũ, 428 khi thiếu phiên bản. Client nối hàng đợi gửi tuần tự, giữ bản pending đến khi xác nhận, retry khi mạng trở lại và báo xung đột. Merge đăng nhập dùng CAS/retry, giữ thuật toán gộp cũ. |
| F06 — lịch sử chatbot | Ghi nối nguyên tử vào document hiện tại; bỏ cắt 40 tin khi lưu. Gửi đồng thời không còn ghi đè snapshot của nhau. Giữ giới hạn ngữ cảnh gửi model riêng. Tổng lượt hỏi theo user đếm tin role=user thay vì lấy số tin chia hai. |
| F08 — CI | Chạy `npm run check` gồm cả TypeScript ứng dụng/database, test và secret scan trước build. |
| F09 — secret/config | Dùng một chính sách secret từ 32 ký tự cho phiên và reset-password. Production kiểm tra cấu hình trong instrumentation trước khi sẵn sàng nhận request; không dùng khóa ngẫu nhiên theo từng process nữa. |
| F10 — truy vấn | Quản trị user lọc, phân trang, đếm thống kê trong SQL; tìm không dấu giữ nguyên. Usage report chỉ lấy tên các ID trong top, không tải toàn catalog/program để đặt tên. |
| F11 — ranh giới lớp | Những trang/route đã nêu chuyển truy cập repository qua service; trang lịch sử chỉ nhận thông tin user cần hiển thị. README thêm trạng thái hiện tại để phân biệt mô tả lịch sử. |
| F12 — vận hành AI và đọc lịch sử | Ngân sách AI chung 30 giây trong luồng chat; retry chỉ khi còn thời gian. Telemetry kỹ thuật ghi status/token (nếu provider cung cấp)/thời gian, không ghi prompt hay câu trả lời. Admin mở trang lịch sử được audit ai truy cập tài khoản nào, không lưu nội dung hội thoại vào audit. |
| Giao diện chatbot | Xóa hội thoại và gửi feedback thất bại không còn bị coi là thành công. |

Không cần thay schema hoặc chạy migration cho các sửa này; sử dụng bảng document hiện có. Lịch sử vẫn nằm trong JSON document, nhưng append thực hiện nguyên tử ở PostgreSQL, không còn đọc–ghép–ghi toàn bộ từ service. Nếu dữ liệu lớn cần chuyển message sang bảng riêng để giảm chi phí JSON và phân trang sâu; đó là tối ưu lưu trữ tiếp theo.

## Giữ nguyên theo yêu cầu nghiệp vụ

- F07: không đổi taxonomy chủ đề, công thức thống kê, cửa sổ 500 log hoặc diễn giải lượt hỏi thành số người. Dashboard tiếp tục ghi rõ **lượt hỏi**; không gọi đây là số user phân biệt.
- Công thức/chính sách tuyển sinh, gợi ý, điểm, RIASEC, quota theo tài khoản và xử lý tiền/callback giữ nguyên.
- Không tự quyết định thời hạn xóa hội thoại, quyền tư vấn viên, chia sẻ dữ liệu đối tác hoặc quy trình CRM/SLA. Các phần đó cần quyết định nghiệp vụ.
- Không tự chia lại các component lớn chỉ để giảm số dòng; đã sửa truy vấn cần thiết mà không thiết kế lại luồng sản phẩm.

## Kiểm chứng

- `npm run check`: **120/120 test đạt**, cả hai bộ TypeScript đạt, secret scan đạt; có kiểm thử round-trip Excel sau thay dependency gián tiếp.
- `npm run build`: production build Next 16.4.6 đạt.
- `npm audit --omit=dev`: **0 vulnerabilities** tại thời điểm kiểm tra.
- `npm run verify:hardening`: kiểm tra TLS thật, CAS chặn phiên bản cũ, tăng phiên bản, giữ 101 tin nhắn, tổng kết user, shared limiter; dữ liệu thử được rollback toàn bộ.
- `npm run verify:account-flows`: browser Chromium với hai tài khoản tạm; user thường bị chặn trang admin; hai request lưu cùng phiên bản trả 200/409; lọc user quản trị và mở chi tiết chatbot đúng; không có browser exception. Tài khoản và dữ liệu thử được xóa trong `finally`.
- `npm run verify:runtime`: **12/12 route đạt** trên production localhost:3000.

`verify:hardening` cần database đang có schema hợp lệ. `verify:account-flows` chỉ cho phép server localhost/127.0.0.1, dùng database và secret khớp cấu hình server; thao tác ghi chỉ trên tài khoản test dùng email `example.invalid`, không gửi email hay thanh toán. Nếu chạy process bị cưỡng bức dừng, cần kiểm tra tài khoản test chưa được dọn.

## Lưu ý vận hành

1. Khởi động lại server sau cập nhật dependency. Production cần `SESSION_SECRET` >=32 ký tự; không tự sửa secret hiện có vì sẽ vô hiệu hóa phiên.
2. PostgreSQL từ xa phải có certificate hợp lệ; nếu nhà cung cấp dùng CA riêng thì khai báo `PG_SSL_CA`, không tắt kiểm tra TLS.
3. Tin nhắn đã bị cắt trước bản sửa không thể khôi phục tự động. Khi có xung đột dữ liệu đa thiết bị, bản local được giữ và người dùng được báo tải lại để chạy quy tắc gộp hiện có; không tự chọn một chiến lược gộp nghiệp vụ mới.
4. Token telemetry chưa phải hóa đơn hoặc dashboard chi phí. SLO, giá provider, retention, DR/backup, cấu hình CDN và tích hợp thật cần xác nhận riêng ở môi trường triển khai.
5. Chưa chạy giao dịch ngân hàng, gửi email hay OAuth thật trong đợt sửa. Không kết luận toàn bộ production đã được kiểm toán chỉ từ test local.
