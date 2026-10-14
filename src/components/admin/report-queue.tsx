"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LuCircleCheck, LuExternalLink, LuMail, LuUser } from "react-icons/lu";
import type { DataReport, DataReportStatus } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type Item = DataReport & { program: { name: string; slug: string } | null };

const STATUS: Record<DataReportStatus, { label: string; cls: string }> = {
  moi: { label: "Mới", cls: "bg-accent-100 text-accent-700" },
  "dang-xu-ly": { label: "Đang xử lý", cls: "bg-primary-50 text-primary-700" },
  "da-xu-ly": { label: "Đã sửa dữ liệu", cls: "bg-success-50 text-success-700" },
  "khong-hop-le": { label: "Không cần sửa", cls: "bg-slate-100 text-slate-700" },
};
const TOPIC: Record<DataReport["topic"], string> = {
  "diem-chuan": "Điểm chuẩn",
  "hoc-phi": "Học phí",
  "chi-tieu": "Chỉ tiêu",
  "to-hop": "Tổ hợp / phương thức",
  "thong-tin-truong": "Thông tin trường / ngành",
  khac: "Khác",
};
const FILTERS: { key: string; label: string; match: DataReportStatus[] }[] = [
  { key: "open", label: "Cần xử lý", match: ["moi", "dang-xu-ly"] },
  { key: "done", label: "Đã kết thúc", match: ["da-xu-ly", "khong-hop-le"] },
  { key: "all", label: "Tất cả", match: ["moi", "dang-xu-ly", "da-xu-ly", "khong-hop-le"] },
];
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function ReportQueue({ items }: { items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState("open");
  const [draft, setDraft] = useState<Record<string, { status: DataReportStatus; note: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const shown = useMemo(() => items.filter((r) => FILTERS.find((f) => f.key === filter)!.match.includes(r.status)), [items, filter]);

  const save = async (r: Item) => {
    const d = draft[r.id] ?? { status: r.status, note: r.adminNote ?? "" };
    setBusy(r.id);
    const res = await fetch(`/api/admin/reports/${encodeURIComponent(r.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: d.status, note: d.note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !data.ok) return setError((e) => ({ ...e, [r.id]: data.message ?? "Không lưu được." }));
    setError((e) => ({ ...e, [r.id]: "" }));
    toast(d.status === "da-xu-ly" || d.status === "khong-hop-le" ? "Đã lưu và báo kết quả cho người gửi" : "Đã lưu", "success");
    router.refresh();
  };

  return (
    <div className="mt-6">
      <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = items.filter((r) => f.match.includes(r.status)).length;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm", filter === f.key ? "border-primary-600 bg-primary-50 font-semibold text-primary-700" : "border-slate-200 text-slate-700 hover:border-primary-200")}
            >
              {f.label} ({n})
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center gap-2 p-8 text-center">
          <LuCircleCheck className="size-8 text-success-600" aria-hidden />
          <p className="font-semibold text-slate-900">{filter === "open" ? "Đã xử lý hết báo lỗi" : "Không có báo lỗi nào trong mục này"}</p>
          <p className="text-sm text-slate-500">Báo lỗi mới từ người dùng sẽ xuất hiện ở đây và trên chuông thông báo.</p>
        </Card>
      ) : (
        <ul className="mt-4 space-y-4">
          {shown.map((r) => {
            const d = draft[r.id] ?? { status: r.status, note: r.adminNote ?? "" };
            const set = (patch: Partial<typeof d>) => setDraft((x) => ({ ...x, [r.id]: { ...d, ...patch } }));
            return (
              <li key={r.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {TOPIC[r.topic]}
                        {r.page && <span className="font-normal text-slate-600"> · {r.page}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Gửi lúc {when(r.createdAt)}
                        {r.handledBy && <> · cập nhật {when(r.updatedAt)}</>}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[r.status].cls)}>{STATUS[r.status].label}</span>
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-800">{r.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
                    {r.program && (
                      <Link href={`/chuong-trinh/${r.program.slug}`} className="inline-flex items-center gap-1 text-primary-700 hover:underline">
                        <LuExternalLink className="size-3.5" aria-hidden /> {r.program.name}
                      </Link>
                    )}
                    {r.programId && (
                      <Link href={`/quan-tri/chuong-trinh/${r.programId}`} className="text-primary-700 hover:underline">
                        Sửa dữ liệu chương trình
                      </Link>
                    )}
                    <span className="inline-flex items-center gap-1">
                      {r.userId ? <LuUser className="size-3.5" aria-hidden /> : <LuMail className="size-3.5" aria-hidden />}
                      {r.userId ? "Người dùng đã đăng nhập" : r.email ? r.email : "Không để lại liên hệ"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[200px_1fr_auto] md:items-start">
                    <div>
                      <label htmlFor={`st-${r.id}`} className="mb-1 block text-xs font-medium text-slate-600">
                        Trạng thái
                      </label>
                      <select
                        id={`st-${r.id}`}
                        value={d.status}
                        onChange={(e) => set({ status: e.target.value as DataReportStatus })}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      >
                        {(Object.keys(STATUS) as DataReportStatus[]).map((k) => (
                          <option key={k} value={k}>
                            {STATUS[k].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`nt-${r.id}`} className="mb-1 block text-xs font-medium text-slate-600">
                        Ghi chú xử lý (gửi cho người báo khi kết thúc)
                      </label>
                      <textarea
                        id={`nt-${r.id}`}
                        rows={2}
                        maxLength={1000}
                        value={d.note}
                        onChange={(e) => set({ note: e.target.value })}
                        placeholder="VD: Đã cập nhật điểm chuẩn 2025 theo đề án của trường."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
                      />
                      {error[r.id] && (
                        <p role="alert" className="mt-1 text-[13px] font-medium text-danger-700">
                          {error[r.id]}
                        </p>
                      )}
                    </div>
                    <Button size="sm" className="md:mt-5" onClick={() => save(r)} disabled={busy === r.id}>
                      {busy === r.id ? "Đang lưu…" : "Lưu"}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
