"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LuCoffee,
  LuHandHeart,
  LuHeart,
  LuLock,
  LuSparkles,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/cn";

const DONATE_DELAY_MS = 60 * 1000; // 1 phút (60.000ms)

export function DonatePromptModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  useEffect(() => {
    // Không hiện nếu đang ở trang ủng hộ hoặc trang kết quả / quản trị
    if (
      pathname.startsWith("/ung-ho") ||
      pathname.startsWith("/quan-tri") ||
      pathname.startsWith("/api")
    ) {
      return;
    }

    // Kiểm tra xem đã từng tắt trong phiên này chưa
    const dismissed = sessionStorage.getItem("trovio_donate_prompt_dismissed");
    if (dismissed === "true") {
      return;
    }

    // Lấy thời điểm bắt đầu phiên hoặc khởi tạo
    let sessionStartStr = sessionStorage.getItem("trovio_session_start_time");
    let sessionStart = sessionStartStr ? parseInt(sessionStartStr, 10) : 0;
    const now = Date.now();

    if (!sessionStart || isNaN(sessionStart)) {
      sessionStart = now;
      sessionStorage.setItem("trovio_session_start_time", String(now));
    }

    const elapsed = now - sessionStart;
    const remaining = Math.max(500, DONATE_DELAY_MS - elapsed);

    const timer = setTimeout(() => {
      // Kiểm tra lại đường dẫn trước khi mở
      const currentPath = window.location.pathname;
      if (
        !currentPath.startsWith("/ung-ho") &&
        !currentPath.startsWith("/quan-tri") &&
        sessionStorage.getItem("trovio_donate_prompt_dismissed") !== "true"
      ) {
        setVisible(true);
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("trovio_donate_prompt_dismissed", "true");
  };

  const handleQuickDonate = async (amount: number) => {
    setLoadingAmount(amount);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorName: "Nhà hảo tâm giấu tên",
          message: "Ủng hộ nhanh 1 ly cà phê tiếp sức sĩ tử qua VNPay",
          bankCode: "VNPAYQR",
        }),
      });
      const data = await res.json();
      if (data.ok && data.data?.paymentUrl) {
        sessionStorage.setItem("trovio_donate_prompt_dismissed", "true");
        window.location.href = data.data.paymentUrl;
      } else {
        router.push("/ung-ho");
      }
    } catch {
      router.push("/ung-ho");
    } finally {
      setLoadingAmount(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-prompt-title"
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
    >
      {/* Lớp nền mờ */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Hộp thông báo ủng hộ */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/20 transition-all animate-in zoom-in-95 sm:p-7">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-5" />
        </button>

        {/* Biểu tượng & Tiêu đề */}
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-sky-600 text-white shadow-md shadow-primary-500/25">
            <LuCoffee className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700">
              <LuSparkles className="size-3.5" />
              <span>Dự án giáo dục phi lợi nhuận</span>
            </div>
            <h3 id="donate-prompt-title" className="text-lg font-black text-slate-900">
              Tiếp sức 1 ly cà phê cho TriOVO ☕
            </h3>
          </div>
        </div>

        <p className="mt-3.5 text-sm leading-relaxed text-slate-600">
          Bạn đã đồng hành tra cứu cùng TriOVO được hơn 1 phút! TriOVO là nền tảng phi lợi nhuận giúp hơn 1 triệu sĩ tử tra cứu điểm chuẩn và định hướng đại học <b>100% miễn phí</b>.
        </p>

        <p className="mt-2 text-xs text-slate-500">
          Nếu bạn thấy nền tảng hữu ích, hãy ủng hộ chúng mình một ly cà phê qua cổng VNPay để duy trì máy chủ nhé!
        </p>

        {/* Các nút ủng hộ nhanh qua VNPay */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "20.000 ₫", amount: 20000 },
            { label: "50.000 ₫", amount: 50000, popular: true },
            { label: "100.000 ₫", amount: 100000 },
          ].map((item) => (
            <button
              key={item.amount}
              type="button"
              disabled={loadingAmount !== null}
              onClick={() => handleQuickDonate(item.amount)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                item.popular
                  ? "border-primary-600 bg-primary-50/70 font-extrabold text-primary-800 shadow-xs hover:bg-primary-100"
                  : "border-slate-200 bg-white font-bold text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                loadingAmount === item.amount && "opacity-75"
              )}
            >
              {item.popular && (
                <span className="absolute -top-2 rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  Gợi ý
                </span>
              )}
              <span className="text-sm">
                {loadingAmount === item.amount ? "..." : item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Nút chuyển sang trang ủng hộ chi tiết & Nút để sau */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              router.push("/ung-ho");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white shadow-md shadow-primary-600/25 transition hover:bg-primary-700"
          >
            <LuHandHeart className="size-4" />
            Ủng hộ số tiền khác qua VNPay
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-1.5 text-center text-xs font-semibold text-slate-400 transition hover:text-slate-600"
          >
            Để sau, tôi muốn tiếp tục tra cứu
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <LuLock className="size-3" />
          <span>Thanh toán VNPay QR bảo mật & an toàn</span>
        </div>
      </div>
    </div>
  );
}
