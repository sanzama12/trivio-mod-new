import type { RiasecResult, RiasecType } from "../domain/types";
import { RIASEC_ORDER } from "../domain/riasec";
export const RIASEC_TYPES = RIASEC_ORDER;
export type QuizAnswers = Record<string, number>;
export function matchMajor(r: any, m: { riasec: RiasecType[] }): number {
  if (!r) return 50;
  const code: string[] = r.code ?? [];
  let s = 0;
  m.riasec.forEach((t, i) => { const idx = code.indexOf(t); if (idx >= 0) s += 3 - idx + (3 - i) * 0.5; });
  return Math.max(0, Math.min(100, Math.round(40 + s * 8)));
}
export function sanitizeRiasec(v: unknown): Pick<RiasecResult, "percents" | "code"> | null {
  if (!v || typeof v !== "object") return null;
  const o = v as any;
  if (!Array.isArray(o.code)) return null;
  return o as any;
}
export function sanitizeRiasecResult(v: unknown): RiasecResult | null { return (v as RiasecResult) ?? null; }
export function scoreAnswers(_a: QuizAnswers): null { return null; }
export const riasecService = {
  async recommendMajors(_r: Pick<RiasecResult, "percents" | "code">, _n = 3): Promise<never[]> { return []; },
};
