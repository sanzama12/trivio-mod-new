"use client";

/** Hộp thoại xác nhận (UI Patterns · Section 2): "Xác nhận xoá" (đỏ) và "Chưa lưu thay đổi" (cam, 3 nút). */
import { useRef, type ReactNode } from "react";
import { LuCircleAlert, LuTrash2 } from "react-icons/lu";
import { useModal } from "./use-modal";
import { cn } from "@/lib/cn";

export function ConfirmDialog({
  open,
  tone = "danger",
  title,
  children,
  confirmLabel,
  cancelLabel = "Huỷ",
  onConfirm,
  onCancel,
  secondary,
}: {
  open: boolean;
  tone?: "danger" | "warning";
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Nút phụ bên trái (VD "Không lưu"). */
  secondary?: { label: string; onClick: () => void };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, open, onCancel);
  if (!open) return null;
  const Icon = tone === "danger" ? LuTrash2 : LuCircleAlert;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" tabIndex={-1} aria-label="Đóng" className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-body" className="relative w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-elevated">
        <div className="flex gap-4">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tone === "danger" ? "bg-danger-50 text-danger-600" : "bg-accent-50 text-accent-700")} aria-hidden>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="cf-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <div id="cf-body" className="mt-1.5 text-sm text-slate-600">
              {children}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {secondary && (
            <button type="button" onClick={secondary.onClick} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {secondary.label}
            </button>
          )}
          <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {cancelLabel}
          </button>
          <button type="button" data-autofocus onClick={onConfirm} className={cn("h-10 rounded-lg px-4 text-sm font-semibold text-white", tone === "danger" ? "bg-danger-600 hover:bg-danger-700" : "bg-primary-600 hover:bg-primary-700")}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
