# Kiến trúc Trovio

Trovio là một **modular monolith** triển khai bằng Next.js. Toàn bộ mã ứng dụng thuộc đúng một trong ba khối MVC sau:

```text
View (React) -> Controller (HTTP) -> Model (use-case + repository) -> PostgreSQL
```

## 1. Model

- `src/domain`: entity, value object và quy tắc thuần TypeScript.
- `src/services`: use-case/nghiệp vụ; không biết `NextRequest`, `NextResponse` hay React.
- `database/repositories`: hợp đồng và adapter PostgreSQL.
- `database/client.ts`: hạ tầng kết nối PostgreSQL duy nhất.

Model không được import từ `src/controllers`, `src/views`, `src/components` hoặc `src/app`.

## 2. Controller

- `src/app/api/**/route.ts` là HTTP Controller theo convention của Next.js: xác thực HTTP, parse input, gọi một use-case và định dạng response.
- `src/controllers` chứa handler được tách ra khi một controller dài, cần dùng chung hoặc cần kiểm thử độc lập. Route ngắn không cần thêm một lớp ủy quyền hình thức.

Controller chỉ được gọi service. Controller không import repository, không chứa truy vấn SQL và không chứa quy tắc nghiệp vụ.

## 3. View

- `src/components` và `src/views`: giao diện React.
- `src/lib/api-client.ts`: client typed duy nhất để Client Component gọi API.
- Server Component đọc Model trực tiếp theo khuyến nghị Next.js; không gọi vòng qua `/api`.

View không import repository hay `database/seeds`.

## Read-model và hiệu năng

- View server chỉ gọi service; không import Repository trực tiếp.
- Route Handler là Controller hoặc ủy quyền cho một Controller đã tách. Cả hai chỉ gọi service và không chứa SQL.
- Một màn hình có nhiều dữ liệu phải có một read-model trong service (`get…PageData`, `get…Options`) để View không tự ghép Repository.
- Khi tổng hợp theo khoá, dùng `Map`/`Set` hoặc helper `src/lib/collections.ts`; không dùng `filter` lồng trong `map` trên danh sách lớn.
- Danh sách override quản trị phải lấy theo lô (`listOverrideIds`) thay vì truy vấn từng bản ghi.

## Quy tắc dữ liệu

1. PostgreSQL là nguồn dữ liệu runtime duy nhất.
2. Thiếu `DATABASE_URL` hoặc truy vấn lỗi phải fail-fast; không trả danh sách rỗng giả thành công.
3. Không seed tài khoản, trường, ngành, chương trình hoặc điểm chuẩn mẫu khi ứng dụng khởi động.
4. Dữ liệu tuyển sinh chỉ được publish sau khi qua pipeline kiểm tra và có provenance.
5. File CSV chỉ là đầu vào ETL; giao diện không đọc CSV hoặc file JSON.

## Chiều phụ thuộc

```text
app/pages ---------------------------> services -> repositories -> PostgreSQL
app/api routes -> [src/controllers] -> services -> repositories -> PostgreSQL
views/client -> HTTP API contract
```

Không được đi ngược chiều phụ thuộc trên.
