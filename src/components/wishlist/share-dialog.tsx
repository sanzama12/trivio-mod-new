"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuCopy, LuLink, LuUsers, LuX } from "react-icons/lu";
import { formatDateVi } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/track";
import { useModal } from "@/components/ui/use-modal";

interface ActiveShare {
  id: string;
  url: string;
  expiresAt: string;
  showNotes: boolean;
  showScore: boolean;
}

/** Hộp thoại tạo / thu hồi link chỉ xem cho phụ huynh. */
export function ShareDialog({ onClose, plainText }: { onClose: () => void; plainText: string }) {
  const toast = useToast();
  const [share, setShare] = useState<ActiveShare | null | undefined>(undefined);
  const [days, setDays] = useState<7 | 30>(7);
  const [showNotes, setShowNotes] = useState(false);
  const [showScore, setShowScore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/account/share")
      .then((r) => r.json())
      .then((d) => setShare(d.share ?? null))
      .catch(() => setShare(null));
  }, []);

  useModal(ref, true, onClose);

  const create = async () => {
    setBusy(true);
    const res = await fetch("/api/account/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, showNotes, showScore }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.share) return toast("Không tạo được link, vui lòng thử lại", "warning");
    setShare(d.share);
    track("share_created");
    toast("Đã tạo link chia sẻ", "success");
  };

  const revoke = async () => {
    setBusy(true);
    await fetch("/api/account/share", { method: "DELETE" });
    setBusy(false);
    setShare(null);
    toast("Đã thu hồi link — người giữ link sẽ không xem được nữa", "info");
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast(msg, "success");
    } catch {
      toast("Trình duyệt không cho phép sao chép", "warning");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose} data-print-hide>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-elevated sm:rounded-2xl"
      >
        <button type="button" onClick={onClose} className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng">
          <LuX className="size-5" />
        </button>
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <LuUsers className="size-6" aria-hidden />
        </span>
        <h2 id="share-title" className="mt-4 text-xl font-bold text-slate-900">
          Chia sẻ với phụ huynh
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Người nhận xem được danh sách nguyện vọng (không cần tài khoản, không sửa được) và có thể gửi góp ý cho bạn.
        </p>

        {share === undefined ? (
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-100" />
        ) : share ? (
          <div className="mt-5 space-y-3">
            <label htmlFor="share-url" className="text-sm font-semibold text-slate-700">
              Link đang hoạt động
            </label>
            <div className="flex gap-2">
              <input id="share-url" readOnly value={share.url} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 text-[13px]" />
              <Button onClick={() => copy(share.url, "Đã sao chép link")}>
                {copied ? <LuCheck className="size-4" aria-hidden /> : <LuCopy className="size-4" aria-hidden />} Sao chép
              </Button>
            </div>
            <p className="text-[13px] text-slate-500">
              Hết hạn ngày {formatDateVi(share.expiresAt)} · {share.showScore ? "có hiện điểm" : "ẩn điểm"} · {share.showNotes ? "có hiện ghi chú" : "ẩn ghi chú"}
            </p>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button variant="danger" size="sm" onClick={revoke} disabled={busy}>
                Thu hồi link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShare(null)} disabled={busy}>
                Tạo link mới (đổi tuỳ chọn)
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Link có hiệu lực trong</legend>
              <div className="flex gap-2">
                {([7, 30] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days === d}
                    onClick={() => setDays(d)}
                    className={
                      days === d
                        ? "rounded-full border border-primary-600 bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white"
                        : "rounded-full border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-primary-300"
                    }
                  >
                    {d} ngày
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <Checkbox label="Hiện điểm của tôi và mức An toàn / Vừa sức / Thử sức" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} />
              <Checkbox label="Hiện ghi chú riêng của từng nguyện vọng" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} />
            </div>
            <p className="text-xs text-slate-500">Link không hiện email của bạn. Tạo link mới sẽ tự thu hồi link cũ.</p>
            <Button full onClick={create} disabled={busy}>
              <LuLink className="size-4" aria-hidden /> {busy ? "Đang tạo…" : "Tạo link chia sẻ"}
            </Button>
          </div>
        )}

        <button type="button" onClick={() => copy(plainText, "Đã sao chép danh sách dạng văn bản")} className="mt-4 text-[13px] font-semibold text-primary-600 hover:underline">
          Hoặc sao chép danh sách dạng văn bản
        </button>
      </div>
    </div>
  );
}
