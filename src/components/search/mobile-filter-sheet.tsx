"use client";

/**
 * M-S02 — Bộ lọc dạng bottom sheet trên điện thoại (theo Figma "Bộ lọc (Overlay bottom sheet)").
 * Mọi lựa chọn hợp lệ được áp dụng ngay lên URL và danh sách kết quả.
 */
import { buttonClass } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import type { Combo, MajorGroup, Region, SchoolType, Subject } from "@/domain/types";
import { ADMISSION_METHODS } from "@/services/scoring.service";
import { REGION_LABELS, SCHOOL_TYPE_LABELS, serializeProgramFilters, TUITION_RANGES, type ProgramFilters, type TuitionRange } from "@/services/program.filters";
import { useModal } from "@/components/ui/use-modal";
import { cn } from "@/lib/cn";
import { apiRequest } from "@/lib/api-client";

const chip = (on: boolean) => cn("inline-flex h-9 max-sm:h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors", on ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary-300");
const SHORT_TUITION: Record<TuitionRange, string> = { "duoi-15": "Dưới 15 triệu", "15-30": "15–30 triệu", "30-50": "30–50 triệu", "tren-50": "Trên 50 triệu" };

export function MobileFilterSheet({ open, onClose, filters, combos, subjects, groups, onChange }: { open: boolean; onClose: () => void; filters: ProgramFilters; combos: Combo[]; subjects: Subject[]; groups: MajorGroup[]; onChange: (f: ProgramFilters) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, open, onClose);
  const [draft, setDraft] = useState<ProgramFilters>(filters);
  const [score, setScore] = useState(filters.score?.toString() ?? "");
  const [allCombos, setAllCombos] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const method = draft.method ?? "thpt";
  const max = ADMISSION_METHODS[method].max;

  useEffect(() => {
    if (open) {
      setDraft(filters);
      setScore(filters.score?.toString() ?? "");
    }
  }, [open, filters]);

  // Đếm số kết quả theo bản nháp (trễ 250ms, huỷ yêu cầu cũ).
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const response = await apiRequest<unknown[]>(`/api/v1/programs${serializeProgramFilters({ ...draft, page: undefined, sort: undefined }) || "?"}&limit=1`, { signal: ctrl.signal });
        setCount(typeof response.meta.total === "number" ? response.meta.total : null);
      } catch {
        /* huỷ hoặc mất mạng: giữ số cũ */
      }
    }, 250);
    return () => (clearTimeout(t), ctrl.abort());
  }, [draft, open]);

  if (!open) return null;
  const short = (id: string) => subjects.find((s) => s.id === id)?.short ?? id;
  const toggle = <T extends string>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);
  const applyDraft = (next: ProgramFilters) => {
    setDraft(next);
    onChange(next);
  };
  const setScoreDraft = (v: string) => {
    setScore(v);
    const n = Number(v.replace(",", "."));
    if (v === "") return applyDraft({ ...draft, score: undefined });
    if (Number.isFinite(n) && n > 0 && n <= max) applyDraft({ ...draft, score: Math.round(n * 100) / 100 });
  };
  const invalid = score !== "" && !(Number(score.replace(",", ".")) > 0 && Number(score.replace(",", ".")) <= max);
  const shown = allCombos ? combos : combos.slice(0, 5);
  const clearAll: ProgramFilters = { q: filters.q, sort: filters.sort };

  return (
    <div className="fixed inset-0 z-[65] lg:hidden">
      <button type="button" tabIndex={-1} aria-label="Đóng bộ lọc" className="absolute inset-0 bg-slate-900/70" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-elevated">
        <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 id="sheet-title" className="text-lg font-semibold text-slate-900">
            Bộ lọc
          </h2>
          <button type="button" className="text-sm font-semibold text-primary-600" onClick={() => (applyDraft(clearAll), setScore(""))}>
            Xoá tất cả
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4">
          {/* 1. Điểm xét tuyển */}
          <div>
            <label htmlFor="sheet-score" className="text-base font-semibold text-slate-900">
              {method === "thpt" ? "Điểm thi tốt nghiệp THPT" : `Điểm ${ADMISSION_METHODS[method].short}`}
            </label>
            <div className={cn("mt-2 flex h-12 items-center rounded-xl border px-4", invalid ? "border-danger-500" : "border-slate-300 focus-within:border-primary-600")}>
              <input id="sheet-score" inputMode="decimal" value={score} onChange={(e) => setScoreDraft(e.target.value)} placeholder="26.5" className="w-20 bg-transparent text-base font-semibold text-slate-900 outline-none" aria-invalid={invalid || undefined} aria-describedby="sheet-score-hint" />
              <span className="shrink-0 text-base text-slate-600">/ {max} điểm</span>
            </div>
            <p id="sheet-score-hint" className={cn("mt-1.5 text-sm", invalid ? "text-danger-700" : "text-slate-600")}>
              {invalid ? `Điểm phải từ 0 đến ${max}.` : method === "thpt" ? "Tổng điểm 3 môn theo tổ hợp xét tuyển" : ADMISSION_METHODS[method].label}
            </p>
          </div>

          {/* 2. Khối / Tổ hợp xét tuyển */}
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">Khối / Tổ hợp xét tuyển</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {shown.map((c) => {
                const on = !!draft.combos?.includes(c.code);
                return (
                  <button key={c.code} type="button" aria-pressed={on} className={chip(on)} onClick={() => applyDraft({ ...draft, combos: toggle(draft.combos, c.code) })}>
                    {c.code} {on ? `(${c.subjects.map(short).join(", ")})` : ""}
                  </button>
                );
              })}
              {combos.length > 5 && (
                <button type="button" className="px-2 text-sm font-semibold text-primary-600" onClick={() => setAllCombos((v) => !v)}>
                  {allCombos ? "Thu gọn" : `+${combos.length - 5} tổ hợp`}
                </button>
              )}
            </div>
          </fieldset>

          {/* 3. Danh mục / Nhóm ngành */}
          {groups.length > 0 && (
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">Danh mục / Nhóm ngành</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.map((g) => {
                const on = !!draft.groups?.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    className={cn(chip(on), "max-w-full h-auto min-h-9 max-sm:min-h-11 whitespace-normal py-2 text-left")}
                    onClick={() => {
                      const next = toggle(draft.groups, g.id);
                      applyDraft({ ...draft, groups: next });
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          {/* 4. Khu vực địa lý */}
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">Khu vực địa lý</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(REGION_LABELS) as Region[]).map((r) => {
                const on = !!draft.regions?.includes(r);
                return (
                  <button key={r} type="button" aria-pressed={on} className={chip(on)} onClick={() => applyDraft({ ...draft, regions: toggle(draft.regions, r) })}>
                    {REGION_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 5. Học phí tối đa / năm */}
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">Học phí tối đa / năm</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-pressed={!draft.tuition && draft.budgetMax == null} className={chip(!draft.tuition && draft.budgetMax == null)} onClick={() => applyDraft({ ...draft, tuition: undefined, budgetMax: undefined })}>Không giới hạn</button>
              {draft.budgetMax != null && <button type="button" className={chip(true)} aria-label={`Bỏ ngân sách tối đa ${draft.budgetMax} triệu`} onClick={() => applyDraft({ ...draft, budgetMax: undefined })}>Ngân sách ≤ {draft.budgetMax} triệu ×</button>}
              {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((t) => (
                <button key={t} type="button" aria-pressed={draft.tuition === t} className={chip(draft.tuition === t)} onClick={() => applyDraft({ ...draft, tuition: draft.tuition === t ? undefined : t, budgetMax: undefined })}>
                  {SHORT_TUITION[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">Loại hình</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-pressed={!draft.types?.length} className={chip(!draft.types?.length)} onClick={() => applyDraft({ ...draft, types: [] })}>
                Tất cả
              </button>
              {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => {
                const on = !!draft.types?.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={on} className={chip(on)} onClick={() => applyDraft({ ...draft, types: toggle(draft.types, t) })}>
                    {SCHOOL_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <button type="button" className={buttonClass({ full: true, size: "lg" })} onClick={onClose}>
            {count == null ? "Đóng" : `Đóng · ${count.toLocaleString("vi-VN")} kết quả`}
          </button>
        </div>
      </div>
    </div>
  );
}
