"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuCheck, LuFlag, LuTriangleAlert, LuX } from "react-icons/lu";
import type { ReviewCriterion, ReviewStatus } from "@/domain/types";
import { FLAG_LABELS, REJECT_REASONS, RELATION_LABELS, REPORT_REASONS, REVIEW_CRITERIA, type RejectReason } from "@/domain/reviews";
import { formatDateVi } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Stars } from "@/components/reviews/stars";

interface QueueItem {
  id: string;
  authorName: string;
  relation: "sinh-vien" | "cuu-sinh-vien";
  cohort: number | null;
  majorName: string | null;
  ratings: Record<ReviewCriterion, number>;
  overall: number;
  title: string;
  content: string;
  createdAt: string;
  schoolEmail: boolean;
  demo: boolean;
  status: ReviewStatus;
  flags: string[];
  reports: { reason: string; at: string }[];
  schoolName: string;
}

export function ModerationQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, RejectReason>>({});

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "reject" ? (reason[id] ?? "vi-pham-quy-tac") : undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast(d.message ?? "Không thực hiện được", "warning");
    toast(action === "approve" ? "Đã duyệt — cảm nhận đang hiển thị" : "Đã từ chối và báo lý do cho người viết", "success");
    router.refresh();
  };

  if (items.length === 0) {
    return <Card className="mt-6 p-8 text-center text-sm text-slate-500">Không còn cảm nhận nào chờ kiểm duyệt.</Card>;
  }

  return (
    <ul className="mt-6 space-y-4">
      {items.map((r) => (
        <li key={r.id}>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={r.status === "hidden" ? "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700" : "rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700"}>
                {r.status === "hidden" ? "Bị ẩn do báo cáo" : "Chờ duyệt"}
              </span>
              <span className="text-sm font-semibold text-slate-900">{r.schoolName}</span>
              <Stars value={r.overall} />
              {r.demo && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">Minh hoạ</span>}
            </div>
            <p className="mt-2 font-bold text-slate-900">{r.title}</p>
            <p className="text-xs text-slate-500">
              {r.authorName} · {RELATION_LABELS[r.relation]}
              {r.cohort ? ` khoá ${r.cohort}` : ""}
              {r.majorName ? ` · ${r.majorName}` : ""} · gửi {formatDateVi(r.createdAt)}
              {r.schoolEmail ? " · email trường" : ""}
            </p>
            {r.flags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {r.flags.map((f) => (
                  <li key={f} className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-semibold text-danger-700">
                    <LuTriangleAlert className="size-3" aria-hidden /> {FLAG_LABELS[f] ?? f}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">{r.content}</p>
            <p className="mt-2 text-xs text-slate-500">{(Object.keys(REVIEW_CRITERIA) as ReviewCriterion[]).map((c) => `${REVIEW_CRITERIA[c]} ${r.ratings[c]}/5`).join(" · ")}</p>
            {r.reports.length > 0 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-danger-700">
                <LuFlag className="size-3.5" aria-hidden /> {r.reports.length} báo cáo: {r.reports.map((x) => REPORT_REASONS[x.reason as keyof typeof REPORT_REASONS] ?? x.reason).join(", ")}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" onClick={() => act(r.id, "approve")} disabled={busy === r.id}>
                <LuCheck className="size-4" aria-hidden /> Duyệt
              </Button>
              <label className="sr-only" htmlFor={`rj-${r.id}`}>
                Lý do từ chối
              </label>
              <select
                id={`rj-${r.id}`}
                value={reason[r.id] ?? "vi-pham-quy-tac"}
                onChange={(e) => setReason({ ...reason, [r.id]: e.target.value as RejectReason })}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
              >
                {(Object.keys(REJECT_REASONS) as RejectReason[]).map((k) => (
                  <option key={k} value={k}>
                    {REJECT_REASONS[k]}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="danger" onClick={() => act(r.id, "reject")} disabled={busy === r.id}>
                <LuX className="size-4" aria-hidden /> Từ chối
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
