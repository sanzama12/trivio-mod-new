import Link from "next/link";
import { LuArrowUpRight, LuBuilding2 } from "react-icons/lu";
import type { MajorGroup } from "@/domain/types";
import type { MajorGroupSummary } from "@/services/catalog.service";
import { cn } from "@/lib/cn";
import { GroupIcon } from "@/components/ui/group-icon";

const TONES: Record<MajorGroup["tone"], { surface: string; rule: string; number: string }> = {
  primary: { surface: "bg-primary-50", rule: "bg-primary-600", number: "text-primary-700/20" },
  accent: { surface: "bg-accent-50", rule: "bg-accent-500", number: "text-accent-700/20" },
  success: { surface: "bg-success-50", rule: "bg-success-500", number: "text-success-700/20" },
  danger: { surface: "bg-danger-50", rule: "bg-danger-500", number: "text-danger-700/20" },
  pink: { surface: "bg-pink-50", rule: "bg-pink-500", number: "text-pink-700/20" },
  teal: { surface: "bg-teal-50", rule: "bg-teal-500", number: "text-teal-700/20" },
  violet: { surface: "bg-violet-50", rule: "bg-violet-500", number: "text-violet-700/20" },
  slate: { surface: "bg-slate-100", rule: "bg-slate-500", number: "text-slate-700/20" },
};

export function MajorGroupCard({
  summary,
  href,
  selected = false,
  index,
}: {
  summary: MajorGroupSummary;
  href: string;
  selected?: boolean;
  index: number;
}) {
  const { group, majorCount, programCount, schoolCount } = summary;
  const tone = TONES[group.tone];

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border-2 p-5 transition duration-200",
        tone.surface,
        selected ? "border-slate-950 shadow-[5px_5px_0_#0f172a]" : "border-slate-200 hover:-translate-y-1 hover:border-slate-950 hover:shadow-[5px_5px_0_#0f172a]",
      )}
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5", tone.rule)} />
      <span aria-hidden className={cn("absolute -top-4 right-3 text-7xl leading-none font-black tabular-nums", tone.number)}>
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <GroupIcon group={group} className="size-12 rounded-2xl bg-white shadow-sm ring-1 ring-black/5" />
        <LuArrowUpRight className="size-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-950" aria-hidden />
      </div>
      <h3 className="relative mt-5 text-lg leading-snug font-black tracking-tight text-slate-950">{group.name}</h3>
      <p className="relative mt-2 min-h-10 text-sm leading-relaxed text-slate-600">
        {group.description || "Khám phá các ngành học và chương trình đào tạo trong nhóm."}
      </p>

      <dl className="relative mt-5 grid grid-cols-2 gap-2 border-t border-slate-900/10 pt-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Ngành học</dt>
          <dd className="mt-0.5 font-black text-slate-950">{majorCount.toLocaleString("vi-VN")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Chương trình</dt>
          <dd className="mt-0.5 font-black text-slate-950">{programCount.toLocaleString("vi-VN")}</dd>
        </div>
      </dl>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <LuBuilding2 className="size-3.5" aria-hidden /> {schoolCount.toLocaleString("vi-VN")} trường đang đào tạo
      </span>
    </Link>
  );
}
