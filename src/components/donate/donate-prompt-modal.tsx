"use client";

/**
 * Hộp thoại thông báo ủng hộ Trovio — Chuẩn Boutique Frontend Design
 * - Thiết kế tối giản, thanh lịch, tỷ lệ chuẩn mực (Golden Ratio).
 * - Kết hợp hình ảnh điện ảnh "Tiếp sức mùa thi" với khung ảnh bo góc tinh tế.
 * - Tránh hoàn toàn lỗi giao diện cồng kềnh hay "AI slop" lộn xộn.
 * - Tự động hiển thị khi người dùng tra cứu/sử dụng tính năng.
 */
import { buttonClass } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LuCoffee,
  LuSparkles,
  LuX,
  LuArrowRight,
  LuShieldCheck,
  LuLoaderCircle,
  LuHeart,
} from "react-icons/lu";
import { readConsent } from "@/lib/consent";
import { useModal } from "@/components/ui/use-modal";
import { cn } from "@/lib/cn";

const PRESET_AMOUNTS = [
  { value: 20000, label: "20.000 ₫", sub: "Chung tay duy trì" },
  { value: 50000, label: "50.000 ₫", sub: "Tiếp sức Trovio", popular: true },
  { value: 100000, label: "100.000 ₫", sub: "Hỗ trợ máy chủ" },
];

