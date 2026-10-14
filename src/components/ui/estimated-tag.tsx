import { ESTIMATED_HINT, ESTIMATED_LABEL } from "@/services/scoring.service";
import { cn } from "@/lib/cn";

/** Nhãn "Ước tính" cạnh điểm chuẩn chưa phải số trường công bố (dùng được ở server & client). */
export function EstimatedTag({ className, tone = "default" }: { className?: string; tone?: "default" | "onDark" }) {
  return (
    <span
      title={ESTIMATED_HINT}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-px text-[11px] font-bold tracking-wide uppercase",
        tone === "onDark" ? "bg-white text-accent-700" : "bg-accent-100 text-accent-700",
        className,
      )}
    >
      {ESTIMATED_LABEL}
      <span className="sr-only"> — số ước tính, chưa phải điểm chuẩn trường công bố</span>
    </span>
  );
}
