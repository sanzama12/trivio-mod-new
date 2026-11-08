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
        className={buttonClass({ variant: "ghost", size: "sm" })}
      >
        <LuHeart className={cn("size-4 transition-transform", saved && "fill-current text-primary-600")} aria-hidden />
        <span>{saved ? "Đã lưu" : "Lưu"}</span>
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} className={buttonClass({ variant: "outline", full: true })}>
        <LuHeart className={cn("size-4", saved && "fill-current")} aria-hidden />
        {saved ? "Đã lưu" : "Lưu"}
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
        "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 max-sm:size-11 rounded-lg border transition-colors",
        saved ? "border-primary-200 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700",
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
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        <LuScale className="size-3.5" aria-hidden />
        <span>{active ? "Đang so sánh" : "Thêm vào so sánh"}</span>
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
      {active ? "Đang so sánh" : "Thêm vào so sánh"}
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
      {active ? "Đã thêm nguyện vọng" : "Thêm vào nguyện vọng"}
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
          <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-white py-2.5 pr-2.5 pl-4 shadow-elevated">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-primary-600 animate-pulse" />
              <span className="text-sm font-semibold text-slate-800">
                Đang chọn <span className="font-bold text-primary-800">{compare.length}/{MAX_COMPARE}</span> chương trình
              </span>
            </div>

            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Bỏ chọn tất cả"
              title="Xóa danh sách so sánh"
            >
              <LuX className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={buttonClass({ size: "sm" })}
            >
              <LuScale className="size-4" />
              <span>So sánh ({compare.length})</span>
            </button>
          </div>
        </div>
      ) : null}

      <CompareModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

/** Nút mở bảng so sánh đặt tại các trang tìm trường, danh mục trường... */
export function OpenCompareButton({ className, kind = "program" }: { className?: string; kind?: "program" | "school" }) {
  const { compare, compareSchools, hydrated } = useTrovio();
  const [open, setOpen] = useState(false);
  const count = hydrated ? (kind === "school" ? compareSchools.length : compare.length) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => kind === "school" ? window.location.assign("/so-sanh?tab=truong") : setOpen(true)}
        className={cn(buttonClass({ variant: "secondary" }), count === 0 && "max-sm:hidden!", className)}
      >
        <LuScale className="size-4 text-primary-700" />
        <span>So sánh ({count})</span>
      </button>

      <CompareModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
