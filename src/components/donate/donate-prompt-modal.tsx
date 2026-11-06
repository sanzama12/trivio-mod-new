"use client";

/**
 * Hộp thoại thông báo ủng hộ TriOVO chuẩn Boutique Design & UX Engagement:
 * - KHÔNG hiện tĩnh trên trang chủ làm phiền người dùng.
 * - Tự động xuất hiện thông báo sau 30 giây kể từ khi người dùng tương tác với các tính năng.
 * - Giao diện cao cấp đồng bộ với thiết kế: icon cà phê gradient, mức tiền gợi ý, cổng VNPay bảo mật.
 */
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LuCoffee,
  LuSparkles,
  LuX,
  LuArrowRight,
  LuShieldCheck,
  LuLoaderCircle,
  LuHeart,
} from "react-icons/lu";
import { cn } from "@/lib/cn";

// Thời gian đếm ngược: đúng 30 giây kể từ khi người dùng bắt đầu tương tác chức năng
const ENGAGEMENT_TRIGGER_MS = 30 * 1000;
const SNOOZE_DURATION_MS = 10 * 60 * 1000; // 10 phút sau mới nhắc lại nếu người dùng ấn "Để sau"

const PRESET_AMOUNTS = [
  { value: 20000, label: "20.000 ₫" },
  { value: 50000, label: "50.000 ₫", popular: true },
  { value: 100000, label: "100.000 ₫" },
];