export function DonatePromptModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isCustom, setIsCustom] = useState(false);
  const [customStr, setCustomStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDismiss = () => {
    try { localStorage.setItem("trovio:donate-prompt-at", String(Date.now())); } catch {}
    setVisible(false);
  };
  useModal(dialogRef, visible, handleDismiss);

  useEffect(() => {
    const open = () => setVisible(true);
    const checkUrl = () => {
      if (new URLSearchParams(window.location.search).get("donate") === "1" || window.location.hash === "#donate") open();
    };
    window.addEventListener("trovio:open-donate", open);
    window.addEventListener("hashchange", checkUrl);
    checkUrl();
    return () => {
      window.removeEventListener("trovio:open-donate", open);
      window.removeEventListener("hashchange", checkUrl);
    };
  }, [pathname, params]);

  useEffect(() => {
    // Fail closed if either storage is unavailable; count each route transition once.
    let eligibleVisit = false;
    try {
      const sessionKey = "trovio:donate-session";
      let session = sessionStorage.getItem(sessionKey);
      if (!session) {
        session = localStorage.getItem("trovio:visited") ? "returning" : "first";
        localStorage.setItem("trovio:visited", "1");
        sessionStorage.setItem(sessionKey, session);
      }
      eligibleVisit = session === "returning";
      const lastPath = sessionStorage.getItem("trovio:donate-last-path");
      if (lastPath !== pathname) {
        const count = Number(sessionStorage.getItem("trovio:donate-pages") || 0);
        sessionStorage.setItem("trovio:donate-pages", String(count + 1));
        sessionStorage.setItem("trovio:donate-last-path", pathname);
      }
    } catch { return; }
    const maybeOpen = () => {
      try {
        const blocked = ["/ung-ho", "/quan-tri"].some(p => pathname.startsWith(p)) ||
          ["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/xac-thuc-email", "/trac-nghiem/lam-bai", "/diem-cua-toi"].includes(pathname);
        const last = Number(localStorage.getItem("trovio:donate-prompt-at") || 0);
        const tour = sessionStorage.getItem("trovio:tour-session");
        if (!eligibleVisit || blocked || readConsent() === null || Number(sessionStorage.getItem("trovio:donate-pages")) < 3 ||
            !localStorage.getItem("trovio:tour-done") || tour === "running" || Date.now() - last < 14 * 86400000 ||
            sessionStorage.getItem("trovio:donate-shown") === "1") return;
        sessionStorage.setItem("trovio:donate-shown", "1");
        setVisible(true);
      } catch { /* Không tự mở khi bộ nhớ bị chặn. */ }
    };
    maybeOpen();
    window.addEventListener("trovio:consent-changed", maybeOpen);
    window.addEventListener("trovio:tour-changed", maybeOpen);
    return () => {
      window.removeEventListener("trovio:consent-changed", maybeOpen);
      window.removeEventListener("trovio:tour-changed", maybeOpen);
    };
  }, [pathname]);

  const effectiveAmount = isCustom
    ? Number(customStr.replace(/\D/g, ""))
    : selectedAmount;

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  };

  const handleProceedDonate = async () => {
    setErrorMsg(null);
    const amountToDonate = effectiveAmount;

    if (!amountToDonate || amountToDonate < 10000) {
      setErrorMsg("Số tiền ủng hộ tối thiểu là 10.000 ₫.");
      return;
    }
    if (amountToDonate > 100000000) {
      setErrorMsg("Số tiền tối đa cho mỗi lượt là 100.000.000 ₫.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToDonate,
          donorName: "Sĩ tử Trovio",
          message: "Tiếp sức ly cà phê duy trì máy chủ",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Không thể tạo liên kết thanh toán.");
      }

      if (data.data?.paymentUrl) {
        try { localStorage.setItem("trovio:donate-prompt-at", String(Date.now())); } catch {}
        window.location.href = data.data.paymentUrl;
      } else {
        throw new Error("Không nhận được liên kết thanh toán từ máy chủ.");
      }
    } catch (err: any) {
      console.error("[DonatePromptModal] Lỗi khởi tạo thanh toán:", err);
      setErrorMsg(
        err.message || "Hệ thống VNPay đang bảo trì, vui lòng thử lại sau ít phút."
      );
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Nền mờ điện ảnh sâu lắng */}
      <div
        className="fixed inset-0 bg-primary-900/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Thẻ Modal Boutique cao cấp */}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="donate-prompt-title" className="relative max-h-[90vh] overflow-y-auto w-full max-w-[420px] rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-950/25 transition-all animate-in zoom-in-95 duration-200">
        {/* Nút đóng tinh tế */}
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center absolute top-4 right-4 z-20 size-10 rounded-full bg-slate-900/40 text-white backdrop-blur-md transition hover:bg-slate-900/70 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-4" />
        </button>

        {/* Khung ảnh Hero tỷ lệ vàng có bo tròn nội bộ */}
        <div className="relative -mx-6 -mt-6 mb-5 h-36 w-[calc(100%+3rem)] overflow-hidden bg-primary-900">
          <Image
            src="/images/donate-hero.jpg"
            alt="Tiếp sức mùa thi - Trovio"
            fill
            className="object-cover opacity-90 transition duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900 via-primary-900/30 to-black/20" />

          {/* Huy hiệu sứ mệnh trên ảnh */}
          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-slate-950 shadow-sm">
                <LuSparkles className="size-2.5" />
                Tiếp sức mùa thi 2026
              </span>
              <p className="mt-1 text-sm font-semibold text-white leading-tight drop-shadow-sm">
                Chung tay duy trì Trovio miễn phí
              </p>
            </div>
          </div>
        </div>

        {/* Tiêu đề & Thông điệp chân thành */}
        <div>
          <h3
            id="donate-prompt-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Tiếp sức Trovio ☕
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-prose">
            Sự ủng hộ giúp duy trì máy chủ, cập nhật dữ liệu đề án và phát triển Trovio miễn phí cho học sinh.
          </p>
        </div>

        {/* Bảng chọn số tiền: 3 ô cân đối tuyệt đối */}
        <div className="mt-4.5">
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((item) => {
              const isSelected = !isCustom && selectedAmount === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedAmount(item.value);
                    setErrorMsg(null);
                  }}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-2xl border py-2.5 px-2 text-center transition-all cursor-pointer",
                    isSelected
                      ? "border-primary-700 bg-primary-700/5 text-primary-700 ring-2 ring-primary-700/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                  )}
                >
                  {item.popular && (
                    <span className="absolute -top-2 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-slate-950 shadow-xs">
                      Gợi ý
                    </span>
                  )}
                  <span className="text-sm font-semibold tracking-tight">
                    {item.label}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-600 font-medium">
                    {item.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tùy chọn nhập số khác */}
          <div className="mt-2 flex items-center justify-between text-xs px-0.5">
            <button
              type="button"
              onClick={() => {
                setIsCustom(!isCustom);
                setErrorMsg(null);
              }}
              className={cn(
                "font-bold transition hover:underline cursor-pointer",
                isCustom
                  ? "text-primary-700"
                  : "text-slate-600 hover:text-slate-800"
              )}
            >
              {isCustom ? "← Mức gợi ý có sẵn" : "Nhập số tiền khác..."}
            </button>
            <span className="text-xs text-slate-600">Tối thiểu 10.000 ₫</span>
          </div>

          {/* Ô nhập tùy chọn */}
          {isCustom && (
            <div className="mt-2 animate-in fade-in duration-150">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={customStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setCustomStr(raw ? Number(raw).toLocaleString("vi-VN") : "");
                    setErrorMsg(null);
                  }}
                  placeholder="Nhập số tiền (VD: 200.000)"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-600 focus:border-primary-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-slate-600">
                  ₫
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="mt-2 text-xs font-semibold text-danger-700">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Nút hành động chính (Primary Action) */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleProceedDonate}
          className={buttonClass({ full: true, className: "mt-4.5" })}
        >
          {submitting ? (
            <>
              <LuLoaderCircle className="size-4.5 animate-spin" />
              <span>Đang kết nối cổng VNPay...</span>
            </>
          ) : (
            <>
              <LuHeart className="size-4 fill-white/20 text-white" />
              <span>
                Ủng hộ {effectiveAmount > 0 ? formatVnd(effectiveAmount) : "ngay"} qua VNPay
              </span>
              <LuArrowRight className="size-4" />
            </>
          )}
        </button>

        {/* Tùy chọn để sau */}
        <div className="mt-3 flex items-center justify-between text-xs px-1">

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-600 font-medium transition hover:text-slate-600 cursor-pointer"
          >
            Để sau
          </button>
        </div>

        {/* Footer bảo chứng VNPay */}
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
          <LuShieldCheck className="size-3.5 text-emerald-600" />
          <span>Thanh toán VNPay QR an toàn • Quét mã qua app ngân hàng</span>
        </div>
      </div>
    </div>
  );
}
