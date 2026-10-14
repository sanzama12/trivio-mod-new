import { cn } from "@/lib/cn";
import { initials } from "@/lib/text";

/** Ảnh đại diện (Google) hoặc chữ viết tắt họ tên. Dùng <img> thường để không cần cấu hình remotePatterns. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" referrerPolicy="no-referrer" className={cn("shrink-0 rounded-full object-cover", className)} />
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700", className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
