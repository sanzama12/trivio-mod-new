/**
 * SERVICE LAYER — trắc nghiệm sở thích nghề nghiệp RIASEC (Holland).
 */
import type { Major, RiasecQuestion, RiasecResult, RiasecType } from "../domain/types";
import { RIASEC_ORDER } from "../domain/riasec";
import { repositories } from "../repositories";

export const RIASEC_TYPES: RiasecType[] = RIASEC_ORDER;

export type QuizAnswers = Record<number, number>; // questionId -> 1..5

/** Chuyển câu trả lời Likert (1–5) thành % cho từng nhóm và mã 3 chữ cái. */
export function scoreAnswers(questions: RiasecQuestion[], answers: QuizAnswers, completedAt = new Date().toISOString()): RiasecResult {
  const sums = Object.fromEntries(RIASEC_TYPES.map((t) => [t, 0])) as Record<RiasecType, number>;
  const counts = Object.fromEntries(RIASEC_TYPES.map((t) => [t, 0])) as Record<RiasecType, number>;
  let answered = 0;
  for (const q of questions) {
    const v = answers[q.id];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) {
      sums[q.type] += v - 1; // 0..4
      counts[q.type] += 1;
      answered += 1;
    }
  }
  const percents = Object.fromEntries(
    RIASEC_TYPES.map((t) => [t, counts[t] ? Math.round((sums[t] / (counts[t] * 4)) * 100) : 0]),
  ) as Record<RiasecType, number>;
  // Hoà điểm: giữ thứ tự R-I-A-S-E-C để kết quả ổn định.
  const ranking = [...RIASEC_TYPES].sort((a, b) => percents[b] - percents[a] || RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b));

  // Phát hiện các nhóm hoà điểm hoặc xấp xỉ nhau (chênh lệch <= 2%) (GIAI ĐOẠN 6)
  const tiedDimensions: RiasecType[] = [];
  for (let i = 0; i < ranking.length - 1; i++) {
    const t1 = ranking[i];
    const t2 = ranking[i + 1];
    if (Math.abs(percents[t1] - percents[t2]) <= 2) {
      if (!tiedDimensions.includes(t1)) tiedDimensions.push(t1);
      if (!tiedDimensions.includes(t2)) tiedDimensions.push(t2);
    }
  }

  // Tính độ phân hóa (Differentiation Index = Standard Deviation của 6 nhóm)
  const values = Object.values(percents);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length || 1);
  const differentiation = Math.round(Math.sqrt(variance) * 10) / 10;
  // Nếu thí sinh trả lời nhiều câu nhưng độ phân hóa < 8.0 -> kết quả quá đều (flat profile)
  const isFlatProfile = answered >= 30 && differentiation < 8.0;

  // Tính điểm tin cậy khoa học
  let confidenceScore = Math.round((answered / (questions.length || 60)) * 90);
  if (isFlatProfile) confidenceScore = Math.min(confidenceScore, 45);

  const caveat = "Kết quả trắc nghiệm sở thích Holland mang tính định hướng tham khảo, không cấu thành đánh giá tâm lý lâm sàng hoặc chẩn đoán năng lực nghề nghiệp.";

  return {
    percents,
    ranking,
    code: [ranking[0], ranking[1], ranking[2]],
    completedAt,
    answered,
    differentiation,
    isFlatProfile,
    tiedDimensions: tiedDimensions.length > 0 ? tiedDimensions : undefined,
    caveat,
    confidenceScore,
  };
}

/**
 * Validate sâu câu trả lời trắc nghiệm (GIAI ĐOẠN 6).
 * Đảm bảo đủ câu, điểm Likert hợp lệ (1–5 nguyên), không trùng câu, phát hiện thiếu câu.
 */
export function validateQuizAnswers(
  questions: RiasecQuestion[],
  rawAnswers: unknown,
): { ok: true; answers: QuizAnswers } | { ok: false; message: string; missingIds?: number[] } {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    return { ok: false, message: "Dữ liệu câu trả lời không hợp lệ." };
  }

  const map = rawAnswers as Record<string, unknown>;
  const cleanAnswers: QuizAnswers = {};
  const missingIds: number[] = [];

  for (const q of questions) {
    const rawVal = map[String(q.id)] ?? map[q.id];
    if (typeof rawVal !== "number" || !Number.isInteger(rawVal) || rawVal < 1 || rawVal > 5) {
      missingIds.push(q.id);
    } else {
      cleanAnswers[q.id] = rawVal;
    }
  }

  if (missingIds.length > 0) {
    return {
      ok: false,
      message: `Thiếu hoặc không hợp lệ ${missingIds.length}/${questions.length} câu trả lời. Vui lòng hoàn thành đủ các câu hỏi với thang điểm 1–5.`,
      missingIds,
    };
  }

  return { ok: true, answers: cleanAnswers };
}

