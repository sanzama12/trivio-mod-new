import Link from "next/link";
import { cn } from "@/lib/cn";

/** Biểu tượng Trovio 2026: hai trang sách mở tạo chữ V ("via" — con đường) nâng sao Bắc Đẩu (định hướng). Lưới 24px như Figma. */
export const LOGO_BOOK_PATH = "M12 13C9.4 10.4 6.4 9 3 8.6V18.6C6.4 19 9.4 20.2 12 22C14.6 20.2 17.6 19 21 18.6V8.6C17.6 9 14.6 10.4 12 13ZM12 13V22";
export const LOGO_STAR_PATH = "M12 1C12.6 3.7 13.3 4.4 16 5C13.3 5.6 12.6 6.3 12 9C11.4 6.3 10.7 5.6 8 5C10.7 4.4 11.4 3.7 12 1Z";

export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "white" }) {
  const stroke = tone === "white" ? "#ffffff" : "#4F46E5";
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-9", className)}>
      <path d={LOGO_BOOK_PATH} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_STAR_PATH} stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** `compact`: bỏ khẩu hiệu; `taglineFromSm`: chỉ hiện khẩu hiệu từ màn ≥ 640px (điện thoại hẹp không bị tràn). */
export function Logo({ tone = "brand", href = "/", compact = false, taglineFromSm = false }: { tone?: "brand" | "white"; href?: string; compact?: boolean; taglineFromSm?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="Trovio – về trang chủ">
      <LogoMark tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-lg font-extrabold tracking-tight", tone === "white" ? "text-white" : "text-primary-600")}>Trovio</span>
        {!compact && <span className={cn("mt-1 text-[10px] font-semibold tracking-[0.12em] uppercase", taglineFromSm && "hidden sm:block", tone === "white" ? "text-accent-200" : "text-accent-700")}>Định hướng tương lai</span>}
      </span>
    </Link>
  );
}
