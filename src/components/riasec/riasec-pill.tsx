import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO } from "@/domain/riasec";
export function RiasecPill({ type }: { type: RiasecType }) {
  return <span title={RIASEC_INFO[type].label} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">{type}</span>;
}
