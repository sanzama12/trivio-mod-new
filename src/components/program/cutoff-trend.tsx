import { LuTrendingDown, LuTrendingUp, LuMinus } from "react-icons/lu";
import type { CutoffScore } from "@/domain/types";
import { cutoffTrend } from "@/lib/trend";
import { cn } from "@/lib/cn";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : "0");

/** Xu hướng điểm chuẩn qua các năm: đường biểu diễn, mức tăng giảm từng năm và nhận xét tóm tắt. Không dự đoán năm sau. */
export function CutoffTrend({ cutoffs }: { cutoffs: CutoffScore[] }) {
  const trend = cutoffTrend(cutoffs);
  if (trend.points.length < 2) return null;
  const { points } = trend;
  const w = 320;
  const h = 120;
  const pad = 24;
  const min = Math.min(...points.map((p) => p.score));
  const max = Math.max(...points.map((p) => p.score));
  const span = Math.max(max - min, 0.5);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const Icon = trend.direction === "tang" ? LuTrendingUp : trend.direction === "giam" ? LuTrendingDown : LuMinus;
  const tone = trend.direction === "tang" ? "text-danger-700 bg-danger-50" : trend.direction === "giam" ? "text-success-700 bg-success-50" : "text-slate-700 bg-slate-100";

  return (
    <div className="mb-6 border-b border-slate-200 pb-6">
      <h3 className="mb-1 font-semibold text-slate-900">Xu hướng điểm chuẩn</h3>
      <p className={cn("mb-3 inline-flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium", tone)}>
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{trend.summary}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-[320px_1fr] sm:items-center">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full max-w-xs" role="img" aria-label={`Xu hướng điểm chuẩn: ${points.map((p) => `${p.year} ${fmt(p.score)}`).join(", ")}`}>
          <path d={path} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-primary-600" />
          {points.map((p, i) => (
            <g key={p.year}>
              <circle cx={x(i)} cy={y(p.score)} r={4} className="fill-primary-600" />
              <text x={x(i)} y={y(p.score) - 9} textAnchor="middle" className="fill-slate-900 text-xs font-semibold">{fmt(p.score)}</text>
              <text x={x(i)} y={h - 4} textAnchor="middle" className="fill-slate-600 text-xs">{p.year}</text>
            </g>
          ))}
        </svg>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Điểm chuẩn và mức thay đổi so với năm trước</caption>
          <thead className="border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-medium">Năm</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Điểm chuẩn</th>
              <th scope="col" className="py-1.5 font-medium">So với năm trước</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...points].reverse().map((p) => (
              <tr key={p.year}>
                <th scope="row" className="py-1.5 pr-3 font-semibold text-slate-900">{p.year}</th>
                <td className="py-1.5 pr-3 tabular-nums text-slate-800">{fmt(p.score)}</td>
                <td className={cn("py-1.5 tabular-nums font-semibold", p.delta == null ? "text-slate-500" : p.delta > 0 ? "text-danger-700" : p.delta < 0 ? "text-success-700" : "text-slate-600")}>
                  {p.delta == null ? "—" : signed(p.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600">Đỏ: điểm chuẩn tăng (khó hơn). Xanh: giảm. Đây là biến động đã xảy ra, không phải dự đoán cho năm sau.</p>
    </div>
  );
}
