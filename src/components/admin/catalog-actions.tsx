"use client";

import { LuEye, LuEyeOff } from "react-icons/lu";
import { useAdminPost } from "./use-admin-post";

/** Tạm ẩn / hiển thị lại một chương trình (không xoá dữ liệu). */
export function ProgramVisibility({ id, hidden }: { id: string; hidden: boolean }) {
  const { post, busy } = useAdminPost();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => post("/api/admin/catalog", { entity: "program", action: hidden ? "show" : "hide", id }, { success: hidden ? "Đã hiển thị lại chương trình." : "Đã tạm ẩn chương trình." })}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
    >
      {hidden ? <LuEye className="size-4" aria-hidden /> : <LuEyeOff className="size-4" aria-hidden />}
      {hidden ? "Hiển thị lại" : "Tạm ẩn"}
    </button>
  );
}
