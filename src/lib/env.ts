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

export function isLocalDemoLoginEnabled(): boolean {
  try {
    const host = new URL(process.env.APP_URL ?? "").hostname;
    return (host === "localhost" || host === "127.0.0.1") &&
      (process.env.NODE_ENV !== "production" || isDemoMode());
  } catch {
    return false;
  }
}
