import Link from "next/link";
import { LuArrowUpRight, LuBuilding2 } from "react-icons/lu";
import type { MajorGroupSummary } from "@/services/catalog.service";
import { cn } from "@/lib/cn";
import { GroupIcon } from "@/components/ui/group-icon";

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

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary-300",
        selected ? "border-primary-300" : "border-slate-200",
        programCount === 0 && "opacity-70",
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <GroupIcon group={group} className="size-12 rounded-2xl" />
          <span aria-hidden className="text-sm font-semibold text-slate-400 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
        </div>
        {programCount > 0 && <LuArrowUpRight className="size-5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-700" aria-hidden />}
      </div>
      <h3 className="relative mt-5 text-lg leading-snug font-semibold tracking-tight text-slate-950">{group.name}</h3>
      <p className="relative mt-2 min-h-10 text-sm leading-relaxed text-slate-600 max-w-prose">
        {group.description || "Khám phá các ngành học và chương trình đào tạo trong nhóm."}
      </p>

      <dl className={cn("relative mt-5 grid grid-cols-2 gap-2 border-t border-slate-900/10 pt-4 text-sm", programCount === 0 && "opacity-60")}>
        <div>
          <dt className="text-xs text-slate-600">Ngành học</dt>
          <dd className="mt-0.5 font-bold text-slate-950">{majorCount.toLocaleString("vi-VN")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Chương trình</dt>
          <dd className="mt-0.5 font-bold text-slate-950">{programCount.toLocaleString("vi-VN")}</dd>
        </div>
      </dl>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <LuBuilding2 className="size-3.5" aria-hidden /> {programCount === 0 ? "Đang cập nhật dữ liệu" : `${schoolCount.toLocaleString("vi-VN")} trường đang đào tạo`}
      </span>
    </Link>
  );
}
