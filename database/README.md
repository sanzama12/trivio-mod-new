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
| `npm run db:dump` | Xuất vào `database/dump_triovo_full.sql` |
| `npm run db:dump:mysql` | Xuất vào `database/dump_triovo_mysql.sql` |
| `npm run db:setup` | Nạp `database/dump_triovo_full.sql` vào database đích để khôi phục hoặc cài đặt từ bản xuất |

Mỗi lần xuất sẽ ghi đè file SQL tương ứng. Thay đổi cấu trúc được thêm vào `migrations/all.sql` với mã migration mới. Hai file dump được tạo bằng các lệnh xuất.
