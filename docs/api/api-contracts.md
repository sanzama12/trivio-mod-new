# Hợp đồng API Trovio

> Đây là nguồn sự thật duy nhất cho API công khai. Mọi thay đổi endpoint phải cập nhật tài liệu này trước mã nguồn.

## Quy ước chung

- Base URL mới: `/api/v1`.
- Content type: `application/json; charset=utf-8`.
- Ngày giờ: ISO 8601 UTC.
- Danh sách dùng `page` bắt đầu từ 1 và `limit` tối đa 100.
- Response thành công: `{ "data": ..., "meta": { "requestId": "..." } }`.
- Response lỗi: `{ "error": { "code": "...", "message": "...", "details": [], "requestId": "..." } }`.
- Cookie phiên `httpOnly` được dùng cho ứng dụng web. Endpoint ghi dữ liệu chịu kiểm tra same-origin tại `proxy.ts`.

## Danh mục endpoint phiên bản 1

| Method | Path | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Readiness của ứng dụng và database | Không |
| GET | `/api/v1/schools` | Danh sách trường | Không |
| GET | `/api/v1/schools/{id}` | Chi tiết trường | Không |
| GET | `/api/v1/majors` | Danh sách ngành | Không |
| GET | `/api/v1/majors/{id}` | Chi tiết ngành | Không |
| GET | `/api/v1/programs` | Tìm kiếm chương trình | Không |
| GET | `/api/v1/programs/{id}` | Chi tiết chương trình | Không |

Các endpoint cũ `/api/*` được giữ tạm thời trong giai đoạn chuyển đổi và phải ủy quyền vào cùng controller/use-case.

## GET `/api/v1/health`

Response `200` khi PostgreSQL sẵn sàng:

```json
{
  "data": { "status": "ready", "database": "ready" },
  "meta": { "requestId": "uuid" }
}
```

Response `503`: database thiếu cấu hình hoặc không truy vấn được.

## GET `/api/v1/programs`

Query hỗ trợ: `q`, `method`, `score`, `combos`, `tuition`, `regions`, `types`, `groups`, `majors`, `sort`, `page`, `limit`.

Response `200` chứa `data` là danh sách chương trình và `meta` gồm `page`, `limit`, `total`, `totalPages`, `requestId`.

## Mã lỗi chuẩn

| Code | HTTP | Ý nghĩa |
| --- | ---: | --- |
| `VALIDATION_ERROR` | 422 | Dữ liệu đầu vào không hợp lệ |
| `UNAUTHENTICATED` | 401 | Chưa đăng nhập |
| `FORBIDDEN` | 403 | Không đủ quyền |
| `NOT_FOUND` | 404 | Không tìm thấy tài nguyên |
| `CONFLICT` | 409 | Xung đột trạng thái |
| `RATE_LIMITED` | 429 | Vượt giới hạn tần suất |
| `DATABASE_UNAVAILABLE` | 503 | PostgreSQL chưa sẵn sàng |
| `INTERNAL_ERROR` | 500 | Lỗi không dự kiến |
