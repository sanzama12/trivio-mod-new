/** Quy tắc mật khẩu — module thuần, dùng được cả ở client và server. */
export interface PasswordCheck {
  id: "length" | "upper" | "number";
  label: string;
  passed: boolean;
}

export function checkPassword(password: string): PasswordCheck[] {
  return [
    { id: "length", label: "Ít nhất 8 ký tự", passed: password.length >= 8 },
    { id: "upper", label: "Có ít nhất 1 chữ hoa", passed: /[A-ZÀ-Ỹ]/.test(password) },
    { id: "number", label: "Có ít nhất 1 chữ số", passed: /\d/.test(password) },
  ];
}

/** 0–4: dùng cho thanh độ mạnh mật khẩu. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = checkPassword(password).filter((c) => c.passed).length;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) score += 1;
  return Math.min(4, score);
}

export const STRENGTH_LABELS = ["", "Yếu", "Trung bình", "Khá", "Mạnh"] as const;