export function DonatePromptModal() {
  const pathname = usePathname();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isCustom, setIsCustom] = useState(false);
  const [customStr, setCustomStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dọn dẹp cờ cũ nếu có để người dùng không bị kẹt vĩnh viễn
    if (sessionStorage.getItem("trovio_donate_dismissed") === "true") {
      sessionStorage.removeItem("trovio_donate_dismissed");
    }

    // Kiểm tra nhanh qua URL ?donate=1 hoặc hash #donate
    const search = window.location.search;
    if (search.includes("donate") || search.includes("ungho") || window.location.hash === "#donate") {
      setVisible(true);
      return;
    }

    // Lắng nghe sự kiện mở thủ công
    const handleCustomOpen = () => setVisible(true);
    window.addEventListener("trovio:open-donate", handleCustomOpen);

    // Bắt đầu ghi nhận thời điểm người dùng bắt đầu sử dụng chức năng
    const markEngagement = () => {
      const snooze = sessionStorage.getItem("trovio_donate_snooze");
      if (snooze && Date.now() < Number(snooze)) return;

      if (!sessionStorage.getItem("trovio_feature_engaged_time")) {
        sessionStorage.setItem("trovio_feature_engaged_time", String(Date.now()));
      }
    };

    // Lắng nghe mọi tương tác tự nhiên: click nút/link, gõ tìm kiếm, cuộn trang, đổi URL
    window.addEventListener("pointerdown", markEngagement, { passive: true });
    window.addEventListener("keydown", markEngagement, { passive: true });
    window.addEventListener("input", markEngagement, { passive: true });

    // Đánh dấu ngay nếu người dùng truy cập trực tiếp các trang chức năng
    const currentPath = window.location.pathname;
    if (
      currentPath.startsWith("/so-sanh") ||
      currentPath.startsWith("/diem-cua-toi") ||
      currentPath.startsWith("/chuong-trinh") ||
      currentPath.startsWith("/nganh") ||
      currentPath.startsWith("/truong")
    ) {
      markEngagement();
    }

    // Bộ đếm chu kỳ 1s kiểm tra xem đã đủ 30 giây kể từ khi dùng tính năng chưa
    const interval = setInterval(() => {
      // 1. Không hiện ở các trang loại trừ
      const path = window.location.pathname;
      if (
        path.startsWith("/ung-ho") ||
        path.startsWith("/quan-tri") ||
        path.startsWith("/api")
      ) {
        return;
      }

      // 2. Kiểm tra hoãn thông báo (snooze)
      const snooze = sessionStorage.getItem("trovio_donate_snooze");
      if (snooze && Date.now() < Number(snooze)) return;

      // 3. Kiểm tra thời gian tương tác
      const engagedStr = sessionStorage.getItem("trovio_feature_engaged_time");
      if (!engagedStr) return;

      const elapsed = Date.now() - Number(engagedStr);
      if (elapsed >= ENGAGEMENT_TRIGGER_MS) {
        setVisible(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("trovio:open-donate", handleCustomOpen);
      window.removeEventListener("pointerdown", markEngagement);
      window.removeEventListener("keydown", markEngagement);
      window.removeEventListener("input", markEngagement);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    // Tạm hoãn nhắc lại trong 10 phút để khách tiếp tục tra cứu thoải mái
    sessionStorage.setItem(
      "trovio_donate_snooze",
      String(Date.now() + SNOOZE_DURATION_MS)
    );
  };

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
          donorName: "Sĩ tử TriOVO",
          message: "Tiếp sức ly cà phê duy trì máy chủ",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Không thể tạo liên kết thanh toán.");
      }

      if (data.data?.paymentUrl) {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Khung thông báo chuẩn Boutique UI */}
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-slate-900/10 transition-all animate-in zoom-in-95 duration-200">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-5" />
        </button>

        {/* Header: Icon cà phê nổi bật & Tiêu đề dự án */}
        <div className="flex items-start gap-4">
          <div className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-md shadow-sky-500/20">
            <LuCoffee className="size-6" />
          </div>
          <div className="pr-6">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <LuSparkles className="size-3 text-emerald-600" />
              <span>Dự án giáo dục phi lợi nhuận</span>
            </div>
            <h3
              id="donate-prompt-title"
              className="mt-0.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl flex items-center gap-1.5"
            >
              Tiếp sức 1 ly cà phê cho TriOVO ☕
            </h3>
          </div>
        </div>

        {/* Nội dung thông điệp chân thành */}
        <p className="mt-4 text-[13.5px] leading-relaxed text-slate-600">
          Bạn đã đồng hành trải nghiệm cùng TriOVO! TriOVO là nền tảng phi lợi nhuận giúp hơn 1 triệu sĩ tử tra cứu điểm chuẩn và định hướng đại học <b>100% miễn phí</b>.
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
          Nếu bạn thấy nền tảng hữu ích, hãy ủng hộ chúng mình một ly cà phê qua cổng VNPay để duy trì máy chủ nhé!
        </p>

        {/* 3 mức tiền nhanh */}
        <div className="mt-5">
          <div className="grid grid-cols-3 gap-3">
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
                    "group relative flex flex-col items-center justify-center rounded-2xl border py-3 px-2 text-center transition-all cursor-pointer",
                    isSelected
                      ? "border-emerald-700 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-700/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {item.popular && (
                    <span className="absolute -top-2.5 rounded-full border border-amber-300 bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-xs">
                      Gợi ý
                    </span>
                  )}
                  <span className="text-sm font-extrabold tracking-tight sm:text-base">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Nút nhập số tiền tùy chọn */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsCustom(!isCustom);
                setErrorMsg(null);
              }}
              className={cn(
                "font-semibold transition hover:underline cursor-pointer",
                isCustom
                  ? "text-emerald-800"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isCustom ? "← Quay lại mức mặc định" : "Tự nhập số tiền khác..."}
            </button>
            <span className="text-[11px] text-slate-400">Tối thiểu 10.000 ₫</span>
          </div>

          {/* Input nhập tiền tùy chọn */}
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
                  placeholder="Nhập số tiền ủng hộ (VD: 200.000)"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₫
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Nút CTA chính: Xanh sẫm chuẩn thiết kế VNPay */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleProceedDonate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0d5045] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-[#0d5045]/20 transition-all hover:bg-[#0a4037] active:scale-[0.99] disabled:opacity-75 cursor-pointer"
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

        {/* Tùy chọn xem chi tiết hoặc để sau */}
        <div className="mt-3.5 flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="py-1 text-xs text-slate-500 font-medium transition hover:text-slate-800 cursor-pointer"
          >
            Để sau, tôi muốn tiếp tục tra cứu
          </button>
        </div>

        {/* Footer bảo mật VNPay */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <LuShieldCheck className="size-3.5 text-emerald-600" />
          <span>Thanh toán VNPay QR bảo mật & an toàn</span>
        </div>
      </div>
    </div>
  );
}
