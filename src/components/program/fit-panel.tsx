"use client";

import Link from "next/link";
import { LuCalculator } from "react-icons/lu";
import type { Program } from "@/domain/types";
import { combos } from "@database/seeds/combos";
import {
  ADMISSION_METHODS,
  computeFit,
  cutoffFor,
  formatMethodScore,
  listScoresForProgram,
  METHOD_KEYS,
} from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";

const FIT_TEXT = { "an-toan": "text-success-700", "vua-suc": "text-primary-700", "thu-suc": "text-accent-700" } as const;
const BOX = {
  success: "border-success-100 bg-success-50",
  primary: "border-primary-200 bg-primary-50",
  accent: "border-accent-200 bg-accent-50",
  slate: "border-slate-200 bg-white",
} as const;

/** Khả năng trúng tuyển: mọi phương thức chương trình xét, kèm điểm cộng KV/UT. */
export function FitPanel({ program }: { program: Pick<Program, "cutoffs" | "altCutoffs" | "combos" | "methods"> }) {
  const { profile, hydrated } = useTrovio();
  if (!hydrated) return <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />;

  const accepted = METHOD_KEYS.filter((k) => cutoffFor(program, k));
  if (accepted.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-card">
        Chương trình không có điểm chuẩn theo điểm thi, học bạ hay ĐGNL. Xem điều kiện học bạ / chứng chỉ ở mục Tuyển sinh.
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-primary-800">
          <LuCalculator className="size-4" aria-hidden /> Bạn có khả năng đỗ không?
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-primary-900/80">
          Nhập điểm ({accepted.map((k) => ADMISSION_METHODS[k].short).join(", ")}) và khu vực ưu tiên để so với điểm chuẩn gần nhất.
        </p>
        <Link href="/diem-cua-toi" className={buttonClass({ size: "sm", className: "mt-4" })}>
          Nhập điểm của tôi
        </Link>
      </div>
    );
  }

  const rows = listScoresForProgram(profile, program, combos);
  const best = rows[0]
    ? rows.reduce((a, b) => {
        const fa = computeFit(a.total, program, a.method);
        const fb = computeFit(b.total, program, b.method);
        return (fb?.diff ?? -Infinity) > (fa?.diff ?? -Infinity) ? b : a;
      })
    : null;
  const bestFit = best ? computeFit(best.total, program, best.method) : null;
  const tone = !bestFit ? "slate" : bestFit.level === "an-toan" ? "success" : bestFit.level === "vua-suc" ? "primary" : "accent";
  const extra = (program.methods ?? []).filter((m) => !m.key || !accepted.includes(m.key));

  return (
    <div className={cn("rounded-2xl border p-5", BOX[tone])}>
      <p className="text-xs font-semibold text-slate-500 uppercase">
        Điểm của bạn{best ? ` (${ADMISSION_METHODS[best.method].short}${best.combo ? ` · ${best.combo}` : ""})` : ""}
      </p>
      {best ? (
        <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatMethodScore(best.total, best.method)}</p>
      ) : (
        <p className="mt-1 text-sm font-semibold text-slate-700">Chưa khớp phương thức đã nhập với chương trình này.</p>
      )}
      {bestFit ? <p className={cn("mt-2 text-sm font-bold", FIT_TEXT[bestFit.level])}>{bestFit.label}</p> : null}

      <ul className="mt-3 space-y-1.5 text-[13px] text-slate-700">
        {accepted.map((k) => {
          const cut = cutoffFor(program, k)!;
          const row = rows.find((r) => r.method === k);
          return (
            <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span>
                <span className="font-semibold">{ADMISSION_METHODS[k].short}</span>
                {row?.combo ? ` · ${row.combo}` : ""}
                {row ? ` · ${formatMethodScore(row.total, k)}` : " · chưa nhập"}
                <span className="text-slate-500">
                  {" "}
                  (chuẩn {cut.year}: {formatMethodScore(cut.score, k)}
                  )
                </span>
              </span>
            </li>
          );
        })}
        {extra.map((m) => (
          <li key={m.name} className="text-slate-600">
            {m.tag} · {m.name}
          </li>
        ))}
      </ul>

      <Link href="/diem-cua-toi" className="mt-3 inline-block text-[13px] font-semibold text-primary-600 hover:underline">
        Cập nhật điểm
      </Link>
    </div>
  );
}
