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

Các bảng nằm trong schema `trovio`; migration `migrations/20261020_news_content.sql`. Thời gian dùng TIMESTAMPTZ, giao diện hiển thị giờ/ngày Việt Nam. Người tạo/người sửa tham chiếu users; xóa tài khoản không xóa bài. Không sao chép nội dung vào app_documents hoặc seed runtime.

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
