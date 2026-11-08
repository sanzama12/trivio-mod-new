import { RIASEC_QUESTIONS } from "@/domain/riasec-questions";
import { RIASEC_ORDER, sanitizeRiasecAnswers, type RiasecAnswers, type RiasecQuizScore } from "@/domain/riasec";

export const RIASEC_DRAFT_KEY = "trovio:riasec:draft";
export const RIASEC_RESULT_KEY = "trovio:riasec:result";
export interface StoredRiasecResult extends RiasecQuizScore {
  completedAt: string;
}

// Giữ bài đang làm và kết quả qua điều hướng client khi storage bị chặn.
// Không nối vào store tài khoản hay thuật toán gợi ý chương trình.
let sessionAnswers: RiasecAnswers = {};
let sessionResult: StoredRiasecResult | null = null;
let draftOnlyInMemory = false;
let resultOnlyInMemory = false;

export function parseStoredRiasecResult(input: unknown): StoredRiasecResult | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Partial<StoredRiasecResult>;
  if (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
  if (value.total !== RIASEC_QUESTIONS.length || value.answered !== value.total) return null;
  if (!Array.isArray(value.code) || value.code.length !== 3 || new Set(value.code).size !== 3 ||
      !value.code.every((type) => RIASEC_ORDER.includes(type))) return null;
  const scores = {} as StoredRiasecResult["scores"];
  const percents = {} as StoredRiasecResult["percents"];
  for (const type of RIASEC_ORDER) {
    const score = value.scores?.[type];
    const percent = value.percents?.[type];
    const maximum = RIASEC_QUESTIONS.filter((question) => question.type === type).length * 4;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > maximum ||
        typeof percent !== "number" || percent !== Math.round(score / maximum * 100)) return null;
    scores[type] = score;
    percents[type] = percent;
  }
  const ranking = [...RIASEC_ORDER].sort((a, b) => scores[b] - scores[a] || RIASEC_ORDER.indexOf(a) - RIASEC_ORDER.indexOf(b));
  if (!value.code.every((type, index) => type === ranking[index])) return null;
  return { scores, percents, code: [ranking[0], ranking[1], ranking[2]], answered: value.answered, total: value.total, completedAt: value.completedAt };
}

export function readRiasecDraft(): RiasecAnswers {
  if (draftOnlyInMemory) return sessionAnswers;
  try {
    sessionAnswers = sanitizeRiasecAnswers(JSON.parse(window.localStorage.getItem(RIASEC_DRAFT_KEY) ?? "null"));
  } catch { /* Storage không khả dụng: dùng bộ nhớ của phiên này. */ }
  return sessionAnswers;
}

export function saveRiasecDraft(answers: RiasecAnswers): boolean {
  sessionAnswers = sanitizeRiasecAnswers(answers);
  try {
    window.localStorage.setItem(RIASEC_DRAFT_KEY, JSON.stringify(sessionAnswers));
    draftOnlyInMemory = false;
    return true;
  } catch { draftOnlyInMemory = true; return false; }
}

export function readRiasecResult(): StoredRiasecResult | null {
  if (resultOnlyInMemory) return sessionResult;
  try {
    sessionResult = parseStoredRiasecResult(JSON.parse(window.localStorage.getItem(RIASEC_RESULT_KEY) ?? "null"));
  } catch { /* Storage không khả dụng: dùng kết quả của phiên này. */ }
  return sessionResult;
}

export function saveRiasecResult(result: StoredRiasecResult): boolean {
  sessionResult = result;
  try {
    window.localStorage.setItem(RIASEC_RESULT_KEY, JSON.stringify(result));
    resultOnlyInMemory = false;
    return true;
  } catch { resultOnlyInMemory = true; return false; }
}

export function isRiasecResultSaved(): boolean {
  return !resultOnlyInMemory;
}

export function clearRiasecDraft(): boolean {
  sessionAnswers = {};
  try {
    window.localStorage.removeItem(RIASEC_DRAFT_KEY);
    draftOnlyInMemory = false;
    return true;
  } catch { draftOnlyInMemory = true; return false; }
}

export function clearRiasecQuiz(): boolean {
  sessionResult = null;
  const draftCleared = clearRiasecDraft();
  try {
    window.localStorage.removeItem(RIASEC_RESULT_KEY);
    resultOnlyInMemory = false;
    return draftCleared;
  } catch { resultOnlyInMemory = true; return false; }
}
