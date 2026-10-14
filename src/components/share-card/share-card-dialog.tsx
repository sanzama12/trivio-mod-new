"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuCopy, LuDownload, LuShare2, LuShieldCheck, LuX, LuUsers } from "react-icons/lu";
import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { canvasToBlob, drawRiasecCard, drawWishlistCard, ensureFonts, type WishlistCardData } from "@/lib/share-card";
import { cn } from "@/lib/cn";
import { useModal } from "@/components/ui/use-modal";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export type ShareCardKind = "riasec" | "wishlist";

export interface ShareCardInput {
  riasec?: { code: RiasecType[]; percents: Record<RiasecType, number>; topMajors: string[] } | null;
  wishlist?: { items: WishlistCardData["items"]; method: string | null; score: string | null } | null;
  /** Tên hiển thị (chỉ phần tên gọi). */
  name: string | null;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
      {label}
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/** Hộp thoại tạo thẻ chia sẻ (ảnh PNG 1080×1350) cho kết quả RIASEC hoặc danh sách nguyện vọng. */
export function ShareCardDialog({ initial, data, onClose }: { initial: ShareCardKind; data: ShareCardInput; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toast = useToast();
  const [kind, setKind] = useState<ShareCardKind>(initial);
  const [showName, setShowName] = useState(!!data.name);
  const [showMajors, setShowMajors] = useState(true);
  const [showFit, setShowFit] = useState(true);
  const [showScore, setShowScore] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  useModal(ref, true, onClose);

  const origin = typeof window !== "undefined" ? window.location.host : "trovio.vn";
  const link = kind === "riasec" ? `${typeof window !== "undefined" ? window.location.origin : ""}/trac-nghiem` : `${typeof window !== "undefined" ? window.location.origin : ""}/`;

  const draw = useCallback(async () => {
    await ensureFonts();
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const name = showName ? data.name : null;
    if (kind === "riasec" && data.riasec) {
      const r = data.riasec;
      drawRiasecCard(canvas, {
        name,
        code: r.code,
        labels: r.code.map((t) => RIASEC_INFO[t].label),
        percents: RIASEC_ORDER.map((t) => ({ type: t, label: RIASEC_INFO[t].label, value: Math.round(r.percents[t]) })),
        topMajors: showMajors && r.topMajors.length ? r.topMajors.slice(0, 3) : null,
        url: `${origin}/trac-nghiem`,
      });
    } else if (kind === "wishlist" && data.wishlist) {
      const w = data.wishlist;
      drawWishlistCard(canvas, {
        name,
        season: `Mùa tuyển sinh ${new Date().getFullYear()}`,
        method: showScore && w.score ? `${w.method ?? ""} ${w.score}`.trim() : w.method,
        items: w.items.map((it) => ({ ...it, fit: showFit ? it.fit : null })),
        url: origin,
      });
    }
    setPreview(canvas.toDataURL("image/png"));
  }, [kind, data, showName, showMajors, showFit, showScore, origin]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const fileName = kind === "riasec" ? "trovio-ma-so-thich.png" : "trovio-nguyen-vong.png";

  const download = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    if (!blob) return toast("Không tạo được ảnh, vui lòng thử lại", "warning");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Đã tải ảnh thẻ chia sẻ", "success");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Đã sao chép link", "success");
    } catch {
      toast("Trình duyệt không cho phép sao chép", "warning");
    }
  };

  /** C3 — rủ nhóm lớp: link /zalo mở thẻ "Mã sở thích của …" + nút "Làm trắc nghiệm giống …". */
  const shareToClass = async () => {
    if (!data.riasec) return;
    const url = new URL("/zalo", window.location.origin);
    url.searchParams.set("ma", data.riasec.code.join(""));
    if (showName && data.name) url.searchParams.set("ten", data.name);
    const text = `Tớ ra mã sở thích ${data.riasec.code.join(" · ")} nè, rủ cả lớp làm trắc nghiệm chọn ngành đi!`;
    try {
      if (navigator.share) await navigator.share({ title: "Trovio", text, url: url.toString() });
      else {
        await navigator.clipboard.writeText(`${text} ${url.toString()}`);
        toast("Đã sao chép tin nhắn — dán vào nhóm lớp trên Zalo nhé", "success");
      }
    } catch {
      /* người dùng huỷ */
    }
  };

