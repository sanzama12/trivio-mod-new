"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowLeftRight, LuScale, LuTrash2, LuX } from "react-icons/lu";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { CompareView } from "./compare-view";

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
}

export function CompareModal({ open, onClose }: CompareModalProps) {
  const { compare, clearCompare } = useTrovio();

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Khóa cuộn trang khi modal mở
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs"
    >
      {/* Nền đen mờ bấm ra ngoài để đóng */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Cửa sổ bảng so sánh */}
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 shadow-xs">
              <LuScale className="size-5" />
            </div>
            <div>
              <h2 id="compare-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
                Bảng so sánh chương trình đào tạo
              </h2>
              <p className="text-xs text-stone-500">
                Đang đối chiếu <strong className="text-stone-900">{compare.length}/{MAX_COMPARE}</strong> chương trình cạnh nhau
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compare.length > 0 ? (
              <button
                type="button"
                onClick={clearCompare}
                className="hidden sm:inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
              >
                <LuTrash2 className="size-3.5" />
                <span>Xóa tất cả</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng so sánh"
              className="flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <LuX className="size-5" />
            </button>
          </div>
        </div>

        {/* Nội dung bảng so sánh (cuộn được) */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <CompareView />
        </div>

        {/* Footer Modal */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <Link
            href="/so-sanh"
            onClick={onClose}
            className="inline-flex items-center gap-1 font-bold text-primary-700 hover:underline"
          >
            <span>Mở trang so sánh trường đại học & biểu đồ đầy đủ</span>
            <LuArrowLeftRight className="size-3" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-4 py-2 font-bold text-white shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Đóng bảng so sánh
          </button>
        </div>
      </div>
    </div>
  );
}
