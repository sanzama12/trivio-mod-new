"use client";

/** Ước tính tổng chi phí học (học phí × số năm + sinh hoạt phí) cho một chương trình. */
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { LuCalculator, LuInfo } from "react-icons/lu";
import { computeCost, defaultTuition, formatMillion } from "@/lib/cost";

export function CostCalculator({ tuitionMin, tuitionMax, durationYears }: { tuitionMin: number; tuitionMax: number; durationYears: number }) {
  const id = useId();
  const [tuition, setTuition] = useState(String(defaultTuition(tuitionMin, tuitionMax)));
  const [years, setYears] = useState(String(durationYears));
  const [inc, setInc] = useState("0");
  const [scholar, setScholar] = useState("0");
  const [living, setLiving] = useState("4");
  const [months, setMonths] = useState("12");
  const [oneTime, setOneTime] = useState("15");
  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const r = useMemo(
    () => computeCost({ tuitionPerYear: num(tuition), years: num(years), tuitionIncreasePct: num(inc), scholarshipPct: num(scholar), livingPerMonth: num(living), monthsPerYear: num(months), oneTime: num(oneTime) }),
    [tuition, years, inc, scholar, living, months, oneTime],
  );
  const field = (key: string, label: string, value: string, set: (v: string) => void, unit: string, hint?: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-100">
        <input
          id={`${id}-${key}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
          aria-describedby={hint ? `${id}-${key}-h` : undefined}
          className="h-10 w-full min-w-0 rounded-lg bg-transparent px-3 text-sm outline-none"
        />
        <span className="shrink-0 pr-3 text-xs text-slate-500">{unit}</span>
      </div>
      {hint && (
        <p id={`${id}-${key}-h`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field("t", "Học phí năm đầu", tuition, setTuition, "triệu/năm", `Theo dữ liệu: ${tuitionMin === tuitionMax ? tuitionMin : `${tuitionMin}–${tuitionMax}`} triệu/năm`)}
        {field("y", "Số năm học", years, setYears, "năm")}
        {field("i", "Học phí tăng mỗi năm", inc, setInc, "%", "Nhiều trường tăng theo lộ trình — xem đề án")}
        {field("s", "Học bổng / miễn giảm", scholar, setScholar, "% học phí")}
        {field("l", "Sinh hoạt phí", living, setLiving, "triệu/tháng", "Giả định — nhập theo hoàn cảnh gia đình bạn")}
        {field("m", "Số tháng sinh hoạt mỗi năm", months, setMonths, "tháng")}
        {field("o", "Chi phí một lần", oneTime, setOneTime, "triệu", "Máy tính, nhập học, giáo trình…")}
      </div>

      <div className="mt-5 grid gap-4 rounded-xl bg-primary-50 p-4 md:grid-cols-[1fr_1.4fr]" aria-live="polite">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-800">
            <LuCalculator className="size-4" aria-hidden /> Tổng chi phí ước tính cả khoá
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatMillion(r.total)}</p>
          <p className="mt-1 text-[13px] text-slate-700">
            ≈ {formatMillion(r.perMonthAvg)} mỗi tháng · học phí {formatMillion(r.tuition)} · sinh hoạt {formatMillion(r.living)}
            {r.oneTime > 0 && ` · một lần ${formatMillion(r.oneTime)}`}
          </p>
        </div>
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Chi phí theo từng năm</caption>
          <thead className="text-xs text-slate-600">
            <tr>
              <th scope="col" className="py-1 font-medium">Năm</th>
              <th scope="col" className="py-1 text-right font-medium">Học phí</th>
              <th scope="col" className="py-1 text-right font-medium">Sinh hoạt</th>
              <th scope="col" className="py-1 text-right font-medium">Cộng</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {r.years.map((y) => (
              <tr key={y.year} className="border-t border-primary-100">
                <td className="py-1">Năm {y.year}</td>
                <td className="py-1 text-right">{formatMillion(y.tuition)}</td>
                <td className="py-1 text-right">{formatMillion(y.living)}</td>
                <td className="py-1 text-right font-semibold">{formatMillion(y.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
        <LuInfo className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Công cụ tham khảo: học phí theo dữ liệu Trovio (bản demo là số minh hoạ), các giả định còn lại do bạn nhập. Không gồm lãi vay.{" "}
        <Link href="/chi-phi" className="font-semibold text-primary-700 hover:underline">
          So sánh chi phí các chương trình đã lưu
        </Link>
      </p>
    </div>
  );
}
