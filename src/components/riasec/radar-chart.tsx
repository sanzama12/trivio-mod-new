import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import type { RiasecType } from "@/domain/types";

/** Biểu đồ radar SVG thuần, giữ hình học 6 trục của bản cũ. */
export function RadarChart({ percents, size = 280 }: { percents: Record<RiasecType, number>; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 44;
  const point = (index: number, value: number) => {
    const angle = Math.PI * 2 * index / 6 - Math.PI / 2;
    return [center + Math.cos(angle) * radius * value, center + Math.sin(angle) * radius * value] as const;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label={`Biểu đồ sở thích: ${RIASEC_ORDER.map((type) => `${type} — ${RIASEC_INFO[type].label} ${percents[type]}%`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((level) => <polygon key={level} points={RIASEC_ORDER.map((_, index) => point(index, level).join(",")).join(" ")} className="fill-none stroke-slate-200" strokeWidth={1} />)}
      {RIASEC_ORDER.map((type, index) => {
        const [x, y] = point(index, 1);
        return <line key={type} x1={center} y1={center} x2={x} y2={y} className="stroke-slate-200" strokeWidth={1} />;
      })}
      <polygon points={RIASEC_ORDER.map((type, index) => point(index, percents[type] / 100).join(",")).join(" ")} className="fill-primary-600/15 stroke-primary-600" strokeWidth={2} strokeLinejoin="round" />
      {RIASEC_ORDER.map((type, index) => {
        const [x, y] = point(index, percents[type] / 100);
        return <circle key={type} cx={x} cy={y} r={3.5} className="fill-primary-600" />;
      })}
      {RIASEC_ORDER.map((type, index) => {
        const [x, y] = point(index, 1.25);
        return <text key={type} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-700 text-xs font-semibold"><tspan x={x} dy="-0.5em">{type}</tspan><tspan x={x} dy="1.2em" className="fill-slate-500 font-normal">{percents[type]}%</tspan></text>;
      })}
    </svg>
  );
}
