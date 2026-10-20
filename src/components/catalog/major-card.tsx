import Link from "next/link";
import { LuArrowRight, LuBookOpenCheck } from "react-icons/lu";
import type { MajorListItem } from "@/services/catalog.service";
import { GroupIcon } from "@/components/ui/group-icon";

export function MajorCard({ item }: { item: MajorListItem }) {
  const { major, group, programCount } = item;

  return (
    <Link
      href={`/nganh/${major.slug}`}
      className="group flex min-w-0 flex-col rounded-3xl border-2 border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-950 hover:shadow-[6px_6px_0_#0f172a]"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <GroupIcon group={group} className="size-12 rounded-2xl" />
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
          {major.code || "Chưa xác định mã"}
        </span>
      </div>
      <p className="mt-5 text-xs font-bold tracking-wide text-slate-500 uppercase">{group.name}</p>
      <h3 className="mt-1 break-words text-lg leading-snug font-black tracking-tight text-slate-950">{major.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{major.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-bold text-slate-700">
          <LuBookOpenCheck className="size-4 shrink-0" aria-hidden /> {programCount.toLocaleString("vi-VN")} chương trình
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition group-hover:bg-accent-500 group-hover:text-slate-950">
          <LuArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