  const share = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
    const payload = { title: "Trovio", text: kind === "riasec" ? "Mã sở thích nghề nghiệp của mình trên Trovio" : "Nguyện vọng dự kiến của mình trên Trovio", url: link };
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ ...payload, files: [file] });
      else if (navigator.share) await navigator.share(payload);
      else {
        await copyLink();
        toast("Trình duyệt chưa hỗ trợ chia sẻ trực tiếp — hãy tải ảnh rồi gửi qua Zalo/Messenger", "info");
      }
    } catch {
      /* người dùng huỷ */
    }
  };

  const tabs: { k: ShareCardKind; label: string; ok: boolean }[] = [
    { k: "riasec", label: "Kết quả sở thích", ok: !!data.riasec },
    { k: "wishlist", label: "Danh sách nguyện vọng", ok: !!data.wishlist?.items.length },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose} data-print-hide>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-card-title"
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[92dvh] w-full max-w-4xl gap-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 md:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="share-card-title" className="text-xl font-bold text-slate-900">
              Tạo thẻ chia sẻ
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <LuX className="size-5" aria-hidden />
            </button>
          </div>
          <p className="text-sm text-slate-600">Ảnh dọc 1080×1350 để đăng Zalo, Facebook, Instagram — hoặc gửi bạn bè, thầy cô.</p>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Loại thẻ">
            {tabs.map((t) => (
              <button
                key={t.k}
                type="button"
                role="tab"
                aria-selected={kind === t.k}
                disabled={!t.ok}
                onClick={() => setKind(t.k)}
                className={cn("rounded-md px-3 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40", kind === t.k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-[13px] font-semibold text-slate-700">Hiển thị trên thẻ</legend>
            {data.name && <Toggle label="Tên gọi (chỉ tên, không họ)" checked={showName} onChange={setShowName} />}
            {kind === "riasec" ? (
              <Toggle label="Ngành hợp nhất" checked={showMajors} onChange={setShowMajors} />
            ) : (
              <>
                <Toggle label="Mức An toàn / Vừa sức / Thử sức" checked={showFit} onChange={setShowFit} />
                {data.wishlist?.score && <Toggle label="Điểm của mình" checked={showScore} onChange={setShowScore} />}
              </>
            )}
          </fieldset>
          <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-700" aria-hidden />
            Thẻ được tạo ngay trên máy bạn. Không chứa email, số điện thoại hay đường link tới tài khoản của bạn.
          </p>
          <Button full onClick={download} disabled={!preview}>
            <LuDownload className="size-4" aria-hidden /> Tải ảnh PNG
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={share} disabled={!preview}>
              <LuShare2 className="size-4" aria-hidden /> Chia sẻ (Zalo, Messenger…)
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <LuCopy className="size-4" aria-hidden /> Sao chép link
            </Button>
          </div>
          {kind === "riasec" && data.riasec && (
            <Button variant="ghost" size="sm" full onClick={shareToClass}>
              <LuUsers className="size-4" aria-hidden /> Rủ nhóm lớp làm cùng (Zalo)
            </Button>
          )}
        </div>
        <div className="flex items-start justify-center rounded-xl bg-slate-100 p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Xem trước thẻ chia sẻ" className="w-full max-w-[320px] rounded-xl shadow-elevated" />
          ) : (
            <div className="aspect-[4/5] w-full max-w-[320px] animate-pulse rounded-xl bg-slate-200" />
          )}
        </div>
      </div>
    </div>
  );
}
