import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import type { RiasecType } from "@/domain/types";

/** Biểu đồ radar 6 trục RIASEC, có nhãn giá trị %. SVG thuần. */
export function RadarChart({ percents, size = 280 }: { percents: Record<RiasecType, number>; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 44;
  const angle = (i: number) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
  const pt = (i: number, v: number) => [c + Math.cos(angle(i)) * r * v, c + Math.sin(angle(i)) * r * v] as const;
  const poly = RIASEC_ORDER.map((t, i) => pt(i, percents[t] / 100).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Biểu đồ sở thích: ${RIASEC_ORDER.map((t) => `${RIASEC_INFO[t].label} ${percents[t]}%`).join(", ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((lv) => (
        <polygon key={lv} points={RIASEC_ORDER.map((_, i) => pt(i, lv).join(",")).join(" ")} className="fill-none stroke-slate-200" strokeWidth={1} />
      ))}
      {RIASEC_ORDER.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-slate-200" strokeWidth={1} />;
      })}
      <polygon points={poly} className="fill-primary-600/15 stroke-primary-600" strokeWidth={2} strokeLinejoin="round" />
      {RIASEC_ORDER.map((t, i) => {
        const [x, y] = pt(i, percents[t] / 100);
        return <circle key={t} cx={x} cy={y} r={3.5} className="fill-primary-600" />;
      })}
      {RIASEC_ORDER.map((t, i) => {
        const [x, y] = pt(i, 1.22);
        return (
          <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-700 text-[11px] font-semibold">
            <tspan x={x} dy="-0.5em">
              {t}
            </tspan>
            <tspan x={x} dy="1.2em" className="fill-slate-500 font-normal">
              {percents[t]}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
