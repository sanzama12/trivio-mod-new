"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuArrowLeftRight, LuCheck, LuHeart, LuListChecks, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { buttonClass } from "@/components/ui/button";
import { useLoginGate } from "@/components/auth/login-gate";

export function SaveButton({ id, variant = "icon" }: { id: string; variant?: "icon" | "full" }) {
  const { isSaved, toggleSaved, hydrated, user, saved: savedIds } = useTrovio();
  const { nudge } = useLoginGate();
  const toast = useToast();
  const saved = hydrated && isSaved(id);
  const onClick = () => {
    const added = toggleSaved(id);
    toast(added ? "Đã lưu chương trình" : "Đã bỏ lưu chương trình", "success");
    // Khách lưu từ mục thứ 2 trở đi: nhắc (mềm) đăng nhập để không mất danh sách.
    if (added && !user && savedIds.length + 1 >= 2) {
      nudge({
        title: "Lưu danh sách vào tài khoản?",
        reason: "Danh sách hiện chỉ nằm trên trình duyệt này và có thể mất khi đổi máy hoặc xoá dữ liệu duyệt web.",
      });
    }
  };

  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} className={buttonClass({ variant: "outline", full: true })}>
        <LuHeart className={cn("size-4", saved && "fill-current")} aria-hidden />
        {saved ? "Đã lưu chương trình" : "Lưu chương trình học"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Bỏ lưu chương trình" : "Lưu chương trình"}
      title={saved ? "Bỏ lưu" : "Lưu"}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        saved ? "border-danger-100 bg-danger-50 text-danger-500" : "border-slate-200 text-slate-500 hover:border-danger-100 hover:text-danger-500",
      )}
    >
      <LuHeart className={cn("size-4", saved && "fill-current")} aria-hidden />
    </button>
  );
}

export function CompareButton({ id, full = false }: { id: string; full?: boolean }) {
  const { inCompare, toggleCompare, hydrated } = useTrovio();
  const toast = useToast();
  const active = hydrated && inCompare(id);
  const onClick = () => {
    const r = toggleCompare(id);
    if (r === "full") toast(`Chỉ so sánh tối đa ${MAX_COMPARE} chương trình. Bỏ bớt một chương trình để thêm mới.`, "warning");
    else toast(r === "added" ? "Đã thêm vào so sánh" : "Đã bỏ khỏi so sánh", "info");
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={buttonClass({ variant: active ? "secondary" : "outline", size: full ? "md" : "sm", full })}
    >
      {active ? <LuCheck className="size-4" aria-hidden /> : <LuArrowLeftRight className="size-4" aria-hidden />}
      {active ? "Đang so sánh" : full ? "So sánh chương trình này" : "Thêm so sánh"}
    </button>
  );
}

export function WishlistButton({ id }: { id: string }) {
  const { inWishlist, addWishlist, removeWishlist, hydrated } = useTrovio();
  const { requireLogin } = useLoginGate();
  const toast = useToast();
  const active = hydrated && inWishlist(id);
  return (
    <button
      type="button"
      onClick={() => {
        if (active) {
          removeWishlist(id);
          toast("Đã bỏ khỏi nguyện vọng dự kiến", "info");
          return;
        }
        requireLogin(
          {
            title: "Đăng nhập để lập nguyện vọng",
            reason: "Danh sách nguyện vọng dự kiến được lưu theo tài khoản để bạn sắp xếp, ghi chú và xem lại trên mọi thiết bị.",
            intent: { kind: "wishlist", id },
          },
          () => {
            addWishlist(id);
            toast("Đã thêm vào nguyện vọng dự kiến", "success");
          },
        );
      }}
      aria-pressed={active}
      className={buttonClass({ variant: active ? "secondary" : "primary", full: true })}
    >
      <LuListChecks className="size-4" aria-hidden />
      {active ? "Đã có trong nguyện vọng" : "Thêm vào nguyện vọng"}
    </button>
  );
}

/** Thanh nổi cuối trang khi đang chọn chương trình để so sánh. */
const COMPARE_BAR_HIDDEN_ON = ["/so-sanh", "/trac-nghiem/lam-bai", "/diem-cua-toi"];

/** Thanh so sánh có đang hiển thị không (để các nút nổi khác tránh che nhau). */
export function useCompareBarVisible(): boolean {
  const { compare, hydrated } = useTrovio();
  const pathname = usePathname();
  return hydrated && compare.length > 0 && !COMPARE_BAR_HIDDEN_ON.some((p) => pathname.startsWith(p));
}

export function CompareBar() {
  const { compare, clearCompare } = useTrovio();
  const visible = useCompareBarVisible();
  if (!visible) return null;
  return (
    <div data-print-hide className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-white py-2.5 pr-2.5 pl-4 shadow-elevated">
        <span className="text-sm font-semibold text-slate-700">
          Đang chọn <span className="text-primary-600">{compare.length}/{MAX_COMPARE}</span> chương trình
        </span>
        <button type="button" onClick={clearCompare} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Bỏ chọn tất cả">
          <LuX className="size-4" />
        </button>
        <Link href="/so-sanh" className={buttonClass({ size: "sm" })}>
          So sánh ngay
        </Link>
      </div>
    </div>
  );
}
