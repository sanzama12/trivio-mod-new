"use client";

import { useId, useState } from "react";
import { LuArrowRight, LuSlidersHorizontal } from "react-icons/lu";
import type { FitLevel, StoredProfile } from "@/domain/types";
import { ADMISSION_METHODS, FIT_LABELS, formatMethodScore, profileScore } from "@/services/scoring.service";
import { simulateDelta, type StrategyItem } from "@/services/wishlist-strategy";
import { cn } from "@/lib/cn";

const LEVEL_CLASS: Record<FitLevel, string> = {
  "an-toan": "bg-success-50 text-success-700",
  "vua-suc": "bg-primary-50 text-primary-700",
  "thu-suc": "bg-accent-50 text-accent-700",
};

function Level({ level }: { level: FitLevel | null }) {
  if (!level) return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Không xét</span>;
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", LEVEL_CLASS[level])}>{FIT_LABELS[level]}</span>;
}

/** Thanh kéo "Nếu điểm của mình thay đổi…": mô phỏng ±2 điểm (quy đổi theo thang của phương thức). */
export function WhatIfSimulator({ items, profile }: { items: StrategyItem[]; profile: StoredProfile }) {
  const id = useId();
  const [delta, setDelta] = useState(0);
  const now = profileScore(profile);
  const cfg = ADMISSION_METHODS[now.method];
  const step = 0.25 * cfg.factor;
  const range = 2 * cfg.factor;
  const next = profileScore(profile, delta);
  const sim = simulateDelta(items, profile, delta);
  const changed = sim.filter((x) => x.changed);
  const count = (key: "before" | "after", level: FitLevel) => sim.filter((x) => x[key] === level).length;
  const labelOf = (pid: string) => items.find((i) => i.id === pid)?.label ?? pid;

  return (
    <section aria-labelledby={`${id}-title`} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:p-5" data-print-hide>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <LuSlidersHorizontal className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id={`${id}-title`} className="font-bold text-slate-900">
              Nếu điểm của mình thay đổi…
            </h2>
            <p className="text-[13px] text-slate-500">Kéo để xem chương trình nào chuyển giữa An toàn, Vừa sức và Thử sức.</p>
          </div>
        </div>
        <p className="text-right text-sm">
          <span className="text-slate-500">{cfg.short}: </span>
          <strong className="text-slate-900">{formatMethodScore(now.total, now.method)}</strong>
          {delta !== 0 && (
            <>
              {" "}
              <LuArrowRight className="inline size-3.5 text-slate-400" aria-hidden />{" "}
              <strong className={delta > 0 ? "text-success-700" : "text-danger-700"}>{formatMethodScore(next.total, now.method)}</strong>
            </>
          )}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="w-12 text-right text-xs text-slate-500">−{formatMethodScore(range, now.method)}</span>
        <input
          id={`${id}-range`}
          type="range"
          min={-range}
          max={range}
          step={step}
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          aria-label="Mức thay đổi điểm"
          aria-valuetext={`${delta >= 0 ? "cộng" : "trừ"} ${Math.abs(delta)} điểm`}
          className="h-2 flex-1 cursor-pointer accent-primary-600"
        />
        <span className="w-12 text-xs text-slate-500">+{formatMethodScore(range, now.method)}</span>
        <button type="button" onClick={() => setDelta(0)} disabled={delta === 0} className="text-[13px] font-semibold text-primary-600 hover:underline disabled:text-slate-300 disabled:no-underline">
          Đặt lại
        </button>
      </div>
      <p className="mt-1 text-center text-sm font-semibold text-slate-700" aria-live="polite">
        {delta === 0 ? "Điểm hiện tại" : `${delta > 0 ? "+" : "−"}${formatMethodScore(Math.abs(delta), now.method)} điểm`}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px]">
        {(["thu-suc", "vua-suc", "an-toan"] as FitLevel[]).map((l) => (
          <div key={l} className={cn("rounded-xl px-2 py-2", LEVEL_CLASS[l])}>
            <p className="font-semibold">{FIT_LABELS[l]}</p>
            <p className="text-base font-extrabold">
              {count("before", l)}
              {delta !== 0 && count("before", l) !== count("after", l) && <span> → {count("after", l)}</span>}
            </p>
          </div>
        ))}
      </div>

      {delta !== 0 && (
        <div className="mt-4">
          {changed.length === 0 ? (
            <p className="text-[13px] text-slate-500">Không chương trình nào đổi mức với mức thay đổi này.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {changed.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-800">{labelOf(x.id)}</span>
                  <span className="flex items-center gap-1.5">
                    <Level level={x.before} /> <LuArrowRight className="size-3.5 text-slate-400" aria-hidden /> <Level level={x.after} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
