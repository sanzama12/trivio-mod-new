# Kiến trúc Trovio

Trovio là một **modular monolith** triển khai bằng Next.js. Toàn bộ mã ứng dụng thuộc đúng một trong ba khối MVC sau:

```text
View (React) -> Controller (HTTP) -> Model (use-case + repository) -> PostgreSQL
```

## 1. Model

- `src/domain`: entity, value object và quy tắc thuần TypeScript.
- `src/services`: use-case/nghiệp vụ; không biết `NextRequest`, `NextResponse` hay React.
- `src/repositories`: hợp đồng và adapter PostgreSQL.
- `src/lib/db.ts`: hạ tầng kết nối PostgreSQL duy nhất.

Model không được import từ `src/controllers`, `src/views`, `src/components` hoặc `src/app`.

## 2. Controller

- `src/controllers`: xác thực HTTP, parse input, gọi một use-case và định dạng response.
- `src/app/api/**/route.ts`: adapter Next.js mỏng, chỉ chuyển request/params cho controller.

Controller không chứa truy vấn SQL và không chứa quy tắc nghiệp vụ.

## 3. View

- `src/components` và `src/views`: giao diện React.
- `src/lib/api-client.ts`: client typed duy nhất để Client Component gọi API.
- Server Component đọc Model trực tiếp theo khuyến nghị Next.js; không gọi vòng qua `/api`.

View không import repository hay `src/data`.

## Quy tắc dữ liệu

1. PostgreSQL là nguồn dữ liệu runtime duy nhất.
2. Thiếu `DATABASE_URL` hoặc truy vấn lỗi phải fail-fast; không trả danh sách rỗng giả thành công.
3. Không seed tài khoản, trường, ngành, chương trình hoặc điểm chuẩn mẫu khi ứng dụng khởi động.
4. Dữ liệu tuyển sinh chỉ được publish sau khi qua pipeline kiểm tra và có provenance.
5. File CSV chỉ là đầu vào ETL; giao diện không đọc CSV hoặc file JSON.

## Chiều phụ thuộc

```text
app/routes -> controllers -> services -> repository interfaces
                                      -> PostgreSQL adapters
views/client -> HTTP API contract
```

Không được đi ngược chiều phụ thuộc trên.
