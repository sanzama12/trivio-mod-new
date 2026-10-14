"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { LuInfo } from "react-icons/lu";
import { computeCost, defaultTuition, formatMillion } from "@/lib/cost";
import { useTrovio } from "@/stores/trovio-store";
import { useProgramViews } from "@/components/program/use-program-views";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { LuWallet } from "react-icons/lu";

/** So sánh tổng chi phí các chương trình đã lưu / nguyện vọng với cùng giả định sinh hoạt phí. */
export function CostCompare() {
  const id = useId();
  const { saved, wishlist, hydrated } = useTrovio();
  const ids = useMemo(() => Array.from(new Set([...wishlist.map((w) => w.id), ...saved])).slice(0, 30), [saved, wishlist]);
  const items = useProgramViews(ids, hydrated);
  const [living, setLiving] = useState("4");
  const [months, setMonths] = useState("12");
  const [inc, setInc] = useState("0");
  const num = (s: string) => Number(s.replace(",", ".")) || 0;

  const rows = useMemo(
    () =>
      (items ?? [])
        .map((v) => ({
          v,
          r: computeCost({
            tuitionPerYear: defaultTuition(v.program.tuitionMin, v.program.tuitionMax),
            years: v.program.durationYears,
            tuitionIncreasePct: num(inc),
            scholarshipPct: 0,
            livingPerMonth: num(living),
            monthsPerYear: num(months),
            oneTime: 0,
          }),
        }))
        .sort((a, b) => a.r.total - b.r.total),
    [items, living, months, inc],
  );

  const input = (key: string, label: string, value: string, set: (v: string) => void, unit: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-100">
        <input id={`${id}-${key}`} inputMode="decimal" value={value} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} className="h-10 w-full min-w-0 rounded-lg bg-transparent px-3 text-sm outline-none" />
        <span className="shrink-0 pr-3 text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  );

  if (!hydrated || items === null) return <Skeleton className="mt-6 h-64 w-full" />;
  if (ids.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <EmptyState icon={<LuWallet />} title="Chưa có chương trình nào được lưu" description="Bấm ♡ ở các chương trình quan tâm, rồi quay lại đây để so sánh tổng chi phí cả khoá.">
          <Link href="/chuong-trinh" className={buttonClass()}>
            Tìm chương trình
          </Link>
        </EmptyState>
      </div>
    );
  }

  const max = Math.max(...rows.map((x) => x.r.total), 1);
  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        {input("l", "Sinh hoạt phí (giả định)", living, setLiving, "triệu/tháng")}
        {input("m", "Số tháng mỗi năm", months, setMonths, "tháng")}
        {input("i", "Học phí tăng mỗi năm", inc, setInc, "%")}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Tổng chi phí ước tính theo chương trình, từ thấp đến cao</caption>
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Chương trình</th>
              <th scope="col" className="px-4 py-3 text-right">Học phí cả khoá</th>
              <th scope="col" className="px-4 py-3 text-right">Sinh hoạt</th>
              <th scope="col" className="w-[34%] px-4 py-3">Tổng ước tính</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map(({ v, r }) => (
              <tr key={v.program.id}>
                <td className="px-4 py-3">
                  <Link href={`/chuong-trinh/${v.program.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                    {v.program.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {v.school.shortName} · {v.program.durationYears} năm
                  </p>
                </td>
                <td className="px-4 py-3 text-right">{formatMillion(r.tuition)}</td>
                <td className="px-4 py-3 text-right">{formatMillion(r.living)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="h-2 rounded-full bg-primary-600" style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }} />
                    <strong className="shrink-0 text-slate-900">{formatMillion(r.total)}</strong>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <LuInfo className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Học phí lấy trung bình khoảng học phí của từng chương trình (bản demo là số minh hoạ). Mở trang chương trình để tính chi tiết hơn (học bổng, chi phí một lần).
      </p>
    </div>
  );
}
