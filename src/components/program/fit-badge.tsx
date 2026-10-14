import { LuInfo } from "react-icons/lu";
import type { FitInfo } from "@/services/scoring.service";
import { Badge } from "@/components/ui/badge";

const tone = { "an-toan": "success", "vua-suc": "primary", "thu-suc": "accent" } as const;

export function FitBadge({ fit }: { fit: FitInfo | null }) {
  if (!fit) return null;
  return (
    <Badge tone={tone[fit.level]} title={`${fit.hint} Mức độ chỉ mang tính tham khảo.`}>
      {fit.label}
      <LuInfo className="size-3" aria-hidden />
      <span className="sr-only">. {fit.hint}</span>
    </Badge>
  );
}

/** Nhãn thay cho An toàn / Vừa sức / Thử sức khi chưa đủ dữ liệu để đánh giá (không đoán). */
export function FitGapBadge({ reason }: { reason: "no-score" | "few-years" }) {
  const hint =
    reason === "no-score"
      ? "Chưa có điểm của bạn — Trovio không gắn nhãn An toàn / Vừa sức / Thử sức khi chưa có điểm."
      : "Chương trình chưa có đủ 3 năm điểm chuẩn — Trovio không gắn nhãn khi chưa đủ dữ liệu.";
  return (
    <span
      title={hint}
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-600"
    >
      <LuInfo className="size-3" aria-hidden />
      Chưa đủ dữ liệu
      <span className="sr-only">. {hint}</span>
    </span>
  );
}

export function CompetitionBadge({ level }: { level: "Cao" | "Trung bình" | "Thấp" }) {
  const t = level === "Cao" ? "danger" : level === "Trung bình" ? "accent" : "success";
  return <Badge tone={t}>Cạnh tranh {level.toLowerCase()}</Badge>;
}
