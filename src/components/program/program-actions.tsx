"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuArrowLeftRight, LuCheck, LuHeart, LuListChecks, LuScale, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { buttonClass } from "@/components/ui/button";
import { useLoginGate } from "@/components/auth/login-gate";

export function SaveButton({ id, variant = "icon" }: { id: string; variant?: "icon" | "full" | "text" }) {
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

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer",
          saved ? "text-danger-600 font-bold" : "text-slate-600 hover:text-danger-600"
        )}
      >
        <LuHeart className={cn("size-4 transition-transform", saved && "fill-current text-danger-500")} aria-hidden />
        <span>{saved ? "Đã yêu thích" : "Yêu thích"}</span>
      </button>
    );
  }

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

export function CompareButton({ id, full = false, variant = "default" }: { id: string; full?: boolean; variant?: "default" | "pill" }) {
  const { inCompare, toggleCompare, hydrated } = useTrovio();
  const toast = useToast();
  const active = hydrated && inCompare(id);
  const onClick = () => {
    const r = toggleCompare(id);
    if (r === "full") toast(`Chỉ so sánh tối đa ${MAX_COMPARE} chương trình. Bỏ bớt một chương trình để thêm mới.`, "warning");
    else toast(r === "added" ? "Đã thêm vào so sánh" : "Đã bỏ khỏi so sánh", "info");
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border cursor-pointer",
          active
            ? "border-teal-700 bg-teal-50 text-teal-800 shadow-sm"
            : "border-slate-300 bg-white text-slate-700 hover:border-teal-600 hover:text-teal-700 hover:bg-teal-50/50"
        )}
      >
        <LuScale className="size-3.5" aria-hidden />
        <span>{active ? "Đang so sánh" : "So sánh"}</span>
      </button>
    );
  }

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

import { useState } from "react";
import { CompareModal } from "./compare-modal";

/** Thanh nổi cuối trang khi đang chọn chương trình để so sánh. */
const COMPARE_BAR_HIDDEN_ON = ["/trac-nghiem/lam-bai", "/diem-cua-toi"];

/** Thanh so sánh có đang hiển thị không (để các nút nổi khác tránh che nhau). */
export function useCompareBarVisible(): boolean {
  const { compare, hydrated } = useTrovio();
  const pathname = usePathname();
  return hydrated && compare.length > 0 && !COMPARE_BAR_HIDDEN_ON.some((p) => pathname.startsWith(p));
}

export function CompareBar() {
  const { compare, clearCompare } = useTrovio();
  const [showModal, setShowModal] = useState(false);
  const visible = useCompareBarVisible();

  return (
    <>
      {visible ? (
        <div data-print-hide className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-white py-2.5 pr-2.5 pl-4 shadow-elevated">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-teal-600 animate-pulse" />
              <span className="text-sm font-semibold text-slate-800">
                Đang chọn <span className="font-bold text-teal-800">{compare.length}/{MAX_COMPARE}</span> chương trình
              </span>
            </div>

            <button
              type="button"
              onClick={clearCompare}
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Bỏ chọn tất cả"
              title="Xóa danh sách so sánh"
            >
              <LuX className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-800 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-teal-900 cursor-pointer"
            >
              <LuScale className="size-4" />
              <span>So sánh ngay</span>
            </button>
          </div>
        </div>
      ) : null}

      <CompareModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

/** Nút mở bảng so sánh đặt tại các trang tìm trường, danh mục trường... */
export function OpenCompareButton({ className }: { className?: string }) {
  const { compare, hydrated } = useTrovio();
  const [open, setOpen] = useState(false);
  const count = hydrated ? compare.length : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-stone-800 shadow-xs hover:bg-stone-50 transition-colors cursor-pointer",
          count > 0 && "border-teal-600 bg-teal-50/60 text-teal-900",
          className
        )}
      >
        <LuScale className="size-4 text-teal-700" />
        <span>Bảng so sánh</span>
        {count > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-teal-700 text-[10px] font-black text-white">
            {count}
          </span>
        ) : null}
      </button>

      <CompareModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
