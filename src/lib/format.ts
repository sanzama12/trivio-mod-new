export function formatScore(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

/**
 * Dữ liệu nhập hiện dùng 0–0 để biểu diễn "chưa có học phí".
 * Không được suy diễn 0–0 thành miễn học phí nếu chưa có trạng thái/nguồn xác nhận riêng.
 */
export function hasTuitionData(min: number, max: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max > 0 && max >= min;
}

export function formatTuition(min: number, max: number): string {
  if (!hasTuitionData(min, max)) return "Chưa có dữ liệu học phí";
  if (min === max) return `${min} triệu/năm`;
  return `${min} – ${max} triệu/năm`;
}

export function formatTuitionShort(min: number, max: number): string {
  if (!hasTuitionData(min, max)) return "Chưa có dữ liệu";
  return min === max ? `${min}tr/năm` : `${min}–${max}tr/năm`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatMonthVi(ym: string): string {
  const [y, m] = ym.split("-");
  return m && y ? `${m}/${y}` : ym;
}
