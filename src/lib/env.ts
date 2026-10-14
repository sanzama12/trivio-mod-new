/**
 * Cờ môi trường dùng chung phía server.
 *
 * Cờ trình bày giao diện. Cờ này không được phép tạo dữ liệu mẫu,
 * bỏ qua xác thực hoặc thay đổi quy tắc lưu trữ PostgreSQL-only.
 */
export function isDemoMode(): boolean {
  if (process.env.TROVIO_DEMO === "true") return true;
  return false;
}

/** Email được cấp quyền quản trị (phân tách bằng dấu phẩy), VD: ADMIN_EMAILS=ban@gmail.com */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
