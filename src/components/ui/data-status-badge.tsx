import { LuBadgeCheck, LuCircleAlert, LuExternalLink, LuFileSearch, LuShieldCheck } from "react-icons/lu";
import type { DataEvidence } from "@/services/data-trust.service";
import { cn } from "@/lib/cn";

const STYLE = {
  verified: "border-success-200 bg-success-50 text-success-700",
  reviewed: "border-primary-200 bg-primary-50 text-primary-700",
  sourced: "border-accent-200 bg-accent-50 text-accent-700",
  unsourced: "border-slate-200 bg-slate-50 text-slate-600",
  missing: "border-slate-200 bg-white text-slate-500",
} as const;

const ICON = {
  verified: LuShieldCheck,
  reviewed: LuBadgeCheck,
  sourced: LuFileSearch,
  unsourced: LuCircleAlert,
  missing: LuCircleAlert,
} as const;

export function DataStatusBadge({ evidence, className, showSource = false }: { evidence: DataEvidence; className?: string; showSource?: boolean }) {
  const Icon = ICON[evidence.status];
  const content = (
    <>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{evidence.label}</span>
      {showSource && evidence.sourceLabel ? <span className="font-normal opacity-80">· {evidence.sourceLabel}</span> : null}
      {evidence.sourceUrl ? <LuExternalLink className="size-3 shrink-0" aria-hidden /> : null}
    </>
  );
  const classes = cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", STYLE[evidence.status], className);
  return evidence.sourceUrl ? (
    <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" title={evidence.detail} className={classes}>
      {content}
    </a>
  ) : (
    <span title={evidence.detail} className={classes}>{content}</span>
  );
}