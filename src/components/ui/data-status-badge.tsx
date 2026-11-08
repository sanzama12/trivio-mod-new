import { LuBadgeCheck, LuCircleAlert, LuExternalLink, LuFileSearch, LuShieldCheck } from "react-icons/lu";
import type { DataEvidence } from "@/services/data-trust.service";
import { cn } from "@/lib/cn";

const STYLE = {
  verified: "border-success-200 bg-success-50 text-success-700",
  reviewed: "border-primary-200 bg-primary-50 text-primary-700",
  sourced: "border-accent-200 bg-accent-50 text-accent-800",
  unsourced: "border-slate-200 bg-slate-50 text-slate-600",
  missing: "border-slate-200 bg-white text-slate-600",
} as const;

const ICON = {
  verified: LuShieldCheck,
  reviewed: LuBadgeCheck,
  sourced: LuFileSearch,
  unsourced: LuCircleAlert,
  missing: LuCircleAlert,
} as const;

export function DataStatusBadge({ evidence, className, showSource = false, compact = false }: { evidence: DataEvidence; className?: string; showSource?: boolean; compact?: boolean }) {
  const Icon = ICON[evidence.status];
  const content = (
    <>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className={compact ? "sr-only" : undefined}>{evidence.label}</span>
      {showSource && evidence.sourceLabel ? <span className={cn("font-normal", compact && "max-w-28 truncate")}>{compact ? "" : "· "}{evidence.sourceLabel}</span> : null}
      {evidence.sourceUrl ? <LuExternalLink className="size-3 shrink-0" aria-hidden /> : null}
    </>
  );
  const classes = cn("inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold", STYLE[evidence.status], className);
  return evidence.sourceUrl ? (
    <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" title={[evidence.label, evidence.sourceLabel, evidence.detail].filter(Boolean).join(" · ")} className={classes}>
      {content}
    </a>
  ) : (
    <span title={evidence.detail} className={classes}>{content}</span>
  );
}
