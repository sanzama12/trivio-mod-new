"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuBadgeCheck, LuCheck, LuTriangleAlert, LuX } from "react-icons/lu";
import { FLAG_LABELS } from "@/domain/reviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

interface Item {
  id: string;
  programName: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  flags: string[];
  answers: { id: string; displayName: string; schoolDomain: string; text: string; createdAt: string; flags: string[] }[];
}

const when = (iso: string) => new Date(iso).toLocaleString("vi-VN");

/** Hàng đợi duyệt câu hỏi / câu trả lời của mục "Hỏi sinh viên đang học". */
export function QaModeration({ items }: { items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(questionId: string, answerId: string | null, action: "approve" | "reject") {
    setBusy(answerId ?? questionId);
    const res = await fetch("/api/admin/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, answerId, action }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return toast("Thao tác không thành công", "warning");
    toast(action === "approve" ? "Đã duyệt" : "Đã từ chối", action === "approve" ? "success" : "info");
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState icon={<LuCheck className="size-6" aria-hidden />} title="Không có gì chờ duyệt" description="Câu hỏi và câu trả lời mới sẽ xuất hiện ở đây." />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {items.map((q) => (
        <Card key={q.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge tone="slate">{q.programName}</Badge>
            <span>{when(q.createdAt)}</span>
            {q.status === "pending" ? <Badge tone="accent">Câu hỏi chờ duyệt</Badge> : <Badge tone="success">Câu hỏi đã duyệt</Badge>}
          </div>
          <p className="mt-2 font-semibold text-slate-900">{q.text}</p>
          <Flags flags={q.flags} />
          {q.status === "pending" && (
            <Actions busy={busy === q.id} onApprove={() => act(q.id, null, "approve")} onReject={() => act(q.id, null, "reject")} />
          )}
          {q.answers.length > 0 && (
            <ul className="mt-4 space-y-3 border-l-2 border-primary-100 pl-4">
              {q.answers.map((a) => (
                <li key={a.id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <strong className="text-slate-800">{a.displayName}</strong>
                    <Badge tone="success">
                      <LuBadgeCheck className="size-3.5" aria-hidden /> @{a.schoolDomain}
                    </Badge>
                    <span className="text-xs text-slate-500">{when(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{a.text}</p>
                  <Flags flags={a.flags} />
                  <Actions busy={busy === a.id} onApprove={() => act(q.id, a.id, "approve")} onReject={() => act(q.id, a.id, "reject")} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

function Flags({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <Badge key={f} tone="danger">
          <LuTriangleAlert className="size-3" aria-hidden /> {FLAG_LABELS[f] ?? f}
        </Badge>
      ))}
    </div>
  );
}

function Actions({ busy, onApprove, onReject }: { busy: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <Button size="sm" disabled={busy} onClick={onApprove}>
        <LuCheck className="size-4" aria-hidden /> Duyệt
      </Button>
      <Button variant="ghost" size="sm" className="text-danger-700" disabled={busy} onClick={onReject}>
        <LuX className="size-4" aria-hidden /> Từ chối
      </Button>
    </div>
  );
}
