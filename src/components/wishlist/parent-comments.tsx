"use client";

import { useEffect, useState } from "react";
import { LuMessageCircle, LuTrash2 } from "react-icons/lu";
import type { ShareComment } from "@/domain/types";
import { formatDateVi } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";

/** Góp ý phụ huynh gửi qua link chia sẻ (chỉ chủ tài khoản thấy). */
export function ParentComments({ programName }: { programName: (id: string) => string | null }) {
  const toast = useToast();
  const [comments, setComments] = useState<ShareComment[] | null>(null);

  useEffect(() => {
    fetch("/api/account/share/comments?markRead=1")
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setComments([]));
  }, []);

  if (!comments || comments.length === 0) return null;

  const remove = async (id: string) => {
    const res = await fetch(`/api/account/share/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setComments((c) => c?.filter((x) => x.id !== id) ?? null);
      toast("Đã xoá góp ý", "info");
    }
  };

  return (
    <section aria-labelledby="parent-comments" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:p-5" data-print-hide>
      <h2 id="parent-comments" className="flex items-center gap-2 font-bold text-slate-900">
        <LuMessageCircle className="size-5 text-primary-600" aria-hidden /> Góp ý từ phụ huynh ({comments.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className={cn("rounded-xl border p-3.5", c.read ? "border-slate-200" : "border-primary-200 bg-primary-50/50")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {c.name}
                  {!c.read && <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">Mới</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateVi(c.createdAt)}
                  {c.programId && programName(c.programId) ? ` · về “${programName(c.programId)}”` : ""}
                </p>
              </div>
              <button type="button" onClick={() => remove(c.id)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-700" aria-label={`Xoá góp ý của ${c.name}`}>
                <LuTrash2 className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{c.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
