import { LuCircleCheck, LuCompass, LuGitBranch } from "react-icons/lu";
import type { GoalMatch } from "@/services/recommendation.service";
import { cn } from "@/lib/cn";

/** Chip "Khớp mục tiêu" / "Gần mục tiêu" / "Không thuộc mục tiêu" trên thẻ gợi ý. */
export function GoalMatchChip({ match, goalName, className }: { match: GoalMatch; goalName: string; className?: string }) {
  const cfg = {
    match: { Icon: LuCircleCheck, text: `Khớp mục tiêu · ${goalName}`, cls: "bg-success-50 text-success-700" },
    related: { Icon: LuGitBranch, text: `Gần mục tiêu · cùng nhóm ngành với ${goalName}`, cls: "bg-primary-50 text-primary-700" },
    off: { Icon: LuCompass, text: "Không thuộc ngành mục tiêu", cls: "bg-slate-100 text-slate-600" },
  }[match];
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.cls, className)}>
      <cfg.Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{cfg.text}</span>
    </span>
  );
}
