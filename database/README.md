# Database

Toàn bộ file SQL của dự án nằm trong thư mục `database/`.

| Đường dẫn | Nội dung |
| --- | --- |
| `schema.sql` | Cấu trúc nền cho database PostgreSQL mới |
| `migrations/all.sql` | Các migration theo thứ tự áp dụng |
| `seed.sql` | Dữ liệu tham chiếu |
| `dump_triovo_full.sql` | Bản xuất PostgreSQL gồm cấu trúc, migration và dữ liệu |
| `dump_triovo_mysql.sql` | Bản xuất chuyển đổi sang MySQL |
| `scripts/` | Công cụ khởi tạo, migration, kiểm tra và xuất SQL |
| `backups/` | Snapshot tự động trước khi chạy migration, được Git bỏ qua |

Chạy các lệnh từ thư mục chứa `package.json`. Cấu hình kết nối PostgreSQL bằng `DATABASE_URL` trong `.env.local`.

| Lệnh | Thao tác |
| --- | --- |
| `npm run db:status` | Xem trạng thái migration |
| `npm run db:migrate` | Khởi tạo schema nền khi cần và áp dụng migration |
| `npm run db:verify` | Kiểm tra migration trong transaction có rollback |
| `npm run db:audit` | Kiểm tra trùng mã, dữ liệu mồ côi, constraint, index và index khóa ngoại |
| `npm run db:audit -- --output database/audit-report.json` | Kiểm tra và lưu báo cáo JSON khi cần lưu vết |
| `npm run db:dump` | Xuất vào `database/dump_triovo_full.sql` |
| `npm run db:dump:mysql` | Xuất vào `database/dump_triovo_mysql.sql` |
| `npm run db:setup` | Nạp `database/dump_triovo_full.sql` vào database đích để khôi phục hoặc cài đặt từ bản xuất |

Mỗi lần xuất sẽ ghi đè file SQL tương ứng. Thay đổi cấu trúc được thêm vào `migrations/all.sql` với mã migration mới. Hai file dump được tạo bằng các lệnh xuất.

Logo trường được lưu dưới dạng URL HTTPS trong `data/school-logos.json` và cột `schools.logo_url`. Bộ thu thập không tải hoặc ghi file ảnh vào `public/images/schools`.
Kiểm tra kích thước ảnh gốc bằng `node database/scripts/check-school-logo-quality.mjs [MÃ_TRƯỜNG ...]`. Công cụ đọc ảnh vào bộ nhớ để đo kích thước, không lưu file ảnh. Các URL được đề xuất cần kiểm tra đúng nhận diện trường trước khi đưa vào overrides; ảnh SVG hoặc ảnh gốc lớn được ưu tiên hơn favicon 32–60px.
Không dùng dataset tên file ảnh cục bộ; mọi nguồn logo được lưu dưới dạng URL HTTPS hoàn chỉnh.

| Lệnh | Thao tác |
| --- | --- |
| `npm run school-logos:collect` | Thu thập và kiểm tra URL cho toàn bộ trường trong `data/school-websites.json` |
| `npm run school-logos:collect -- BKA DTT` | Chỉ kiểm tra các trường được chọn |
| `npm run school-logos:check` | Kiểm tra HTTPS và báo mã trường còn thiếu nguồn, không truy cập mạng |
| `npm run school-logos:publish` | Xem số URL sẽ được bổ sung vào database |
| `npm run school-logos:publish -- --apply` | Bổ sung URL còn trống trong transaction, giữ nguyên logo quản trị đã nhập |

Nguồn ưu tiên trong `data/school-logo-overrides.json`; tiếp theo là URL đã có, logo trên website chính thức, và biểu tượng website chính thức. Kết quả kiểm tra mạng được ghi vào `scratch/school-logo-results.json`. Lệnh thu thập trả mã lỗi khi trường nào đó chưa kiểm tra được URL; không coi trạng thái HTTP thành công là bằng chứng đã duyệt đúng nhận diện logo. Cần xem lại nguồn trước khi publish. Bộ URL ban đầu được tổng hợp từ migration logo và overrides sẵn có; chưa được kiểm tra lại qua mạng trong lần cập nhật này.

Sau khi publish, tiến trình web đang chạy tự làm mới cache danh mục trong tối đa hai phút. Component logo tải URL HTTPS trực tiếp và hiển thị mã trường nếu ảnh lỗi hoặc chưa có URL. URL hỏng vẫn cần được sửa trong dữ liệu nguồn.