/**
 * Validate sâu đối tượng RiasecResult (GIAI ĐOẠN 6).
 * Chống giả mạo code hoặc percents từ client.
 */
export function sanitizeRiasecResult(input: unknown): RiasecResult | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;

  if (!obj.percents || typeof obj.percents !== "object" || Array.isArray(obj.percents)) return null;
  const p = obj.percents as Record<string, unknown>;
  const cleanPercents = {} as Record<RiasecType, number>;

  for (const t of RIASEC_TYPES) {
    const raw = p[t];
    const v = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    if (v < 0 || v > 100) return null;
    cleanPercents[t] = Math.round(v);
  }

  // Luôn tái tính toán ranking & code chuẩn từ percents thay vì tin tưởng client
  const ranking = [...RIASEC_TYPES].sort((a, b) => cleanPercents[b] - cleanPercents[a] || RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b));
  const expectedCode: [RiasecType, RiasecType, RiasecType] = [ranking[0], ranking[1], ranking[2]];

  const completedAt = typeof obj.completedAt === "string" && obj.completedAt.length > 0
    ? obj.completedAt
    : new Date().toISOString();

  const answered = typeof obj.answered === "number" && Number.isInteger(obj.answered) && obj.answered >= 0 && obj.answered <= 60
    ? obj.answered
    : 60;

  // Tính lại độ phân hóa
  const values = Object.values(cleanPercents);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length || 1);
  const differentiation = Math.round(Math.sqrt(variance) * 10) / 10;
  const isFlatProfile = differentiation < 8.0;

  const tiedDimensions: RiasecType[] = [];
  for (let i = 0; i < ranking.length - 1; i++) {
    const t1 = ranking[i];
    const t2 = ranking[i + 1];
    if (Math.abs(cleanPercents[t1] - cleanPercents[t2]) <= 2) {
      if (!tiedDimensions.includes(t1)) tiedDimensions.push(t1);
      if (!tiedDimensions.includes(t2)) tiedDimensions.push(t2);
    }
  }

  return {
    percents: cleanPercents,
    ranking,
    code: expectedCode,
    completedAt,
    answered,
    differentiation,
    isFlatProfile,
    tiedDimensions: tiedDimensions.length > 0 ? tiedDimensions : undefined,
    caveat: "Kết quả trắc nghiệm sở thích Holland mang tính định hướng tham khảo, không cấu thành đánh giá tâm lý lâm sàng hoặc chẩn đoán năng lực nghề nghiệp.",
    confidenceScore: isFlatProfile ? 45 : 90,
  };
}

/** Kiểm tra dữ liệu RIASEC client gửi lên: % trong 0–100, mã gồm 3 chữ cái hợp lệ khác nhau. */
export function sanitizeRiasec(input: unknown): Pick<RiasecResult, "percents" | "code"> | null {
  const full = sanitizeRiasecResult(input);
  if (!full) return null;
  return { percents: full.percents, code: full.code };
}

/** Mức độ phù hợp giữa hồ sơ RIASEC và mã Holland của ngành (0–100). */
import { matchMajor } from "./riasec-match";
export { matchMajor };

export const riasecService = {
  async getQuestions() {
    return repositories.quiz.findQuestions();
  },

  async evaluate(answers: QuizAnswers) {
    const questions = await repositories.quiz.findQuestions();
    return scoreAnswers(questions, answers);
  },

  async recommendMajors(result: Pick<RiasecResult, "percents" | "code">, limit = 6) {
    const [majors, groups] = await Promise.all([repositories.majors.findAll(), repositories.majors.findGroups()]);
    return majors
      .map((major) => ({ major, group: groups.find((g) => g.id === major.groupId)!, match: matchMajor(result, major) }))
      .sort((a, b) => b.match - a.match)
      .slice(0, limit);
  },
};
