import type { CutoffScore } from "../domain/types";

export type TrendDirection = "tang" | "giam" | "on-dinh" | "chua-du-du-lieu";
export interface TrendPoint { year: number; score: number; delta: number | null }
export interface CutoffTrend {
  points: TrendPoint[];
  direction: TrendDirection;
  /** Chênh lệch giữa năm mới nhất và năm cũ nhất có dữ liệu. */
  totalChange: number | null;
  /** Chênh lệch giữa hai năm gần nhất. */
  latestChange: number | null;
  summary: string;
}

const round = (n: number) => Math.round(n * 100) / 100;
/** Dưới ngưỡng này (điểm, thang 30) coi là ổn định. */
export const STABLE_THRESHOLD = 0.25;

/** Phân tích biến động điểm chuẩn qua các năm; không dự đoán năm sau. */
export function cutoffTrend(cutoffs: CutoffScore[]): CutoffTrend {
  const sorted = [...cutoffs].filter((c) => Number.isFinite(c.score)).sort((a, b) => a.year - b.year);
  const points: TrendPoint[] = sorted.map((c, i) => ({ year: c.year, score: c.score, delta: i === 0 ? null : round(c.score - sorted[i - 1].score) }));
  if (points.length < 2) {
    return { points, direction: "chua-du-du-lieu", totalChange: null, latestChange: null, summary: "Cần điểm chuẩn của ít nhất 2 năm để xem xu hướng." };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const totalChange = round(last.score - first.score);
  const latestChange = last.delta;
  const direction: TrendDirection = Math.abs(totalChange) < STABLE_THRESHOLD ? "on-dinh" : totalChange > 0 ? "tang" : "giam";
  const fmt = (n: number) => Math.abs(n).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  const summary =
    direction === "on-dinh"
      ? `Điểm chuẩn gần như không đổi từ ${first.year} đến ${last.year} (chênh ${fmt(totalChange)} điểm).`
      : `Điểm chuẩn ${direction === "tang" ? "tăng" : "giảm"} ${fmt(totalChange)} điểm từ ${first.year} đến ${last.year}${
          latestChange != null && latestChange !== 0 ? `; năm ${last.year} ${latestChange > 0 ? "tăng" : "giảm"} ${fmt(latestChange)} điểm so với năm trước` : ""
        }.`;
  return { points, direction, totalChange, latestChange, summary };
}
