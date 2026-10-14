"use client";

/** Bản sửa số liệu do cán bộ tuyển sinh gửi từ Cổng trường — quản trị viên duyệt hoặc từ chối (kèm lý do). */
import { useState } from "react";
import { LuExternalLink } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminPost } from "./use-admin-post";
import { fmtDate, inputCls } from "./ui";

export interface SubmissionItem {
  id: string;
  schoolName: string;
  programName: string;
  fieldLabel: string;
  current: string;
  proposed: string;
  evidenceUrl: string;
  note: string;
  byEmail: string;
  createdAt: string;
}

export function SubmissionQueue({ items }: { items: SubmissionItem[] }) {
  const { post, busy } = useAdminPost();
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (items.length === 0) return <p className="mt-4 text-sm text-slate-500">Không có bản sửa nào đang chờ duyệt.</p>;
  return (
    <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
      {items.map((s) => (
        <li key={s.id} id={s.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {s.schoolName} · {s.programName}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <Badge tone="primary">{s.fieldLabel}</Badge> <span className="text-slate-500 line-through">{s.current}</span> → <strong>{s.proposed}</strong>
            </p>
            {s.note && <p className="mt-1 text-[13px] text-slate-600">“{s.note}”</p>}
            <p className="mt-1 text-xs text-slate-500">
              {s.byEmail} · {fmtDate(s.createdAt)} ·{" "}
              <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
                Minh chứng <LuExternalLink className="size-3" aria-hidden />
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <label className="sr-only" htmlFor={`note-${s.id}`}>
              Ghi chú gửi trường
            </label>
            <input id={`note-${s.id}`} className={inputCls} placeholder="Ghi chú (bắt buộc khi từ chối)" value={notes[s.id] ?? ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} maxLength={300} />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" disabled={busy} onClick={() => post(`/api/admin/school-submissions/${s.id}`, { action: "approve", note: notes[s.id] }, { success: "Đã áp dụng bản sửa và báo cho trường." })}>
                Duyệt & áp dụng
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => post(`/api/admin/school-submissions/${s.id}`, { action: "reject", note: notes[s.id] }, { success: "Đã từ chối và báo cho trường." })}>
                Từ chối
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
