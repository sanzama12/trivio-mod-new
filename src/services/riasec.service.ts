import type { RiasecResult, RiasecType } from "../domain/types";
import { RIASEC_ORDER } from "../domain/riasec";
export { matchMajor } from "../domain/riasec";
import { RIASEC_ASSESSMENT_VERSION, RIASEC_QUESTIONS, RIASEC_SCORING_VERSION } from "../domain/riasec-questions";

export const RIASEC_TYPES = RIASEC_ORDER;
export type QuizAnswers = Record<string, number>;
type InterestProfile = Pick<RiasecResult, "percents" | "code">;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const rank = (percents: Record<RiasecType, number>) =>
  [...RIASEC_ORDER].sort((a, b) => percents[b] - percents[a]);

export function sanitizeRiasec(value: unknown): InterestProfile | null {
  if (!isRecord(value) || !isRecord(value.percents)) return null;
  const percents = {} as Record<RiasecType, number>;
  for (const type of RIASEC_ORDER) {
    const score = value.percents[type];
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
    percents[type] = Math.round(score * 100) / 100;
  }
  const ranking = rank(percents);
  return { percents, code: ranking.slice(0, 3) as InterestProfile["code"] };
}

function describeProfile(percents: Record<RiasecType, number>) {
  const values = Object.values(percents);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const differentiation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  const ranking = rank(percents);
  return {
    ranking,
    differentiation: Math.round(differentiation * 100) / 100,
    isFlatProfile: differentiation < 8,
    tiedDimensions: ranking.filter((type) => percents[ranking[0]] - percents[type] <= 2),
  };
}

export function sanitizeRiasecResult(value: unknown): RiasecResult | null {
  const profile = sanitizeRiasec(value);
  if (!profile || !isRecord(value) || typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
  const answered = value.answered;
  const count = value.questionCount ?? answered;
  if (typeof answered !== "number" || !Number.isInteger(answered) || answered < 6 || answered > 300 || count !== answered) return null;
  return {
    ...profile,
    ...describeProfile(profile.percents),
    completedAt: new Date(value.completedAt).toISOString(),
    answered,
    questionCount: answered,
    assessmentVersion: typeof value.assessmentVersion === "string" ? value.assessmentVersion.slice(0, 100) : "legacy",
    scoringModelVersion: typeof value.scoringModelVersion === "string" ? value.scoringModelVersion.slice(0, 100) : "legacy",
  };
}

/** Ten items per type, rated 0–4, yield raw scores 0–40 and a 0–100 scale. */
export function scoreAnswers(answers: QuizAnswers): RiasecResult | null {
  const totals: Record<RiasecType, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const question of RIASEC_QUESTIONS) {
    const value = answers[question.id];
    if (!Number.isInteger(value) || value < 0 || value > 4) return null;
    totals[question.type] += value;
  }
  const percents = Object.fromEntries(RIASEC_ORDER.map((type) => [type, totals[type] * 2.5])) as Record<RiasecType, number>;
  const description = describeProfile(percents);
  return {
    percents,
    ...description,
    code: description.ranking.slice(0, 3) as RiasecResult["code"],
    completedAt: new Date().toISOString(),
    answered: RIASEC_QUESTIONS.length,
    questionCount: RIASEC_QUESTIONS.length,
    assessmentVersion: RIASEC_ASSESSMENT_VERSION,
    scoringModelVersion: RIASEC_SCORING_VERSION,
  };
}
