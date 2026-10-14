"use client";

/**
 * Ngăn kéo "Báo cáo lỗi dữ liệu" (UI Patterns · Section 4): mở ngay tại trang đang xem, không phải rời trang.
 * Gửi tới /api/reports như biểu mẫu ở trang Trợ giúp; quản trị viên xử lý ở /quan-tri/bao-loi.
 */
import { useRef, useState, type ReactNode } from "react";
import { LuCircleAlert, LuCircleCheck, LuX } from "react-icons/lu";
import { useModal } from "@/components/ui/use-modal";
import { cn } from "@/lib/cn";

const TOPICS = [
  ["diem-chuan", "Sai thông tin điểm chuẩn"],
  ["hoc-phi", "Sai học phí"],
  ["chi-tieu", "Sai chỉ tiêu"],
  ["to-hop", "Sai tổ hợp / phương thức xét tuyển"],
  ["thong-tin-truong", "Sai thông tin trường / ngành"],
  ["khac", "Khác"],
] as const;
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none";

export function ReportButton({ program, className, children }: { program?: { id: string; label: string } | null; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children}
      </button>
      {open && <ReportDrawer program={program ?? null} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportDrawer({ program, onClose }: { program: { id: string; label: string } | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, true, onClose);
  const [topic, setTopic] = useState("diem-chuan");
  const [detail, setDetail] = useState("");
  const [url, setUrl] = useState(() => (typeof window !== "undefined" ? window.location.href.split("#")[0] : ""));
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string } | null>(null);

  const submit = async () => {
    if (detail.trim().length < 10) return setErr({ field: "detail", message: "Vui lòng mô tả thông tin cần sửa (ít nhất 10 ký tự)." });
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program?.id ?? null, page: [program?.label, url.slice(0, 120)].filter(Boolean).join(" · ").slice(0, 200), topic, detail, email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setErr({ field: d.field, message: d.message ?? "Không gửi được, vui lòng thử lại." });
      setSent(true);
    } catch {
      setErr({ message: "Không kết nối được. Kiểm tra mạng và thử lại." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" tabIndex={-1} aria-label="Đóng" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="rd-title" className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l-2 border-primary-600 bg-white shadow-elevated">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
          <LuCircleAlert className="size-5 text-danger-600" aria-hidden />
          <h2 id="rd-title" className="flex-1 text-lg font-bold text-slate-900">
            Báo cáo lỗi dữ liệu
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
            <LuX className="size-5" aria-hidden />
          </button>
        </div>
        {sent ? (
          <div className="flex-1 px-6 py-8">
            <div className="flex items-start gap-3 rounded-xl bg-success-50 p-5 text-success-700" role="status">
              <LuCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">Đã gửi báo lỗi, cảm ơn bạn!</p>
                <p className="mt-1 text-sm text-slate-700">Đội biên tập sẽ kiểm tra và báo kết quả trong mục Thông báo (nếu đã đăng nhập) hoặc qua email bạn để lại.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="mt-5 h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Đóng
            </button>
          </div>
        ) : (
          <form className="flex flex-1 flex-col" onSubmit={(e) => (e.preventDefault(), submit())} noValidate>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {program && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">Chương trình: <b>{program.label}</b></p>}
              <label className="block text-sm font-semibold text-slate-800">
                Loại lỗi <span className="text-danger-600">*</span>
                <select data-autofocus className={cn(field, "mt-1.5 h-11")} value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {TOPICS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Mô tả chi tiết <span className="text-danger-600">*</span>
                <textarea rows={5} maxLength={2000} className={cn(field, "mt-1.5 py-2.5 font-normal", err?.field === "detail" && "!border-danger-500")} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Số liệu nào sai, số đúng là bao nhiêu, theo nguồn nào (link đề án/thông báo của trường)…" aria-invalid={err?.field === "detail" || undefined} />
                {err?.field === "detail" && <span className="mt-1 block text-xs font-normal text-danger-700">{err.message}</span>}
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Đường dẫn URL chứa lỗi
                <input className={cn(field, "mt-1.5 h-11 font-normal")} value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Email nhận phản hồi <span className="font-normal text-slate-500">(không bắt buộc)</span>
                <input type="email" className={cn(field, "mt-1.5 h-11 font-normal", err?.field === "email" && "!border-danger-500")} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="Để trống nếu đã đăng nhập" />
                {err?.field === "email" && <span className="mt-1 block text-xs font-normal text-danger-700">{err.message}</span>}
              </label>
              {err && !err.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
              <p className="text-xs text-slate-500">Email chỉ dùng để báo kết quả xử lý, không hiển thị công khai.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Huỷ bỏ
              </button>
              <button type="submit" disabled={busy} className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                {busy ? "Đang gửi…" : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
