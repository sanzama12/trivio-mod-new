"use client";

/**
 * Hộp thoại thông báo ủng hộ TriOVO chuẩn Boutique Design & UX Engagement:
 * - Tích hợp hình ảnh chất lượng cao giới thiệu chiến dịch "Tiếp sức mùa thi, nâng bước sĩ tử nghèo".
 * - Tự động xuất hiện sau khi người dùng sử dụng/tương tác với website (sau 8s khi mở trang hoặc 5s sau lần tương tác đầu tiên).
 * - Không làm phiền trên trang /ung-ho hoặc /api.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

const PRESET_AMOUNTS = [
  { value: 20000, label: "20.000 ₫" },
  { value: 50000, label: "50.000 ₫", popular: true },
  { value: 100000, label: "100.000 ₫" },
];

export function DonatePromptModal() {
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isCustom, setIsCustom] = useState(false);
  const [customStr, setCustomStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Kiểm tra nhanh qua URL ?donate=1 hoặc hash #donate
    const search = window.location.search;
    if (
      search.includes("donate") ||
      search.includes("ungho") ||
      window.location.hash === "#donate"
    ) {
      setVisible(true);
      return;
    }

    // 2. Lắng nghe sự kiện mở thủ công từ bất kỳ nút nào
    const handleCustomOpen = () => setVisible(true);
    window.addEventListener("trovio:open-donate", handleCustomOpen);

    // 3. Tự động kích hoạt thông báo sau 8 giây khi khách vào tra cứu
    const autoTimer = setTimeout(() => {
      const path = window.location.pathname;
      if (!path.startsWith("/ung-ho") && !path.startsWith("/api")) {
        setVisible(true);
      }
    }, 8000);

    // 4. Nếu người dùng tương tác sớm hơn (click, gõ tìm kiếm), kích hoạt sau 5s
    const onUserAction = () => {
      setTimeout(() => {
        const path = window.location.pathname;
        if (!path.startsWith("/ung-ho") && !path.startsWith("/api")) {
          setVisible(true);
        }
      }, 5000);
    };

    window.addEventListener("click", onUserAction, { once: true, passive: true });
    window.addEventListener("input", onUserAction, { once: true, passive: true });

    return () => {
      clearTimeout(autoTimer);
      window.removeEventListener("trovio:open-donate", handleCustomOpen);
      window.removeEventListener("click", onUserAction);
      window.removeEventListener("input", onUserAction);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
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
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Khung thông báo chuẩn Boutique UI kèm hình ảnh trực quan */}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-2xl ring-1 ring-slate-900/10 transition-all animate-in zoom-in-95 duration-200">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 z-20 rounded-full bg-slate-900/40 p-2 text-white backdrop-blur-md transition hover:bg-slate-900/70 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-5" />
        </button>

        {/* ẢNH GIỚI THIỆU CHIẾN DỊCH QUYÊN GÓP */}
        <div className="relative -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 mb-4 h-48 sm:h-52 w-[calc(100%+2.5rem)] sm:w-[calc(100%+3rem)] overflow-hidden">
          <Image
            src="/images/donate-hero.jpg"
            alt="Tiếp sức mùa thi - TriOVO"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          {/* Thông điệp trên ảnh */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400 px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-amber-950 shadow-sm">
              <LuSparkles className="size-3" />
              Tiếp sức mùa thi 2026
            </span>
            <h3
              id="donate-prompt-title"
              className="mt-1.5 text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md flex items-center gap-2"
            >
              Tiếp sức 1 ly cà phê cho TriOVO ☕
            </h3>
          </div>
        </div>

        {/* Nội dung thông điệp chân thành */}
        <p className="text-[13.5px] leading-relaxed text-slate-600">
          TriOVO là nền tảng phi lợi nhuận đồng hành cùng hơn 1 triệu sĩ tử tra cứu điểm chuẩn và định hướng tương lai <b>100% miễn phí</b>. Mọi sự đóng góp của bạn giúp duy trì máy chủ tốc độ cao và quy đổi thành suất ăn, dụng cụ thi gửi tới sĩ tử khó khăn.
        </p>

        {/* 3 mức tiền nhanh */}
        <div className="mt-4">
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
                    "group relative flex flex-col items-center justify-center rounded-2xl border py-2.5 px-2 text-center transition-all cursor-pointer",
                    isSelected
                      ? "border-emerald-700 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-700/25 shadow-xs"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {item.popular && (
                    <span className="absolute -top-2 rounded-full border border-amber-300 bg-amber-400 px-1.5 py-0.2 text-[9.5px] font-black text-amber-950 shadow-xs">
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
                  ? "text-emerald-800"
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0d5045] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-[#0d5045]/20 transition-all hover:bg-[#0a4037] active:scale-[0.99] disabled:opacity-75 cursor-pointer"
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
        <div className="mt-3 flex items-center justify-between px-1 text-xs">
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              router.push("/ung-ho");
            }}
            className="font-semibold text-emerald-800 transition hover:underline cursor-pointer"
          >
            Xem chiến dịch & sao kê →
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 font-medium transition hover:text-slate-600 cursor-pointer"
          >
            Để sau, tôi muốn tiếp tục tra cứu
          </button>
        </div>

        {/* Footer bảo mật VNPay */}
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
          <LuShieldCheck className="size-3.5 text-emerald-600" />
          <span>Thanh toán VNPay an toàn • Quét mã QR hơn 40 ngân hàng</span>
        </div>
      </div>
    </div>
  );
}
