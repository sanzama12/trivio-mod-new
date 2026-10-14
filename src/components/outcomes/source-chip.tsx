import type { DataSource, TrustLevel } from "@/domain/types";
import { cn } from "@/lib/cn";

const TRUST_STYLE: Record<TrustLevel, string> = {
  cao: "bg-success-50 text-success-700 ring-success-100",
  "trung-binh": "bg-primary-50 text-primary-700 ring-primary-200",
  "tham-khao": "bg-slate-100 text-slate-700 ring-slate-200",
  "minh-hoa": "bg-accent-50 text-accent-700 ring-accent-200",
};
const TRUST_SHORT: Record<TrustLevel, string> = {
  cao: "Chính thức",
  "trung-binh": "Cần đối chiếu",
  "tham-khao": "Tham khảo",
  "minh-hoa": "Minh hoạ",
};

/** Nhãn nguồn gắn cạnh mỗi con số: mức tin cậy + tên đơn vị công bố + năm, bấm để xem chi tiết nguồn. */
export function SourceChip({ source, year, className }: { source: DataSource; year?: number; className?: string }) {
  return (
    <a
      href={`/viec-lam#nguon-${source.id}`}
      title={`${source.title} — ${source.publisher} (${source.year}). ${source.note}`}
      className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset hover:underline", TRUST_STYLE[source.trust], className)}
    >
      <span className="shrink-0">{TRUST_SHORT[source.trust]}</span>
      <span className="truncate font-normal">
        · {source.kind === "minh-hoa" ? "chưa phải số liệu thật" : `${source.publisher}${year ? `, ${year}` : ""}`}
      </span>
    </a>
  );
}

export function TrustBadge({ trust }: { trust: TrustLevel }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TRUST_STYLE[trust])}>{TRUST_SHORT[trust]}</span>;
}
