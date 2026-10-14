/**
 * SERVICE LAYER — so khớp sở thích nghề nghiệp RIASEC (Holland).
 * Áp dụng mô hình Lục giác Holland (Hexagon Model) để tính "Điểm phù hợp tham khảo Trovio".
 *
 * Lưu ý đạo đức & khoa học: Đây là thuật toán gợi ý định hướng nghề nghiệp tham khảo,
 * KHÔNG PHẢI chỉ số Iachan Agreement Index nguyên bản và KHÔNG cấu thành kết luận tâm lý học hay chẩn đoán lâm sàng.
 *
 * Thứ tự lục giác chuẩn: R - I - A - S - E - C
 * - Trùng đỉnh: khoảng cách = 0 (tương đồng 100%)
 * - Kề cận: khoảng cách = 1 (tương đồng 70% - cùng bán cầu tính cách)
 * - Cách 1 đỉnh: khoảng cách = 2 (tương đồng 35%)
 * - Đối diện: khoảng cách = 3 (tương đồng 5% - đặc tính tương phản)
 */
import type { Major, RiasecResult, RiasecType } from "../domain/types";
import { RIASEC_ORDER } from "../domain/riasec";

const HEX_ORDER = RIASEC_ORDER; // ["R", "I", "A", "S", "E", "C"]

/** Tính khoảng cách ngắn nhất trên vòng tròn lục giác Holland (0, 1, 2, 3). */
export function hexagonDistance(t1: RiasecType, t2: RiasecType): number {
  const i1 = HEX_ORDER.indexOf(t1);
  const i2 = HEX_ORDER.indexOf(t2);
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 6 - diff);
}

/** Hệ số tương đồng giữa 2 nhóm RIASEC dựa trên vị trí lục giác. */
export function hexagonSimilarity(t1: RiasecType, t2: RiasecType): number {
  const d = hexagonDistance(t1, t2);
  if (d === 0) return 1.0;
  if (d === 1) return 0.7;
  if (d === 2) return 0.35;
  return 0.05;
}

/**
 * Điểm phù hợp tham khảo Trovio giữa hồ sơ RIASEC của học sinh và mã Holland của ngành (thang 0–100).
 * Kết hợp:
 * 1. Điểm phần trăm thực tế ở 3 nhóm ngành yêu cầu (trọng số 0.5 - 0.3 - 0.2).
 * 2. Độ tương hợp cấu trúc lục giác Holland giữa mã của học sinh và mã của ngành.
 */
export function matchMajor(
  result: Pick<RiasecResult, "percents" | "code">,
  major: Pick<Major, "riasec">,
): number {
  const [m0, m1, m2] = major.riasec;
  const [u0, u1, u2] = result.code;

  // 1. Điểm theo % thực tế của học sinh đối với 3 nhóm ngành
  const p0 = result.percents[m0] ?? 0;
  const p1 = result.percents[m1] ?? 0;
  const p2 = result.percents[m2] ?? 0;
  const percentBase = p0 * 0.5 + p1 * 0.3 + p2 * 0.2; // 0..100

  // 2. Độ tương hợp vị trí theo mô hình lục giác Holland (Hexagonal Congruence)
  // Ưu tiên cao nhất vị trí nhóm chính (dominant trait), tiếp theo là nhóm phụ
  const pos0Sim = hexagonSimilarity(u0, m0);
  const pos1Sim = hexagonSimilarity(u1, m1);
  const pos2Sim = hexagonSimilarity(u2, m2);
  const hexCongruence = pos0Sim * 0.5 + pos1Sim * 0.3 + pos2Sim * 0.2; // 0.05..1.0

  // 3. Điểm thưởng trùng mã (exact code overlap)
  const overlap = major.riasec.filter((t) => result.code.includes(t)).length;
  const exactPos = [u0 === m0, u1 === m1, u2 === m2].filter(Boolean).length;
  const bonus = overlap * 2 + exactPos * 1.5;

  // Kết hợp: 75% từ điểm % thực tế + 25% từ độ tương hợp cấu trúc lục giác + bonus
  const finalScore = Math.round(percentBase * 0.75 + hexCongruence * 25 + bonus);

  return Math.max(0, Math.min(100, finalScore));
}
