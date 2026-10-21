# Database

`database/schema.sql` + `database/migrations/all.sql`: versioned PostgreSQL schema.
`database/seed.sql`: optional reference data for a new database, after migrations; no demo accounts.
`repositories/`: runtime queries. `scripts/`: maintenance. `tests/`: regression tests.
`import/`: original input files. `backups/`: private recovery snapshots (not committed).

# Tin tức và video

## Điểm vào

- `/tin-tuc`: bài đã đăng, tìm theo tiêu đề/tóm tắt, lọc chuyên mục/loại nội dung, phân trang 12 bài.
- `/tin-tuc/[slug]`: chi tiết công khai; nháp và bài đã gỡ trả 404.
- `/quan-tri/tin-tuc`: danh sách quản trị, gồm nháp/đã đăng/đã gỡ; 20 bài mỗi trang.
- `/quan-tri/tin-tuc/tao-moi`, `/quan-tri/tin-tuc/[id]`: biên tập, xem trước, đăng/gỡ và xem lịch sử.
- `POST /api/admin/news`: chỉ admin; proxy hiện có kiểm tra nguồn request, endpoint giới hạn payload và tần suất.

## Mô hình dữ liệu

| Bảng | Vai trò / khóa |
| --- | --- |
| `news_categories` | Chuyên mục có mã ổn định; không lặp tên chuyên mục trong từng bài |
| `news_posts` | ID `news-UUID`, slug UNIQUE; loại `article/video`, trạng thái `draft/published/archived`; nội dung và đường dẫn media |
| `news_post_events` | Lịch sử thao tác, người sửa, phiên bản và trạng thái; UNIQUE(post_id, version) |
| `published_news` | View công khai, chỉ bài published có ngày đăng không nằm trong tương lai |

Các bảng nằm trong schema `trovio`; migration `20261020_news_content.sql` (trong `database/migrations/all.sql`). Thời gian dùng TIMESTAMPTZ, giao diện hiển thị giờ/ngày Việt Nam. Người tạo/người sửa tham chiếu users; xóa tài khoản không xóa bài. Không sao chép nội dung vào app_documents hoặc seed runtime.

Một thao tác lưu khóa hàng, kiểm tra version, cập nhật và ghi lịch sử trong cùng transaction. Khi phiên bản không khớp, server trả 409 để người dùng tải lại, không ghi đè im lặng. Slug có thể sửa khi chưa xuất bản; sau lần đăng đầu tiên được giữ ổn định. Gỡ bài là archived, có thể đăng lại; không cung cấp xóa vĩnh viễn qua UI.

## Biên tập và media

- Nội dung mới dùng rich text: phông chữ, cỡ chữ 10–72 px, đậm/nghiêng/gạch chân/gạch ngang, màu chữ/nền chữ, căn lề, giãn dòng, tiêu đề, trích dẫn, danh sách, thụt lề, liên kết, ảnh HTTPS, bảng, chỉ số trên/dưới, hoàn tác và xóa định dạng.
- `news_posts.body_format` phân biệt `plain` (bài cũ) và `html` (bài rich text). Không đổi nội dung bài cũ khi migrate. Mở bài cũ trong editor sẽ chuyển văn bản/tiêu đề/danh sách sang rich text; chỉ ghi xuống khi admin bấm lưu.
- `sanitize-html` lọc theo danh sách thẻ, thuộc tính và CSS cho phép ở server trước khi lưu và trước khi render. Nội dung dán cũng được lọc. Không giữ script, iframe tùy ý, event handler hoặc CSS thực thi.
- Video nhận link YouTube/Shorts, Vimeo công khai hoặc URL file MP4/WebM HTTPS. Chỉ iframe đến domain trình phát cố định; không tự động phát.
- Admin đăng video lên nền tảng hoặc kho media trước, rồi dán link. Bản này **không upload/lưu file video trực tiếp**. Database chỉ lưu URL. Link riêng tư, bị chặn nhúng hoặc đã bị xóa có thể không phát; luôn có link mở riêng.
- Ảnh bìa và nguồn tham khảo dùng URL HTTPS. Chưa có chức năng upload ảnh hoặc tải file nguồn về server.
- Nháp có thể chưa đủ nội dung. Khi đăng, bắt buộc có tóm tắt và nội dung bài hoặc video hợp lệ. Không tự sinh tin tuyển sinh hay dữ liệu minh họa để xuất bản.

