/** Thông báo cho mã lỗi `?error=` khi quay về từ luồng Google OAuth. */
export const OAUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Đăng nhập Google chưa được cấu hình trên máy chủ (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — xem README).",
  google_cancelled: "Bạn đã huỷ đăng nhập bằng Google.",
  google_state: "Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.",
  google_failed: "Không kết nối được với Google. Vui lòng thử lại sau.",
  google_email_unverified: "Email Google của bạn chưa được xác minh nên không thể dùng để đăng nhập.",
  google_disabled: "Tài khoản này đã bị quản trị viên tạm khoá. Liên hệ hỗ trợ để được mở lại.",
  google_conflict: "Tài khoản Google này đã được liên kết với một tài khoản Trovio khác.",
  google_not_found: "Không tìm thấy tài khoản để liên kết. Vui lòng đăng nhập lại.",
};

export const oauthErrorMessage = (code: string | undefined | null) => (code ? (OAUTH_ERRORS[code] ?? null) : null);
