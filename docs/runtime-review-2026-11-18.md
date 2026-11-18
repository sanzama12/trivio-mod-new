# Rà soát vận hành — 18/11/2026

## Thay đổi

- Layout dùng dữ liệu trực tiếp và phiên đăng nhập: bỏ bước thử dựng tĩnh gọi database trong build.
- Môn học và tổ hợp dùng chung một truy vấn, cache 2 phút, xóa cache khi quản trị cập nhật.
- Trang ngành dùng lại repository/cache danh mục thay vì chạy một truy vấn tổng hợp lớn riêng.
- Thống kê dùng CTE materialized để đọc danh sách chương trình công khai một lần trong truy vấn.
- Pool mặc định 5 kết nối, timeout kết nối 15 giây; giữ giới hạn truy vấn và không tự chạy lại lệnh ghi.
- Thêm giao diện đang tải chung cho các trang công khai.
- API ngân hàng báo không khả dụng khi gọi thất bại, không trả dữ liệu cũ như một lần đối soát mới. Giữ cooldown 10 giây cả khi lỗi và xóa cache khi đổi token.
- Thêm `npm test`, `npm run check`, `npm run verify:runtime` và kiểm thử hồi quy cache.

## Kết quả

- Build production đạt; dựng trang không còn phát sinh truy vấn database như lần đầu kiểm tra.
- TypeScript ứng dụng và database đạt; 105 tests đạt; kiểm tra secret đạt.
- Kiểm tra HTTP trên production local cổng 3100: 12/12 route đạt ở lần cuối, gồm health, trang chủ, trường, ngành, chương trình, đăng nhập, đăng ký, trắc nghiệm, điểm, donate, so sánh, quản trị.
- Chuyển hướng đăng ký/quản trị được tính là thành công; chưa kiểm thử các thao tác ghi sau đăng nhập bằng tài khoản thật.

## Điểm còn tồn tại

- Kết nối database có lúc mất khoảng 5–8 giây; tải lạnh trang trường ở lần cuối mất 29,4 giây. Server vẫn ghi nhận query timeout và fallback trong các lần tải danh mục. HTTP 200 không chứng minh dữ liệu đầy đủ hoặc hiệu năng đạt yêu cầu.
- API dichvucheap từng timeout với token đã cấu hình. Chưa xác minh thanh toán thật, webhook bên ngoài, Google OAuth hoặc email bằng giao dịch/tài khoản thật.
- Đây là đợt sửa vận hành và luồng tải dữ liệu, chưa phải thiết kế lại toàn bộ giao diện hay kiểm thử tương tác toàn bộ chức năng.

## Kiểm tra lại

1. Chạy `npm run check` và `npm run build`.
2. Khởi động ứng dụng bằng `npm start`.
3. Chạy `npm run verify:runtime`; có thể đặt `VERIFY_BASE_URL` để dùng server khác.
4. Kiểm tra tốc độ và tính đầy đủ dữ liệu ở cả lần tải lạnh và sau khi cache đã có dữ liệu; kiểm tra luồng đăng nhập và thanh toán thật riêng.
