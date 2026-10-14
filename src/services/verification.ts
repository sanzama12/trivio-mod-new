/** Huy hiệu "Trường đã xác nhận": còn hiệu lực trong 12 tháng kể từ ngày trường xác nhận. */
import type { Program } from "../domain/types";

export const VERIFY_VALID_MONTHS = 12;

export function verifiedStatus(p: Pick<Program, "schoolVerifiedAt">, now: Date = new Date()) {
  const at = p.schoolVerifiedAt ? new Date(p.schoolVerifiedAt) : null;
  if (!at || Number.isNaN(at.getTime())) return { active: false, expired: false, dateLabel: null as string | null };
  const limit = new Date(at);
  limit.setMonth(limit.getMonth() + VERIFY_VALID_MONTHS);
  const dateLabel = `${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}/${at.getFullYear()}`;
  const expired = now > limit;
  return { active: !expired && at <= now, expired, dateLabel };
}
