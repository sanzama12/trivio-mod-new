# Tài liệu học tập theo môn

## Chức năng

- Menu máy tính và di động: **Tài liệu**, `/tai-lieu`.
- Nhãn môn lấy từ `subjects` hiện có; chọn môn đổi URL và chỉ hiện tài liệu môn đó. Số đếm trên nhãn chỉ tính tài liệu đã đăng.
- Lọc thêm PDF/video/hình ảnh, tìm theo tên/mô tả, phân trang 12 mục; không tải tất cả tài liệu về trình duyệt.
- `/tai-lieu/[slug]`: xem video, ảnh hoặc thông tin PDF và nút tải xuống.
- Admin: `/quan-tri/tai-lieu`, thêm/chỉnh sửa, chọn môn, nháp/đăng/gỡ và xem trước. Danh sách admin phân trang 20 mục.

## Dữ liệu

| Bảng | Mục đích |
| --- | --- |
| `subjects` | Danh mục môn dùng chung, không tạo danh mục nhãn trùng |
| `learning_materials` | ID UUID có tiền tố, slug duy nhất, môn có FK, loại tài liệu, mô tả, trạng thái và phiên bản |
| `material_files` | File PDF, tên file, MIME, bytes và ngày tạo; chỉ được đọc bytes khi tải file |
| `material_events` | Người sửa, phiên bản và trạng thái mỗi lần lưu |
| `published_materials` | View chỉ các tài liệu đã đăng; dùng cho danh sách, nhãn môn, chi tiết và download |

Một tài liệu có một môn chính và một loại media. Nếu cần phân loại nhiều môn trong tương lai, bổ sung bảng liên kết có khóa ghép, không lưu chuỗi nhãn phân cách bằng dấu phẩy. Slug đã xuất bản được giữ ổn định; phiên bản cũ khi lưu trả 409.

## Media và tải PDF

- Video: YouTube/Vimeo hoặc MP4/WebM HTTPS; dùng cùng bộ kiểm tra URL của tin tức.
- Ảnh: URL ảnh trực tiếp HTTPS, mở kích thước gốc được. Chưa upload ảnh/video trực tiếp.
- PDF: chọn file thật trong admin, tối đa 10 MB. Server giới hạn kích thước request khi đọc stream, kiểm tra header PDF và dấu kết thúc EOF. Đây là kiểm tra cấu trúc cơ bản, không phải bộ quét malware hoặc chứng nhận mọi trang PDF hợp lệ.
- `POST /api/admin/materials` dùng multipart gồm JSON `payload` và file tùy chọn. Upload + tài liệu + audit cùng transaction; lỗi rollback không tạo file mồ côi. Thay PDF hoặc đổi loại tài liệu sẽ xóa file PDF cũ trong cùng transaction.
- File nhỏ hiện lưu BYTEA trong PostgreSQL để có lưu trữ bền vững, không phụ thuộc filesystem của server và không cần cấu hình kho file ngoài. File không đi vào DTO danh sách hoặc JSON người dùng. Backup DB có thể tăng theo số lượng PDF; khi kho tài liệu lớn nên chuyển bytes sang object storage, giữ metadata và quyền tải trong DB.
- `GET /api/materials/[id]/download` trả bytes với `Content-Disposition: attachment`, tên tiếng Việt chuẩn UTF-8, `application/pdf`, `nosniff`, `no-store`. Không dựa vào thuộc tính download của URL ngoài, không fetch URL do người dùng chỉ định từ server.
- Nháp/đã gỡ hoặc tài liệu không phải PDF trả 404 ở endpoint download. File đã được người dùng tải trước đó không thể thu hồi khỏi thiết bị của họ.
- Giới hạn upload thực tế còn phụ thuộc reverse proxy/nền tảng triển khai; nếu nền tảng giới hạn request dưới 10 MB cần cấu hình lại hoặc chuyển sang upload trực tiếp vào kho file.

## Kiểm tra và triển khai

`npm run db:verify:materials` chạy migration/repository/download handler trên schema tạm rồi rollback, kiểm tra lọc môn, quyền công khai, bytes và header tải PDF, khóa phiên bản, dọn file cũ và rollback khi lỗi. `npm run db:test` kiểm tra validation, định dạng file và quyền admin.

Migration: `migrations/20261020_learning_materials.sql`, áp dụng qua `npm run db:migrate` có backup trước. Không tạo tài liệu mẫu hoặc sao chép dữ liệu môn học.

## Kết quả triển khai 20/10/2026

- Migration đã áp dụng lên PostgreSQL. Backup trước thay đổi: `backups/before-migration-2026-10-20T04-56-46-610Z.json`.
- TypeScript ứng dụng/database và production build đạt.
- Bộ kiểm thử 20 bài đạt, gồm 4 bài cho validation/phân quyền tài liệu.
- Kiểm thử PostgreSQL tạm xác nhận lọc môn, chỉ đếm bài công khai, PDF tải đúng bytes/tên file UTF-8, gỡ bài khóa download, chặn phiên bản cũ, thay file dọn bản cũ và rollback không để lại file mồ côi.
- `npm run db:smoke:materials` xác nhận menu/nhãn môn, bộ lọc Toán + PDF, tài liệu không tồn tại trả 404, admin cần đăng nhập, upload vô danh trả 401 và request ghi khác nguồn trả 403. Server thử nghiệm chỉ nghe localhost và đã tắt.
- Không tạo nội dung mẫu trong thư viện thật; admin bắt đầu tại `/quan-tri/tai-lieu/tao-moi`.
