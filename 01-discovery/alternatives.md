# Các phương án triển khai tiếp theo

## APPROACH A: Ổn định tối thiểu để pilot

Summary: Sửa các P0 trong catalog, xóa tài khoản và test suite; giữ phần lớn `app_documents` trong ngắn hạn nhưng bổ sung kiểm tra và cleanup rõ ràng.  
Effort: M  
Risk: Medium

Pros:

- Đưa pilot kín ra nhanh nhất.
- Ít thay đổi UI và API.
- Tận dụng service/repository hiện có.

Cons:

- Nợ JSONB và race condition vẫn còn.
- Phải migration lần hai trước production lớn.
- Khả năng báo cáo dữ liệu bị hạn chế.

Reuses: `publish-catalog.ts`, schema catalog, services hiện tại, admin UI, audit concept.

## APPROACH B: Chuẩn hóa theo lát cắt nghiệp vụ

Summary: Hoàn thiện catalog versioning, sau đó chuyển từng aggregate quan trọng sang bảng quan hệ theo thứ tự user-data → community → class → notification; mỗi lát cắt gồm repository, migration, API và test.  
Effort: L  
Risk: Low–Medium

Pros:

- Hướng kiến trúc dài hạn tốt nhất.
- FK, unique, cascade và transaction bảo vệ dữ liệu.
- Không cần big-bang rewrite.

Cons:

- Cần 3–5 đợt migration.
- Tạm thời phải hỗ trợ đọc dữ liệu cũ.
- Đòi hỏi database test thật trong CI.

Reuses: `database/schema.sql`, repository interfaces, service layer, MVC hiện tại.

## APPROACH C: Tiếp tục mở rộng tính năng trước

Summary: Giữ data layer hiện tại và thêm học bổng, checklist, cảnh báo, AI hoặc dự đoán.  
Effort: M–L  
Risk: High

Pros:

- Nhiều màn hình mới nhanh.
- Dễ tạo ấn tượng trong demo.

Cons:

- Khuếch đại dữ liệu sai và nợ vận hành.
- Mỗi tính năng mới phụ thuộc catalog chưa đáng tin.
- Tốn công sửa lại sau migration.

Reuses: UI/component và các route hiện có.

## Recommendation

Chọn **Approach B**, nhưng chia mốc đầu theo Approach A để có pilot kín. Lý do: dự án đã đủ tính năng; giá trị tăng mạnh nhất khi dữ liệu có nguồn, version, transaction và kiểm thử.

## NOT in scope

- Big-bang rewrite toàn bộ dự án.
- Microservices, event streaming hoặc data warehouse ở giai đoạn này.
- ML dự đoán xác suất đỗ.
- Tự động nộp hồ sơ vào hệ thống bên ngoài.

