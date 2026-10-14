import { LuStar } from "react-icons/lu";
import { cn } from "@/lib/cn";

/** Hiển thị số sao (hỗ trợ nửa sao theo làm tròn). */
export function Stars({ value, size = "sm", label }: { value: number; size?: "sm" | "md"; label?: string }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${value.toLocaleString("vi-VN")} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <LuStar key={i} className={cn(size === "sm" ? "size-3.5" : "size-5", i <= full ? "fill-accent-500 text-accent-500" : "text-slate-300")} aria-hidden />
      ))}
    </span>
  );
}

/** Chọn sao 1–5 bằng nhóm radio (dùng được bằng bàn phím). */
export function StarInput({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-2">
      <legend className="float-left text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="relative cursor-pointer rounded p-0.5 focus-within:ring-2 focus-within:ring-primary-300">
            <input type="radio" name={name} value={i} checked={value === i} onChange={() => onChange(i)} className="sr-only" aria-label={`${i} sao`} />
            <LuStar className={cn("size-6", i <= value ? "fill-accent-500 text-accent-500" : "text-slate-300 hover:text-accent-200")} aria-hidden />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
