export function RadarChart({ percents, size = 240 }: { percents: Record<string, number>; size?: number }) {
  const vals = Object.values(percents ?? {});
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  return <div style={{ width: size }} className="mx-auto rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Mã định hướng trung bình {avg}%</div>;
}
