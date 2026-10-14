"use client";

import Link from "next/link";
import { serializeProgramFilters, type ProgramFilters } from "@/services/program.filters";
import { useTrovio } from "@/stores/trovio-store";
import { ADMISSION_METHODS, formatMethodScore, profileScore } from "@/services/scoring.service";

/** Gợi ý dùng hồ sơ điểm đã lưu khi URL chưa có điểm. */
export function SavedScoreHint({ filters }: { filters: ProgramFilters }) {
  const { profile, hydrated } = useTrovio();
  if (!hydrated) return null;
  if (!profile) {
    return (
      <Link href="/diem-cua-toi" className="font-semibold text-primary-600 hover:underline">
        Nhập điểm để xem mức độ phù hợp
      </Link>
    );
  }
  const { method, total } = profileScore(profile);
  const cfg = ADMISSION_METHODS[method];
  const combos = cfg.needsCombo ? (filters.combos?.length ? filters.combos : [profile.combo]) : filters.combos;
  const href = `/chuong-trinh${serializeProgramFilters({ ...filters, method, score: total, combos, page: undefined })}`;
  return (
    <Link href={href} className="font-semibold text-primary-600 hover:underline">
      Dùng điểm đã lưu ({formatMethodScore(total, method)} · {cfg.needsCombo ? profile.combo : cfg.short})
    </Link>
  );
}
