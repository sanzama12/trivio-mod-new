import type { RiasecType } from "./types";
import { RIASEC_QUESTIONS } from "./riasec-questions";
export const RIASEC_ORDER: RiasecType[] = ["R","I","A","S","E","C"];
export const RIASEC_INFO: Record<RiasecType,{label:string;name:string;desc:string}> = {
  R:{label:"Thực tế",name:"Thực tế (Realistic)",desc:"Thích làm việc tay chân, kỹ thuật."},
  I:{label:"Nghiên cứu",name:"Nghiên cứu (Investigative)",desc:"Thích tìm tòi, phân tích."},
  A:{label:"Nghệ thuật",name:"Nghệ thuật (Artistic)",desc:"Thích sáng tạo."},
  S:{label:"Xã hội",name:"Xã hội (Social)",desc:"Thích giúp đỡ, giảng dạy."},
  E:{label:"Lãnh đạo",name:"Lãnh đạo (Enterprising)",desc:"Thích kinh doanh, thuyết phục."},
  C:{label:"Nghiệp vụ",name:"Nghiệp vụ (Conventional)",desc:"Thích số liệu, quy trình."},
};


export const LIKERT_LABELS = ["Rất không thích", "Không thích", "Bình thường", "Thích", "Rất thích"] as const;
export const QUESTIONS_PER_PAGE = 6;
export type RiasecAnswers = Record<string, number>;
export type RiasecCode = [RiasecType, RiasecType, RiasecType];

// Tách khỏi RiasecResult trong hồ sơ tài khoản: bài này chỉ lưu trên trình duyệt.
export interface RiasecQuizScore {
  scores: Record<RiasecType, number>;
  percents: Record<RiasecType, number>;
  code: RiasecCode;
  answered: number;
  total: number;
}

export function isLikertAnswer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= LIKERT_LABELS.length;
}

/** Chỉ giữ câu có trong ngân hàng và đáp án nguyên 1–5; không nhận dữ liệu lạ từ storage. */
export function sanitizeRiasecAnswers(input: unknown): RiasecAnswers {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  return Object.fromEntries(RIASEC_QUESTIONS.flatMap(({ id }) =>
    Object.hasOwn(raw, id) && isLikertAnswer(raw[id]) ? [[id, raw[id]]] : [],
  ));
}

export function unansweredRiasecIds(answers: RiasecAnswers, page: number): string[] {
  const start = Math.max(0, Math.floor(page)) * QUESTIONS_PER_PAGE;
  return RIASEC_QUESTIONS.slice(start, start + QUESTIONS_PER_PAGE)
    .filter(({ id }) => !isLikertAnswer(answers[id])).map(({ id }) => id);
}

/** Likert 1–5 → điểm 0–4; mẫu số luôn là tối đa của TẤT CẢ câu trong nhóm. */
export function scoreRiasec(answers: RiasecAnswers): RiasecQuizScore {
  const clean = sanitizeRiasecAnswers(answers);
  const scores = Object.fromEntries(RIASEC_ORDER.map((type) => [type, 0])) as Record<RiasecType, number>;
  const maximums = { ...scores };
  for (const question of RIASEC_QUESTIONS) {
    maximums[question.type] += LIKERT_LABELS.length - 1;
    if (isLikertAnswer(clean[question.id])) scores[question.type] += clean[question.id] - 1;
  }
  const percents = Object.fromEntries(RIASEC_ORDER.map((type) =>
    [type, maximums[type] ? Math.round(scores[type] / maximums[type] * 100) : 0],
  )) as Record<RiasecType, number>;
  const ranking = [...RIASEC_ORDER].sort((a, b) =>
    scores[b] - scores[a] || RIASEC_ORDER.indexOf(a) - RIASEC_ORDER.indexOf(b),
  );
  return { scores, percents, code: [ranking[0], ranking[1], ranking[2]], answered: Object.keys(clean).length, total: RIASEC_QUESTIONS.length };
}

export const GROUP_RIASEC: Record<string, RiasecType[]> = {
  "cntt": ["I", "R", "C"],
  "kinh-te": ["E", "C", "S"],
  "y-duoc": ["I", "S", "R"],
  "ky-thuat": ["R", "I", "C"],
  "xa-hoi": ["S", "A", "I"],
  "nghe-thuat": ["A", "E", "R"],
  "giao-duc": ["S", "A", "E"],
  "nong-lam": ["R", "I", "S"],
};

/** Nhóm đứng thứ 1/2/3 trong mã cá nhân đóng góp 3/2/1 điểm; tối đa 6 điểm = 100%. */
export function matchMajorRiasec(code: readonly RiasecType[], major: { riasec: RiasecType[]; groupId: string }): number {
  const profile = major.riasec.length ? major.riasec : GROUP_RIASEC[major.groupId] ?? [];
  const uniqueCode = [...new Set(code)].slice(0, 3);
  const matched = uniqueCode.reduce((sum, type, index) => sum + (profile.includes(type) ? 3 - index : 0), 0);
  return Math.max(0, Math.min(100, Math.round(matched / 6 * 100)));
}
