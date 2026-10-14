import { RIASEC_INFO } from "@/domain/riasec";
import type { RiasecType } from "@/domain/types";
import { cn } from "@/lib/cn";

export const RIASEC_BG: Record<RiasecType, string> = {
  R: "bg-riasec-r",
  I: "bg-riasec-i",
  A: "bg-riasec-a",
  S: "bg-riasec-s",
  E: "bg-riasec-e",
  C: "bg-riasec-c",
};

export const RIASEC_SOFT: Record<RiasecType, string> = {
  R: "bg-teal-50 text-teal-700 border-teal-200",
  I: "bg-primary-50 text-primary-700 border-primary-200",
  A: "bg-pink-50 text-pink-700 border-pink-200",
  S: "bg-success-50 text-success-700 border-success-100",
  E: "bg-accent-50 text-accent-700 border-accent-200",
  C: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RiasecPill({ type, className }: { type: RiasecType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white", RIASEC_BG[type], className)}>
      {type} – {RIASEC_INFO[type].label}
    </span>
  );
}

export function RiasecLetter({ type, className }: { type: RiasecType; className?: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white", RIASEC_BG[type], className)} aria-label={RIASEC_INFO[type].label}>
      {type}
    </span>
  );
}
