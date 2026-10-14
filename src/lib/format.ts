export function formatScore(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function formatTuition(min: number, max: number): string {
  if (max === 0) return "Miễn học phí";
  if (min === max) return `${min} triệu/năm`;
  return `${min} – ${max} triệu/năm`;
}

export function formatTuitionShort(min: number, max: number): string {
  if (max === 0) return "Miễn phí";
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
