import type { IconType } from "react-icons";
import { LuBookOpen, LuChartColumn, LuCode, LuCog, LuHeartPulse, LuLeaf, LuPenTool, LuUsers } from "react-icons/lu";
import type { MajorGroup } from "@/domain/types";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "./badge";

const ICONS: Record<string, IconType> = {
  code: LuCode,
  chart: LuChartColumn,
  heart: LuHeartPulse,
  gear: LuCog,
  users: LuUsers,
  pen: LuPenTool,
  book: LuBookOpen,
  leaf: LuLeaf,
};

const TONE_BG: Record<MajorGroup["tone"], string> = {
  primary: "bg-primary-50 text-primary-600",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-success-700",
  danger: "bg-danger-50 text-danger-700",
  pink: "bg-pink-50 text-pink-600",
  teal: "bg-teal-50 text-teal-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

export function groupBadgeTone(tone: MajorGroup["tone"]): BadgeTone {
  return tone;
}

export function GroupIcon({ group, className }: { group: Pick<MajorGroup, "icon" | "tone">; className?: string }) {
  const Icon = ICONS[group.icon] ?? LuBookOpen;
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONE_BG[group.tone], className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
