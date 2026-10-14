/**
 * Tính tổng chi phí học đại học (module thuần, dùng ở client & test).
 * Mọi đơn vị: triệu đồng. Các giả định (tăng học phí, sinh hoạt phí) do người dùng tự nhập.
 */
export interface CostInput {
  /** Học phí năm đầu (triệu/năm). */
  tuitionPerYear: number;
  years: number;
  /** % học phí tăng mỗi năm (0 = không tăng). */
  tuitionIncreasePct: number;
  /** % học bổng / miễn giảm học phí (0–100). */
  scholarshipPct: number;
  /** Sinh hoạt phí mỗi tháng (ăn, ở, đi lại…). */
  livingPerMonth: number;
  monthsPerYear: number;
  /** Chi phí một lần (máy tính, nhập học…). */
  oneTime: number;
}

export interface CostYear {
  year: number;
  tuition: number;
  living: number;
  total: number;
}

export interface CostResult {
  years: CostYear[];
  tuition: number;
  living: number;
  oneTime: number;
  total: number;
  perMonthAvg: number;
}

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function computeCost(input: CostInput): CostResult {
  const years = Math.round(clamp(input.years, 1, 8));
  const base = clamp(input.tuitionPerYear, 0, 2000);
  const inc = clamp(input.tuitionIncreasePct, 0, 50) / 100;
  const off = clamp(input.scholarshipPct, 0, 100) / 100;
  const living = clamp(input.livingPerMonth, 0, 100) * Math.round(clamp(input.monthsPerYear, 0, 12));
  const out: CostYear[] = [];
  for (let i = 0; i < years; i++) {
    const tuition = base * (1 + inc) ** i * (1 - off);
    out.push({ year: i + 1, tuition: r1(tuition), living: r1(living), total: r1(tuition + living) });
  }
  const tuitionSum = out.reduce((s, y) => s + y.tuition, 0);
  const livingSum = out.reduce((s, y) => s + y.living, 0);
  const oneTime = clamp(input.oneTime, 0, 1000);
  const total = tuitionSum + livingSum + oneTime;
  return { years: out, tuition: r1(tuitionSum), living: r1(livingSum), oneTime: r1(oneTime), total: r1(total), perMonthAvg: r1(total / (years * 12)) };
}

/** Học phí năm đầu mặc định: trung bình khoảng học phí của chương trình. */
export const defaultTuition = (min: number, max: number) => r1((min + max) / 2);

export const formatMillion = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ` : `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
