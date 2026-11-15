"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LuArrowLeftRight, LuArrowRight, LuPlus, LuScale, LuSearch, LuSparkles, LuX } from "react-icons/lu";
import { ADMISSION_METHODS, cutoffFor, fitForProfile, formatMethodScore, profileScore } from "@/services/scoring.service";
import type { AltMethodKey } from "@/domain/types";
import type { ProgramView } from "@/services/program.service";
import { formatScore, formatTuition } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { CompetitionBadge } from "./fit-badge";
import { WishlistButton } from "./program-actions";
import { useProgramViews } from "./use-program-views";

type Row = { label: string; value: (v: ProgramView) => ReactNode; raw: (v: ProgramView) => string };

export function CompareView() {
  const { compare, toggleCompare, profile, hydrated } = useTrovio();
  const items = useProgramViews(compare, hydrated);
  const [diffOnly, setDiffOnly] = useState(false);

  if (!hydrated || items === null) return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <LuScale className="size-7" aria-hidden />
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          Chưa có chương trình nào được chọn
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
          Hãy chọn các chương trình ở bên ngoài trước khi so sánh
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-slate-600">
          Mục so sánh này giúp bạn đặt cạnh nhau tối đa {MAX_COMPARE} chương trình đào tạo để phân tích điểm chuẩn 3 năm, học phí, tổ hợp môn và màu sắc phân biệt khác biệt.
        </p>

        {/* 3 bước hướng dẫn trực quan */}
        <div className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="flex size-7 items-center justify-center rounded-full bg-teal-800 text-xs font-black text-white">
              1
            </span>
            <p className="mt-3 font-bold text-sm text-slate-900">Tìm kiếm chương trình</p>
            <p className="mt-1 text-xs text-slate-600">Mở trang Tìm trường để duyệt danh sách ngành và trường bạn quan tâm.</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="flex size-7 items-center justify-center rounded-full bg-teal-800 text-xs font-black text-white">
              2
            </span>
            <p className="mt-3 font-bold text-sm text-slate-900">Bấm nút "So sánh"</p>
            <p className="mt-1 text-xs text-slate-600">Ở góc dưới mỗi thẻ chương trình, bấm nút ⚖️ So sánh để thêm vào danh sách (tối đa {MAX_COMPARE}).</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="flex size-7 items-center justify-center rounded-full bg-teal-800 text-xs font-black text-white">
              3
            </span>
            <p className="mt-3 font-bold text-sm text-slate-900">Xem bảng đối chiếu</p>
            <p className="mt-1 text-xs text-slate-600">Quay lại đây để xem bảng phân tích điểm chuẩn, học phí và điểm khác biệt.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/chuong-trinh"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-900"
          >
            <LuSearch className="size-4" />
            <span>Đi đến trang Tìm chương trình để chọn</span>
            <LuArrowRight className="size-4" />
          </Link>
          <Link
            href="/nganh"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Khám phá danh mục ngành
          </Link>
        </div>
      </div>
    );
  }

  const mine = profile ? profileScore(profile) : null;
  const altKeys = (["hocba"] as AltMethodKey[]).filter((k) => items.some((v) => cutoffFor(v.program, k)));
  const cut = (v: ProgramView, i: number) => v.program.cutoffs[i];

  const rows: Row[] = [
    { label: "Trường / Cơ sở", value: (v) => v.program.campus, raw: (v) => v.program.campus },
    ...[0, 1, 2].map<Row>((i) => ({
      label: `Điểm chuẩn ${2025 - i}`,
      value: (v) => (cut(v, i) ? <strong className={i === 0 ? "text-primary-700" : ""}>{formatScore(cut(v, i).score)}</strong> : <span className="text-slate-400 italic">Chưa có dữ liệu chính thức</span>),
      raw: (v) => String(cut(v, i)?.score ?? "-"),
    })),
    ...altKeys.map<Row>((k) => ({
      label: `Điểm chuẩn ${ADMISSION_METHODS[k].short}`,
      value: (v) => {
        const c = cutoffFor(v.program, k);
        return c ? (
          <>
            {formatMethodScore(c.score, k)} ({c.year})
          </>
        ) : (
          <span className="text-slate-500">Không xét</span>
        );
      },
      raw: (v) => String(cutoffFor(v.program, k)?.score ?? "-"),
    })),
    ...(mine && profile
      ? [
        {
          label: `So với điểm của bạn (${formatMethodScore(mine.total, mine.method)} · ${ADMISSION_METHODS[mine.method].short})`,
          value: (v: ProgramView) => {
            const { fit, reason } = fitForProfile(profile, v.program);
            if (reason === "combo") return <span className="text-slate-500">Không xét {profile.combo}</span>;
            if (!fit) return <span className="text-slate-500">Không xét {ADMISSION_METHODS[mine.method].short}</span>;
            return (
              <span className={cn("font-semibold", fit.level === "an-toan" ? "text-success-700" : fit.level === "vua-suc" ? "text-primary-700" : "text-accent-700")}>
                {fit.diff >= 0 ? "+" : ""}
                {formatMethodScore(fit.diff, mine.method)} · {fit.label}
              </span>
            );
          },
          raw: (v: ProgramView) => String(fitForProfile(profile, v.program).fit?.diff ?? "-"),
        },
      ]
      : []),
    { label: "Học phí / năm", value: (v) => formatTuition(v.program.tuitionMin, v.program.tuitionMax), raw: (v) => `${v.program.tuitionMin}-${v.program.tuitionMax}` },
    { label: "Thời gian đào tạo", value: (v) => `${v.program.durationYears} năm`, raw: (v) => String(v.program.durationYears) },
    { label: "Tổ hợp xét tuyển", value: (v) => v.program.combos.join(", ") || "Học bạ / IELTS", raw: (v) => v.program.combos.join(",") },
    { label: "Phương thức", value: (v) => v.program.methods.map((m) => m.tag).join(", "), raw: (v) => v.program.methods.map((m) => m.tag).join(",") },
    { label: "Chỉ tiêu", value: (v) => `${v.program.quota}`, raw: (v) => String(v.program.quota) },
    { label: "Cạnh tranh", value: (v) => <CompetitionBadge level={v.program.competition} />, raw: (v) => v.program.competition },
  ];
  const visibleRows = diffOnly ? rows.filter((r) => new Set(items.map(r.raw)).size > 1) : rows;
  const cols = items.length + (items.length < MAX_COMPARE ? 1 : 0);

  const colToneStyles = [
    {
      cell: "bg-emerald-50/75 text-emerald-950 font-semibold border-l-2 border-l-emerald-500",
      header: "border-t-4 border-t-emerald-500",
      dot: "bg-emerald-500",
      name: "Chương trình 1",
    },
    {
      cell: "bg-amber-50/75 text-amber-950 font-semibold border-l-2 border-l-amber-500",
      header: "border-t-4 border-t-amber-500",
      dot: "bg-amber-500",
      name: "Chương trình 2",
    },
    {
      cell: "bg-sky-50/75 text-sky-950 font-semibold border-l-2 border-l-sky-500",
      header: "border-t-4 border-t-sky-500",
      dot: "bg-sky-500",
      name: "Chương trình 3",
    },
    {
      cell: "bg-purple-50/75 text-purple-950 font-semibold border-l-2 border-l-purple-500",
      header: "border-t-4 border-t-purple-500",
      dot: "bg-purple-500",
      name: "Chương trình 4",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Chú thích màu khi có tiêu chí khác biệt */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-800">Màu đối chiếu khi khác biệt:</span>
          {items.map((v, i) => {
            const tone = colToneStyles[i % colToneStyles.length];
            return (
              <span key={v.program.id} className="inline-flex items-center gap-1.5 font-semibold">
                <span className={cn("size-2.5 rounded-full", tone.dot)} />
                <span>{v.school.code || v.school.shortName}: {v.program.name.slice(0, 24)}...</span>
              </span>
            );
          })}
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
          Chỉ làm nổi bật điểm khác biệt
          <input type="checkbox" role="switch" className="peer sr-only" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
          <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-4 peer-focus-visible:ring-primary-200 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup>
            <col className="w-52" />
            {Array.from({ length: cols }).map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr className="align-top">
              <th scope="col" className="p-5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">
                Tiêu chí so sánh
              </th>
              {items.map((v, i) => {
                const tone = colToneStyles[i % colToneStyles.length];
                return (
                  <th
                    key={v.program.id}
                    scope="col"
                    className={cn(
                      "border-l border-slate-100 p-5 text-left font-normal transition-colors",
                      tone.header
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-xs font-extrabold text-primary-700">{v.school.code}</span>
                      <button
                        type="button"
                        onClick={() => toggleCompare(v.program.id)}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                        aria-label={`Bỏ ${v.program.name} khỏi so sánh`}
                      >
                        <LuX className="size-4" />
                      </button>
                    </div>
                    <Link href={`/chuong-trinh/${v.program.slug}`} className="mt-3 block font-bold text-slate-900 hover:text-primary-700">
                      {v.program.name}
                    </Link>
                    <span className="text-[13px] font-semibold text-primary-600">{v.school.shortName}</span>
                  </th>
                );
              })}
              {items.length < MAX_COMPARE && (
                <th scope="col" className="border-l border-slate-100 p-5">
                  <Link
                    href="/chuong-trinh"
                    className="flex h-full min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-primary-300 hover:text-primary-700"
                  >
                    <LuPlus className="size-5" aria-hidden /> Thêm chương trình
                  </Link>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const differs = new Set(items.map(r.raw)).size > 1;
              return (
                <tr key={r.label} className="border-t border-slate-100">
                  <th scope="row" className="bg-slate-50/60 p-4 text-left text-[13px] font-semibold text-slate-700">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{r.label}</span>
                      {differs && (
                        <span className="inline-flex items-center rounded-full bg-slate-200/90 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                          Khác biệt
                        </span>
                      )}
                    </div>
                  </th>
                  {items.map((v, colIdx) => {
                    const tone = colToneStyles[colIdx % colToneStyles.length];
                    return (
                      <td
                        key={v.program.id}
                        className={cn(
                          "border-l border-slate-100 p-4 transition-colors",
                          differs ? tone.cell : "text-slate-800"
                        )}
                      >
                        {r.value(v)}
                      </td>
                    );
                  })}
                  {items.length < MAX_COMPARE && <td className="border-l border-slate-100" />}
                </tr>
              );
            })}
            <tr className="border-t border-slate-100">
            <td />
            {items.map((v) => (
              <td key={v.program.id} className="space-y-2 border-l border-slate-100 p-4">
                <WishlistButton id={v.program.id} />
                <Link href={`/chuong-trinh/${v.program.slug}`} className="block text-center text-[13px] font-semibold text-primary-600 hover:underline">
                  Xem chi tiết →
                </Link>
              </td>
            ))}
            {items.length < MAX_COMPARE && <td className="border-l border-slate-100" />}
          </tr>
        </tbody>
      </table>
    </Card>
      { visibleRows.length === 0 && <p className="mt-4 text-center text-sm text-slate-500">Các chương trình giống nhau ở mọi tiêu chí.</p> }
    </div >
  );
}
