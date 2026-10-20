"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuListFilter, LuX } from "react-icons/lu";
import type { AdmissionMethodKey, Combo, MajorGroup, Region, SchoolType, Subject } from "@/domain/types";
import { ADMISSION_METHODS, METHOD_KEYS } from "@/services/scoring.service";
import {
  REGION_LABELS,
  SCHOOL_TYPE_LABELS,
  serializeProgramFilters,
  TUITION_RANGES,
  type ProgramFilters,
  type TuitionRange,
} from "@/services/program.filters";
import { cn } from "@/lib/cn";
import { Checkbox, Input, Label, Radio } from "@/components/ui/field";
import { MobileFilterSheet } from "./mobile-filter-sheet";

/** Bộ lọc áp dụng NGAY khi thay đổi (không cần nút "Áp dụng"), trạng thái nằm trên URL. */
export function FilterPanel({ filters, combos, subjects, groups }: { filters: ProgramFilters; combos: Combo[]; subjects: Subject[]; groups: MajorGroup[] }) {
  const short = (id: string) => subjects.find((s) => s.id === id)?.short ?? id;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState(filters);
  const draftRef = useRef(filters);
  const [score, setScore] = useState(filters.score?.toString() ?? "");
  const [showAllCombos, setShowAllCombos] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    draftRef.current = filters;
    setDraft(filters);
    setPending(false);
  }, [filters]);

  useEffect(() => setScore(draft.score?.toString() ?? ""), [draft.score]);

  const apply = (patch: Partial<ProgramFilters>) => {
    const next = { ...draftRef.current, ...patch, page: undefined };
    draftRef.current = next;
    setDraft(next);
    const query = serializeProgramFilters(next);
    setPending(true);
    router.push(`${pathname}${query}`, { scroll: false });
  };

  const toggle = <T extends string>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;

  const method: AdmissionMethodKey = draft.method ?? "thpt";
  const cfg = ADMISSION_METHODS[method];
  const commitScore = () => {
    const n = Number(score.replace(",", "."));
    if (!score) return apply({ score: undefined });
    if (Number.isFinite(n) && n > 0 && n <= cfg.max) apply({ score: Math.round(n * 100) / 100 });
  };
  const scoreInvalid = score !== "" && !(Number(score.replace(",", ".")) > 0 && Number(score.replace(",", ".")) <= cfg.max);

  const chips: { label: string; clear: (current: ProgramFilters) => Partial<ProgramFilters> }[] = [
    ...(draft.q ? [{ label: `“${draft.q}”`, clear: () => ({ q: undefined }) }] : []),
    ...(draft.method && draft.method !== "thpt" ? [{ label: ADMISSION_METHODS[draft.method].short, clear: () => ({ method: undefined, score: undefined }) }] : []),
    ...(draft.score != null ? [{ label: `Điểm ${draft.score}`, clear: () => ({ score: undefined }) }] : []),
    ...(draft.combos ?? []).map((c) => ({ label: c, clear: (current: ProgramFilters) => ({ combos: (current.combos ?? []).filter((x) => x !== c) }) })),
    ...(draft.tuition ? [{ label: TUITION_RANGES[draft.tuition].label, clear: () => ({ tuition: undefined }) }] : []),
    ...(draft.regions ?? []).map((r) => ({ label: REGION_LABELS[r], clear: (current: ProgramFilters) => ({ regions: (current.regions ?? []).filter((x) => x !== r) }) })),
    ...(draft.types ?? []).map((t) => ({ label: SCHOOL_TYPE_LABELS[t], clear: (current: ProgramFilters) => ({ types: (current.types ?? []).filter((x) => x !== t) }) })),
    ...(draft.majors?.length ? [{ label: `${draft.majors.length} ngành gợi ý`, clear: () => ({ majors: [] }) }] : []),
    ...(draft.groups ?? []).map((g) => ({ label: groupName(g), clear: (current: ProgramFilters) => ({ groups: (current.groups ?? []).filter((x) => x !== g) }) })),
  ];

  const visibleCombos = showAllCombos ? combos : combos.slice(0, 5);

  return (
    <aside aria-label="Bộ lọc tìm kiếm" className={cn("min-w-0 rounded-xl border-2 border-slate-900 bg-white p-3 transition-opacity md:p-4", pending && "opacity-70")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Bộ lọc tìm kiếm</h2>
        <div className="flex items-center gap-3">
          {chips.length > 0 && (
            <button
              type="button"
              onClick={() => {
                draftRef.current = {};
                setDraft({});
                setScore("");
                setPending(true);
                router.push(pathname, { scroll: false });
              }}
              className="text-[13px] font-semibold text-primary-600 hover:underline"
            >
              Xoá bộ lọc
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-700 lg:hidden"
          >
            <LuListFilter className="size-4" aria-hidden /> Bộ lọc{chips.length ? ` (${chips.length})` : ""}
          </button>
        </div>
      </div>

      <MobileFilterSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        filters={draft}
        combos={combos}
        subjects={subjects}
        groups={groups}
        onChange={apply}
      />
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5 lg:hidden" aria-label="Bộ lọc đang áp dụng">
          {chips.map((c) => (
            <li key={c.label}>
              <button type="button" onClick={() => apply(c.clear(draftRef.current))} className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700" aria-label={`Bỏ lọc ${c.label}`}>
                {c.label} <LuX className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {groups.length > 0 && (
        <fieldset className="mt-3 min-w-0 rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">Danh mục / Nhóm ngành</legend>
          <div className="mt-2 space-y-1">
            {groups.map((g) => (
              <Checkbox
                key={g.id}
                label={<span className="break-words">{g.name}</span>}
                className="min-h-10 items-center"
                checked={draft.groups?.includes(g.id) ?? false}
                onChange={() => apply({ groups: toggle(draftRef.current.groups, g.id) })}
              />
            ))}
          </div>
        </fieldset>
      )}

      <div id="filter-body" className="mt-3 hidden min-w-0 flex-col gap-3 lg:flex">

      {chips.length > 0 && (
        <div className="min-w-0 basis-full">
          <p className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">Bộ lọc đang áp dụng</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => apply(c.clear(draftRef.current))}
                className="flex min-w-0 items-center gap-1 rounded-full border border-slate-900 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-slate-100"
                aria-label={`Bỏ lọc ${c.label}`}
              >
                <span className="truncate">{c.label}</span>
                <LuX className="size-3 shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 basis-[220px] rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
        <Label htmlFor="f-method">Phương thức xét tuyển</Label>
        <select
          id="f-method"
          value={method}
          onChange={(e) => {
            const m = e.target.value as AdmissionMethodKey;
            // Đổi thang điểm → bỏ điểm cũ để không so sai thang.
            setScore("");
            apply({ method: m === "thpt" ? undefined : m, score: undefined });
          }}
          className="mb-4 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        >
          {METHOD_KEYS.map((k) => (
            <option key={k} value={k}>
              {ADMISSION_METHODS[k].label}
            </option>
          ))}
        </select>
        <Label htmlFor="f-score">Điểm xét tuyển của bạn</Label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitScore();
          }}
          className="flex gap-2"
        >
          <Input
            id="f-score"
            inputMode="decimal"
            placeholder={method === "thpt" || method === "hocba" ? "VD: 26.5" : `0 – ${cfg.max}`}
            value={score}
            invalid={scoreInvalid}
            onChange={(e) => setScore(e.target.value)}
            onBlur={commitScore}
            aria-describedby="f-score-hint"
          />
        </form>
        <p id="f-score-hint" className={cn("mt-1.5 text-xs", scoreInvalid ? "text-danger-700" : "text-slate-500")}>
          {scoreInvalid
            ? `Nhập điểm từ 0 đến ${cfg.max}.`
            : cfg.needsCombo
              ? `Tổng 3 môn + điểm ưu tiên (thang ${cfg.max}).`
              : `Điểm bài thi + ưu tiên quy đổi (thang ${cfg.max}). Chỉ hiện trường xét phương thức này.`}
        </p>
      </div>

      <div className="min-w-0 flex-1 basis-[220px] rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">Khối / Tổ hợp xét tuyển</legend>
        <div className="space-y-2.5">
          {visibleCombos.map((c) => (
            <Checkbox
              key={c.code}
              label={`${c.code} (${c.subjects.map(short).join(", ")})`}
              checked={draft.combos?.includes(c.code) ?? false}
              onChange={() => apply({ combos: toggle(draftRef.current.combos, c.code) })}
            />
          ))}
        </div>
        {combos.length > 5 && (
          <button type="button" onClick={() => setShowAllCombos((v) => !v)} className="mt-3 text-[13px] font-semibold text-primary-600 hover:underline">
            {showAllCombos ? "Thu gọn" : `Xem thêm ${combos.length - 5} tổ hợp`}
          </button>
        )}
      </fieldset>
      </div>

      <div className="min-w-0 flex-1 basis-[200px] rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">Học phí tối đa / năm</legend>
        <div className="space-y-2.5">
          <Radio name="tuition" label="Không giới hạn" checked={!draft.tuition} onChange={() => apply({ tuition: undefined })} />
          {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((k) => (
            <Radio key={k} name="tuition" label={TUITION_RANGES[k].label} checked={draft.tuition === k} onChange={() => apply({ tuition: k })} />
          ))}
        </div>
      </fieldset>
      </div>

      <div className="min-w-0 flex-1 basis-[180px] rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">Khu vực địa lý</legend>
        <div className="space-y-2.5">
          {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
            <Checkbox key={r} label={REGION_LABELS[r]} checked={draft.regions?.includes(r) ?? false} onChange={() => apply({ regions: toggle(draftRef.current.regions, r) })} />
          ))}
        </div>
      </fieldset>
      </div>

      <div className="min-w-0 flex-1 basis-[180px] rounded-lg border border-slate-200 bg-[#fafaf6] p-3">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">Loại hình trường</legend>
        <div className="space-y-2.5">
          {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => (
            <Checkbox key={t} label={SCHOOL_TYPE_LABELS[t]} checked={draft.types?.includes(t) ?? false} onChange={() => apply({ types: toggle(draftRef.current.types, t) })} />
          ))}
        </div>
      </fieldset>
      </div>
      </div>
    </aside>
  );
}
