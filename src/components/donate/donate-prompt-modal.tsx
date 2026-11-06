"use client";

/**
 * Hộp thoại ủng hộ TriOVO chuẩn Boutique Design & UX Engagement:
 * - KHÔNG hiện nút nổi vướng mắt trên màn hình.
 * - CHỈ kích hoạt sau khi khách thực sự sử dụng các chức năng cốt lõi (tra cứu, so sánh, tính điểm, lưu ngành...)
 *   và trải nghiệm được đúng 30 giây.
 * - Tôn trọng người dùng: khi đã đóng ("Để sau" hoặc nút X), hệ thống ghi nhớ và không làm phiền lại trong phiên.
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
import { useTrovio } from "@/stores/trovio-store";

// Kích hoạt sau đúng 30 giây kể từ khi khách bắt đầu dùng chức năng
const FEATURE_ENGAGEMENT_DELAY_MS = 30 * 1000;

const PRESET_AMOUNTS = [
  { value: 20000, label: "20.000 ₫", desc: "Tách trà đá" },
  { value: 50000, label: "50.000 ₫", desc: "1 ly cà phê", popular: true },
  { value: 100000, label: "100.000 ₫", desc: "Máy chủ 1 ngày" },
];

export function DonatePromptModal() {
  const pathname = usePathname();
  const router = useRouter();
  const { saved, compare, wishlist, profile, hydrated } = useTrovio();

  const [visible, setVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isCustom, setIsCustom] = useState(false);
  const [customStr, setCustomStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Không hiện nếu ở trang ủng hộ, trang quản trị hoặc API
    if (
      pathname.startsWith("/ung-ho") ||
      pathname.startsWith("/quan-tri") ||
      pathname.startsWith("/api")
    ) {
      return;
    }

    // 2. Không hiện nếu người dùng đã từng đóng trong phiên này
    if (sessionStorage.getItem("trovio_donate_dismissed") === "true") {
      return;
    }

    // Hỗ trợ kiểm tra nhanh qua URL ?donate=1
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search.includes("donate") || search.includes("ung-ho")) {
        setVisible(true);
        return;
      }
    }

    // 3. Xác định xem người dùng đã dùng chức năng chưa:
    // - Đang ở các trang công cụ chính: /so-sanh, /diem-cua-toi, /chuong-trinh, /nganh
    // - Đã có dữ liệu lưu, so sánh, nguyện vọng hoặc hồ sơ điểm
    const isToolPage =
      pathname.startsWith("/so-sanh") ||
      pathname.startsWith("/diem-cua-toi") ||
      pathname.startsWith("/chuong-trinh") ||
      pathname.startsWith("/nganh");

    const hasStoredAction =
      hydrated &&
      (saved.length > 0 || compare.length > 0 || wishlist.length > 0 || !!profile);

    const markFeatureUsed = () => {
      if (sessionStorage.getItem("trovio_donate_dismissed") === "true") return;
      if (!sessionStorage.getItem("trovio_feature_engaged_time")) {
        sessionStorage.setItem("trovio_feature_engaged_time", String(Date.now()));
      }
    };

    if (isToolPage || hasStoredAction) {
      markFeatureUsed();
    }

    // Lắng nghe tương tác chức năng thực tế của người dùng (gõ tìm kiếm, bấm so sánh, lưu, lọc...)
    const onAction = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("form")
      ) {
        markFeatureUsed();
      }
    };

    window.addEventListener("input", onAction, { passive: true });
    window.addEventListener("click", onAction, { passive: true });

    // Kiểm tra đếm ngược 30 giây kể từ khi dùng chức năng
    let timer: NodeJS.Timeout | null = null;
    const checkTimer = () => {
      const engagedTimeStr = sessionStorage.getItem("trovio_feature_engaged_time");
      if (!engagedTimeStr) return false;

      const engagedTime = parseInt(engagedTimeStr, 10);
      const elapsed = Date.now() - engagedTime;
      const remaining = Math.max(500, FEATURE_ENGAGEMENT_DELAY_MS - elapsed);

      timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        if (
          !currentPath.startsWith("/ung-ho") &&
          !currentPath.startsWith("/quan-tri") &&
          sessionStorage.getItem("trovio_donate_dismissed") !== "true"
        ) {
          setVisible(true);
        }
      }, remaining);

      return true;
    };

    const hasScheduled = checkTimer();
    let pollInterval: NodeJS.Timeout | null = null;

    if (!hasScheduled) {
      pollInterval = setInterval(() => {
        if (checkTimer() && pollInterval) {
          clearInterval(pollInterval);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener("input", onAction);
      window.removeEventListener("click", onAction);
    };
  }, [pathname, saved, compare, wishlist, profile, hydrated]);

  const handleDismiss = () => {
    setVisible(false);
    // Ghi nhớ đã đóng trong phiên này, không làm phiền lại
    sessionStorage.setItem("trovio_donate_dismissed", "true");
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
          donorName: "Nhà hảo tâm giấu tên",
          message: "Tiếp sức 1 ly cà phê cho TriOVO qua VNPay",
          bankCode: "VNPAYQR",
        }),
      });

      const data = await res.json();
      if (data.ok && data.data?.paymentUrl) {
        sessionStorage.setItem("trovio_donate_dismissed", "true");
        window.location.href = data.data.paymentUrl;
      } else {
        router.push("/ung-ho");
      }
    } catch {
      router.push("/ung-ho");
    } finally {
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
      {/* Backdrop mờ thanh lịch */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Thẻ Modal chính */}
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-900/15 transition-all animate-in zoom-in-95 duration-200 sm:p-7">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-5" />
        </button>

        {/* Header: Icon ấm áp & Tiêu đề thương hiệu */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-700 shadow-xs">
            <LuCoffee className="size-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700">
              <LuSparkles className="size-3.5 text-primary-600" />
              <span>Dự án giáo dục phi lợi nhuận</span>
            </div>
            <h3
              id="donate-prompt-title"
              className="mt-0.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl"
            >
              Tiếp sức 1 ly cà phê cho TriOVO
            </h3>
          </div>
        </div>

        {/* Nội dung thông điệp chân thành, không gượng ép */}
        <p className="mt-3.5 text-sm leading-relaxed text-slate-600">
          TriOVO được phát triển độc lập nhằm giúp hơn 1 triệu sĩ tử tra cứu điểm chuẩn và định hướng ngành học <b>100% miễn phí</b>. Mỗi sự tiếp sức nhỏ đều trực tiếp bù đắp chi phí máy chủ và cập nhật dữ liệu tuyển sinh 2026 chuẩn xác.
        </p>

        {/* Lựa chọn số tiền ủng hộ */}
        <div className="mt-5">
          <div className="grid grid-cols-3 gap-2.5">
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
                    "group relative flex flex-col items-center justify-center rounded-2xl border px-2.5 py-3 text-center transition-all cursor-pointer",
                    isSelected
                      ? "border-primary-600 bg-primary-50/80 text-primary-900 shadow-xs ring-2 ring-primary-600/15"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {item.popular && (
                    <span className="absolute -top-2.5 rounded-full border border-amber-300 bg-amber-200/90 px-2 py-0.5 text-[9px] font-extrabold text-amber-950 shadow-xs">
                      Được chọn nhiều
                    </span>
                  )}
                  <span className="text-sm font-extrabold tracking-tight sm:text-base">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px]",
                      isSelected
                        ? "font-medium text-primary-700"
                        : "text-slate-400 group-hover:text-slate-500"
                    )}
                  >
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Nút bật/tắt nhập số tiền khác */}
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
                  ? "text-primary-700"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isCustom ? "← Quay lại mức mặc định" : "Tự nhập số tiền khác..."}
            </button>
            <span className="text-[11px] text-slate-400">Tối thiểu 10.000 ₫</span>
          </div>

          {/* Ô nhập số tiền tùy chọn */}
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₫
                </span>
              </div>
            </div>
          )}

          {/* Báo lỗi nếu có */}
          {errorMsg && (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Nút hành động chính (CTA) */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleProceedDonate}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-primary-700/20 transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-75 cursor-pointer"
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

        {/* Lựa chọn phụ: Chi tiết hơn hoặc để sau */}
        <div className="mt-3.5 flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              router.push("/ung-ho");
            }}
            className="text-xs font-semibold text-slate-600 transition hover:text-primary-700 hover:underline cursor-pointer"
          >
            Gửi lời nhắn riêng hoặc xem danh sách ủng hộ →
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-1 text-xs text-slate-400 transition hover:text-slate-600 cursor-pointer"
          >
            Để sau, tôi muốn tiếp tục tra cứu
          </button>
        </div>

        {/* Footer bảo chứng bảo mật & ngân hàng */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <LuShieldCheck className="size-3.5 text-emerald-600" />
          <span>Thanh toán VNPay an toàn • Quét mã QR 40+ ngân hàng & ví điện tử</span>
        </div>
      </div>
    </div>
  );
}
