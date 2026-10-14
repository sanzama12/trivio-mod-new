"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuBadgeCheck, LuPlus, LuRotateCcw, LuSave, LuSend, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import type { TimelineEvent } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const CATS: [TimelineEvent["category"], string][] = [
  ["dgnl", "Đánh giá năng lực"],
  ["dang-ky", "Đăng ký"],
  ["thi", "Kỳ thi"],
  ["ket-qua", "Kết quả"],
  ["nhap-hoc", "Nhập học"],
];

type Row = { id?: string; title: string; category: TimelineEvent["category"]; start: string; end: string; desc: string };
type Initial = { season: string; note: string; events: TimelineEvent[]; official: boolean; sourceUrl: string | null; updatedAt: string | null };

export function TimelineEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const [season, setSeason] = useState(initial.season);
  const [official, setOfficial] = useState(initial.official);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [note, setNote] = useState(initial.note);
  const [rows, setRows] = useState<Row[]>(initial.events.map((e) => ({ id: e.id, title: e.title, category: e.category, start: e.start, end: e.end ?? "", desc: e.desc })));
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Khôi phục lịch gốc xoá toàn bộ chỉnh sửa → bấm 2 lần mới thực hiện.
  const [confirmReset, setConfirmReset] = useState(false);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/timeline", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season, official, sourceUrl, note, events: rows.map((r) => ({ ...r, end: r.end || undefined })) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) return setError({ field: d.field, message: d.message ?? "Không lưu được." });
    setError(null);
    toast("Đã lưu lịch tuyển sinh", "success");
    router.refresh();
  };

  const reset = async () => {
    if (!confirmReset) return setConfirmReset(true);
    setConfirmReset(false);
    const res = await fetch("/api/admin/timeline", { method: "DELETE" });
    toast(res.ok ? "Đã quay về lịch minh hoạ gốc" : "Đang dùng lịch gốc", "info");
    router.refresh();
    if (res.ok) window.location.reload();
  };

  const runReminders = async () => {
    const res = await fetch("/api/admin/reminders", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? `Đã gửi ${d.sent ?? 0} email nhắc (kiểm tra ${d.checked ?? 0} tài khoản)` : "Không chạy được", res.ok ? "success" : "warning");
  };

  return (
    <form onSubmit={save} className="mt-6 space-y-6" noValidate>
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[140px_1fr]">
          <div>
            <Label htmlFor="tl-season">Mùa tuyển sinh</Label>
            <Input id="tl-season" inputMode="numeric" maxLength={4} value={season} onChange={(e) => setSeason(e.target.value)} invalid={error?.field === "season"} />
          </div>
          <div>
            <Label htmlFor="tl-note">Ghi chú hiển thị trên trang</Label>
            <Input id="tl-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <Checkbox
            label={
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LuBadgeCheck className="size-4 text-success-700" aria-hidden /> Lịch chính thức (đã đối chiếu văn bản của Bộ GD&amp;ĐT / ĐHQG)
              </span>
            }
            checked={official}
            onChange={(e) => setOfficial(e.target.checked)}
          />
          <div className="mt-3">
            <Label htmlFor="tl-src">Đường dẫn văn bản gốc {official ? "(bắt buộc)" : "(không bắt buộc)"}</Label>
            <Input id="tl-src" type="url" maxLength={500} placeholder="https://moet.gov.vn/..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} invalid={error?.field === "sourceUrl"} />
          </div>
          {!official && (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-accent-700">
              <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Đang hiển thị nhãn “Lịch minh hoạ” trên web.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Các mốc ({rows.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { title: "", category: "dang-ky", start: `${season}-01-01`, end: "", desc: "" }])}>
            <LuPlus className="size-4" aria-hidden /> Thêm mốc
          </Button>
        </div>
        <ol className="mt-4 space-y-4">
          {rows.map((r, i) => (
            <li key={r.id ?? `new-${i}`} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_170px]">
                <div>
                  <Label htmlFor={`ev-${i}-t`}>Mốc {i + 1} — tên</Label>
                  <Input id={`ev-${i}-t`} maxLength={120} value={r.title} onChange={(e) => set(i, { title: e.target.value })} invalid={error?.field === `events.${i}.title`} />
                </div>
                <div>
                  <Label htmlFor={`ev-${i}-c`}>Loại</Label>
                  <select id={`ev-${i}-c`} value={r.category} onChange={(e) => set(i, { category: e.target.value as TimelineEvent["category"] })} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                    {CATS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-[170px_170px_1fr_auto] md:items-end">
                <div>
                  <Label htmlFor={`ev-${i}-s`}>Bắt đầu</Label>
                  <Input id={`ev-${i}-s`} type="date" value={r.start} onChange={(e) => set(i, { start: e.target.value })} invalid={error?.field === `events.${i}.start`} />
                </div>
                <div>
                  <Label htmlFor={`ev-${i}-e`}>Kết thúc (nếu có)</Label>
                  <Input id={`ev-${i}-e`} type="date" value={r.end} onChange={(e) => set(i, { end: e.target.value })} invalid={error?.field === `events.${i}.end`} />
                </div>
                <div>
                  <Label htmlFor={`ev-${i}-d`}>Mô tả ngắn</Label>
                  <Input id={`ev-${i}-d`} maxLength={400} value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  aria-label={`Xoá mốc ${i + 1}`}
                  className="flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-danger-100 hover:bg-danger-50 hover:text-danger-700"
                >
                  <LuTrash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <FieldError>{error?.message}</FieldError>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          <LuSave className="size-4" aria-hidden /> {busy ? "Đang lưu…" : "Lưu lịch"}
        </Button>
        {initial.updatedAt && (
          <Button variant={confirmReset ? "danger" : "ghost"} onClick={reset} onBlur={() => setConfirmReset(false)}>
            <LuRotateCcw className="size-4" aria-hidden /> {confirmReset ? "Bấm lần nữa để xoá chỉnh sửa & quay về lịch gốc" : "Quay về lịch minh hoạ gốc"}
          </Button>
        )}
        <Button variant="outline" onClick={runReminders}>
          <LuSend className="size-4" aria-hidden /> Gửi email nhắc hạn đến hạn hôm nay
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Email nhắc chạy tự động mỗi ngày khi cấu hình bộ lập lịch gọi <code>/api/cron/reminders</code> (xem README). Nút trên dùng để chạy thử.
      </p>
    </form>
  );
}