## Tốc độ và tính nhất quán

Index phục vụ danh sách theo thời gian đăng/chuyên mục và danh sách admin theo trạng thái. Trang danh sách không lấy body/video URL; chi tiết đọc theo slug có index duy nhất. Các trang tin tức đọc động, nên bài vừa gỡ không tồn tại trong cache công khai của tính năng này. Không cập nhật lượt xem theo từng request, tránh ghi DB không cần thiết.

## Kiểm tra

`npm run db:test` kiểm tra validation, quyền, URL video và chuẩn hóa dữ liệu. `npm run db:verify:news` dựng schema tạm, chạy migration và repository thật để kiểm tra nháp/đăng/gỡ/đăng lại, phiên bản, khóa ngoại, slug duy nhất, bộ lọc/phân trang và lịch sử. Toàn bộ schema kiểm thử được rollback; không xuất bản bài thử vào runtime.

Áp dụng database bằng `npm run db:migrate`. Runner lưu backup trước khi thay đổi; migration chỉ tạo bảng/view/hàm/index và ba chuyên mục, không tạo bài viết.

## Kết quả triển khai 20/10/2026

Migration đã áp dụng lên PostgreSQL. Backup trước thay đổi: `backups/before-migration-2026-10-20T04-00-32-556Z.json` (106 bảng trước khi bổ sung tin tức).

- TypeScript ứng dụng và database: đạt.
- Bộ kiểm thử: 12 bài đạt, gồm 5 bài riêng cho tin tức.
- Kiểm thử repository trên schema tạm: đạt; rollback toàn bộ bài thử.
- Production build: đạt, có các route tin tức công khai và quản trị.
- `npm run db:smoke:news` (sau build): trang `/tin-tuc` trả 200, bài không tồn tại trả 404, admin chưa đăng nhập được chuyển tới đăng nhập, ghi API khi chưa đăng nhập trả 401, ghi khác nguồn trả 403. Server kiểm thử chỉ nghe localhost và tự tắt.

Không có bài mẫu được xuất bản. Vào `/quan-tri/tin-tuc/tao-moi` bằng tài khoản admin để tạo nội dung thật.

## Nâng cấp trình soạn thảo

Migration `20261020_news_rich_text.sql` đã áp dụng; backup `backups/before-migration-2026-10-20T04-46-08-036Z.json`. Trình soạn thảo và trang công khai dùng cùng quy tắc hiển thị. Ảnh trong nội dung được chèn bằng URL HTTPS, chưa upload trực tiếp. Phông chữ dùng phông có sẵn trên máy người xem; phông chưa cài sẽ dùng fallback của trình duyệt.

Đã kiểm tra rich text qua repository với schema tạm rồi rollback; 16 unit test đạt. Kiểm tra trực tiếp bằng Chrome headless xác nhận bôi đen → chọn Georgia → đổi 24px → in đậm → căn giữa → chèn bảng 3×3 vẫn giữ định dạng. Đã dọn script và hồ sơ trình duyệt tạm sau kiểm tra.


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

Migration: `20261020_learning_materials.sql` (trong `database/migrations/all.sql`), áp dụng qua `npm run db:migrate` có backup trước. Không tạo tài liệu mẫu hoặc sao chép dữ liệu môn học.

## Kết quả triển khai 20/10/2026

- Migration đã áp dụng lên PostgreSQL. Backup trước thay đổi: `backups/before-migration-2026-10-20T04-56-46-610Z.json`.
- TypeScript ứng dụng/database và production build đạt.
- Bộ kiểm thử 20 bài đạt, gồm 4 bài cho validation/phân quyền tài liệu.
- Kiểm thử PostgreSQL tạm xác nhận lọc môn, chỉ đếm bài công khai, PDF tải đúng bytes/tên file UTF-8, gỡ bài khóa download, chặn phiên bản cũ, thay file dọn bản cũ và rollback không để lại file mồ côi.
- `npm run db:smoke:materials` xác nhận menu/nhãn môn, bộ lọc Toán + PDF, tài liệu không tồn tại trả 404, admin cần đăng nhập, upload vô danh trả 401 và request ghi khác nguồn trả 403. Server thử nghiệm chỉ nghe localhost và đã tắt.
- Không tạo nội dung mẫu trong thư viện thật; admin bắt đầu tại `/quan-tri/tai-lieu/tao-moi`.
