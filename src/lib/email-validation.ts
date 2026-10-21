/** Shared syntax validation; ownership is confirmed by the email verification flow. */
export function emailError(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Vui lòng nhập email của bạn.";
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email sai định dạng. Ví dụ: ban@gmail.com.";
  const [local, domain] = email.split("@");
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || domain.split(".").some((part) => !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(part)) || !/^[a-zA-Z]{2,}$/.test(domain.split(".").at(-1)!)) return "Email không hợp lệ. Vui lòng kiểm tra lại địa chỉ email.";
}
