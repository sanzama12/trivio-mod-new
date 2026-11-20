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
| `backups/` | Snapshot SQL tự động trước migration; bản sao lưu lịch sử giữ nguyên, được Git bỏ qua |

Chạy các lệnh từ thư mục chứa `package.json`. Cấu hình kết nối PostgreSQL bằng `DATABASE_URL` trong `.env.local`.

| Lệnh | Thao tác |
| --- | --- |
| `npm run db:status` | Xem trạng thái migration |
| `npm run db:migrate` | Khởi tạo schema nền khi cần và áp dụng migration |
| `npm run db:verify` | Kiểm tra migration trong transaction có rollback |
| `npm run db:audit` | Kiểm tra trùng mã, dữ liệu mồ côi, constraint, index và index khóa ngoại |
| `npm run db:import-legacy-json -- --apply` | Nhập một lần dữ liệu JSON cũ vào staging PostgreSQL, không ghi đè hoặc tự publish |
| `npm run verify:db-storage` | Kiểm tra staging và khôi phục snapshot SQL; mọi dữ liệu thử được rollback |
| `npm run db:dump` | Xuất vào `database/dump_triovo_full.sql` |
| `npm run db:dump:mysql` | Xuất vào `database/dump_triovo_mysql.sql` |
| `npm run db:setup` | Nạp `database/dump_triovo_full.sql` vào database đích để khôi phục hoặc cài đặt từ bản xuất |

Mỗi lần xuất sẽ ghi đè file SQL tương ứng. Thay đổi cấu trúc được thêm vào `migrations/all.sql` với mã migration mới. Hai file dump được tạo bằng các lệnh xuất.

Hai file dump chỉ dùng cục bộ hoặc lưu trong nơi sao lưu có kiểm soát truy cập. Chúng chứa dữ liệu người dùng và hash mật khẩu, nên không commit vào Git hoặc đưa vào gói triển khai. `npm run secrets:check` sẽ chặn dump được theo dõi. Nếu từng đẩy dump lên remote, việc xóa ở commit mới không xóa dữ liệu trong lịch sử Git; cần xử lý lịch sử và đánh giá thông báo sự cố trước khi công khai repository.

Logo trường được lưu dưới dạng URL HTTPS trong PostgreSQL: dữ liệu thu thập nằm ở `trovio.app_documents` với collection `etl-staging`, dữ liệu đã công bố nằm ở cột `schools.logo_url`. Không cần file JSON để chạy công cụ. Bộ thu thập không tải hoặc ghi file ảnh vào `public/images/schools`.
Kiểm tra kích thước ảnh gốc bằng `npm run school-logos:quality -- [MÃ_TRƯỜNG ...]`. Công cụ đọc ảnh vào bộ nhớ để đo kích thước, lưu báo cáo vào PostgreSQL. Các URL được đề xuất cần kiểm tra đúng nhận diện trường trước khi đưa vào overrides; ảnh SVG hoặc ảnh gốc lớn được ưu tiên hơn favicon 32–60px.
Không dùng dataset tên file ảnh cục bộ; mọi nguồn logo được lưu dưới dạng URL HTTPS hoàn chỉnh.

| Lệnh | Thao tác |
| --- | --- |
| `npm run school-logos:collect` | Thu thập và kiểm tra URL cho toàn bộ trường trong dataset PostgreSQL `school-websites` |
| `npm run school-logos:collect -- BKA DTT` | Chỉ kiểm tra các trường được chọn |
| `npm run school-logos:check` | Kiểm tra HTTPS và báo mã trường còn thiếu nguồn, không truy cập mạng |
| `npm run school-logos:publish` | Xem số URL sẽ được bổ sung vào database |
| `npm run school-logos:publish -- --apply` | Bổ sung URL còn trống trong transaction, giữ nguyên logo quản trị đã nhập |

Nguồn ưu tiên là dataset `school-logo-overrides`; tiếp theo là URL đã có, logo và biểu tượng website chính thức. Kết quả kiểm tra mạng nằm trong dataset `school-logo-results`. Lệnh thu thập trả mã lỗi khi trường nào đó chưa kiểm tra được URL; không coi HTTP thành công là bằng chứng đã duyệt đúng nhận diện logo. Cần xem lại nguồn trước khi publish. Đợt chuyển lưu trữ không tự kiểm tra lại toàn bộ nguồn qua mạng.

Sau khi publish, tiến trình web đang chạy tự làm mới cache danh mục trong tối đa hai phút. Component logo tải URL HTTPS trực tiếp và hiển thị mã trường nếu ảnh lỗi hoặc chưa có URL. URL hỏng vẫn cần được sửa trong dữ liệu nguồn.

## Dữ liệu PostgreSQL, không dùng file JSON làm kho lưu trữ

- Runtime đã dùng PostgreSQL cho tài khoản, hồ sơ/nguyện vọng, hội thoại, giao dịch, audit và cấu hình quản trị. `JSONB` là kiểu cột trong PostgreSQL, không phải file `.json` trên máy chủ.
- Dữ liệu trung gian ETL dùng collection `etl-staging`; `parent_id` là tên dataset, `id` là `dataset:khóa`, `payload.value` là dữ liệu. Mỗi trường có một bản ghi riêng, tránh ghi đè cả file khi các worker chạy đồng thời.
- Dataset gồm `school-websites`, `school-logos`, `school-logo-overrides`, `school-logo-results`, `school-logo-quality`, `school-profile-candidates`, `school-pages`, `ts247-parsed` và `database-audits`. Audit database tự lưu báo cáo và in `reportId`, không còn tham số xuất file JSON.
- `npm run school-profiles:collect` lưu cả trang HTML nguồn và kết quả phân tích vào database. `npm run admissions:parse` đọc HTML đầu vào và lưu kết quả vào database; CSV/XLSX tiếp tục là định dạng nhập/xuất, không phải database runtime.
- Đã nhập và đối chiếu 394 mục dữ liệu cũ vào database cấu hình hiện tại, sau đó bỏ các file JSON dữ liệu tương ứng. Trên môi trường khác còn file cũ, chạy `db:import-legacy-json` để xem trước, thêm `--apply` để nhập; script không tự xóa nguồn hoặc công bố dữ liệu.
- Snapshot mới trước migration là file `.sql` dữ liệu, cần schema khớp để phục hồi. Bản SQL đầy đủ cấu trúc và dữ liệu vẫn xuất bằng `npm run db:dump`. Các JSON backup cũ chỉ được đọc để kiểm chứng migration lịch sử, không phục vụ ứng dụng đang chạy.
- Cache/localStorage của khách và cấu hình `package.json`/`tsconfig.json` giữ nguyên; đây không phải kho dữ liệu JSON phía server. Không thay đổi quy tắc dùng ứng dụng khi chưa đăng nhập.
