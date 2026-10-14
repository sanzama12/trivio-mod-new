import type { CutoffScore } from "@/domain/types";

/** Biểu đồ cột điểm chuẩn qua các năm (SVG thuần, không cần thư viện). */
export function CutoffHistory({ cutoffs }: { cutoffs: CutoffScore[] }) {
  if (!cutoffs.length) return null;
  const data = [...cutoffs].sort((a, b) => a.year - b.year);
  const min = Math.floor(Math.min(...data.map((d) => d.score)) - 1);
  const max = Math.min(30, Math.ceil(Math.max(...data.map((d) => d.score)) + 0.5));
  const h = 140;
  const barW = 44;
  const gap = 36;
  const w = data.length * barW + (data.length - 1) * gap;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;

  return (
    <figure>
      <svg viewBox={`0 -20 ${w} ${h + 44}`} className="h-48 w-full max-w-sm" role="img" aria-label={`Điểm chuẩn: ${data.map((d) => `${d.year} ${d.score}`).join(", ")}`}>
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const last = i === data.length - 1;
          return (
            <g key={d.year}>
              <rect x={x} y={y(d.score)} width={barW} height={h - y(d.score)} rx={6} className={last ? "fill-primary-600" : "fill-primary-200"} />
              <text x={x + barW / 2} y={y(d.score) - 8} textAnchor="middle" className="fill-slate-900 text-[13px] font-bold">
                {d.score.toFixed(2)}
              </text>
              <text x={x + barW / 2} y={h + 22} textAnchor="middle" className="fill-slate-500 text-[12px]">
                {d.year}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-slate-500">Điểm chuẩn phương thức điểm thi THPT (thang 30). Trục đứng từ {min} đến {max} để thấy rõ chênh lệch.</figcaption>
    </figure>
  );
}
