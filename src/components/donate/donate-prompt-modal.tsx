"use client";

/**
 * Hộp thoại thông báo ủng hộ TriOVO — Chuẩn Boutique Frontend Design
 * - Thiết kế tối giản, thanh lịch, tỷ lệ chuẩn mực (Golden Ratio).
 * - Kết hợp hình ảnh điện ảnh "Tiếp sức mùa thi" với khung ảnh bo góc tinh tế.
 * - Tránh hoàn toàn lỗi giao diện cồng kềnh hay "AI slop" lộn xộn.
 * - Tự động hiển thị khi người dùng tra cứu/sử dụng tính năng.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LuSparkles,
  LuX,
  LuArrowRight,
  LuShieldCheck,
  LuLoaderCircle,
  LuHeart,
} from "react-icons/lu";
import { cn } from "@/lib/cn";

const PRESET_AMOUNTS = [
  { value: 20000, label: "20.000 ₫", sub: "Tách trà đá" },
  { value: 50000, label: "50.000 ₫", sub: "1 ly cà phê", popular: true },
  { value: 100000, label: "100.000 ₫", sub: "Máy chủ 1 ngày" },
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

    // 1. Mở ngay nếu có cờ ?donate=1 hoặc hash #donate
    const search = window.location.search;
    if (
      search.includes("donate") ||
      search.includes("ungho") ||
      window.location.hash === "#donate"
    ) {
      setVisible(true);
      return;
    }

    // 2. Lắng nghe sự kiện mở thủ công
    const handleCustomOpen = () => setVisible(true);
    window.addEventListener("trovio:open-donate", handleCustomOpen);

    // 3. Tự động hiển thị sau 6 giây trải nghiệm
    const autoTimer = setTimeout(() => {
      const path = window.location.pathname;
      if (!path.startsWith("/ung-ho") && !path.startsWith("/api")) {
        setVisible(true);
      }
    }, 6000);

    // 4. Nếu người dùng tương tác với trang (click, gõ tìm kiếm), kích hoạt sau 3s
    const onUserAction = () => {
      setTimeout(() => {
        const path = window.location.pathname;
        if (!path.startsWith("/ung-ho") && !path.startsWith("/api")) {
          setVisible(true);
        }
      }, 3000);
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
      {/* Nền mờ điện ảnh sâu lắng */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Thẻ Modal Boutique cao cấp */}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-950/25 transition-all animate-in zoom-in-95 duration-200">
        {/* Nút đóng tinh tế */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-md transition hover:bg-slate-900/70 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-4" />
        </button>

        {/* Khung ảnh Hero tỷ lệ vàng có bo tròn nội bộ */}
        <div className="relative -mx-6 -mt-6 mb-5 h-36 w-[calc(100%+3rem)] overflow-hidden bg-slate-950">
          <Image
            src="/images/donate-hero.jpg"
            alt="Tiếp sức mùa thi - TriOVO"
            fill
            className="object-cover opacity-90 transition duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/20" />

          {/* Huy hiệu sứ mệnh trên ảnh */}
          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
                <LuSparkles className="size-2.5" />
                Tiếp sức mùa thi 2026
              </span>
              <p className="mt-1 text-sm font-black text-white leading-tight drop-shadow-sm">
                Chung tay nâng bước sĩ tử nghèo
              </p>
            </div>
          </div>
        </div>

        {/* Tiêu đề & Thông điệp chân thành */}
        <div>
          <h3
            id="donate-prompt-title"
            className="text-lg font-black tracking-tight text-slate-900"
          >
            Tiếp sức 1 ly cà phê cho TriOVO ☕
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            TriOVO là nền tảng phi lợi nhuận giúp hơn 1 triệu sĩ tử tra cứu điểm chuẩn và xét tuyển đại học <b>100% miễn phí</b>. Mỗi sự tiếp sức nhỏ đều trực tiếp bù đắp chi phí máy chủ và gửi tặng suất ăn cho sĩ tử khó khăn.
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
                      ? "border-[#0d4e43] bg-[#0d4e43]/5 text-[#0d4e43] ring-2 ring-[#0d4e43]/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                  )}
                >
                  {item.popular && (
                    <span className="absolute -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-xs">
                      Gợi ý
                    </span>
                  )}
                  <span className="text-[13.5px] font-extrabold tracking-tight">
                    {item.label}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400 font-medium">
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
                  ? "text-[#0d4e43]"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isCustom ? "← Mức gợi ý có sẵn" : "Nhập số tiền khác..."}
            </button>
            <span className="text-[11px] text-slate-400">Tối thiểu 10.000 ₫</span>
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#0d4e43] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d4e43]/20"
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

        {/* Nút hành động chính (Primary Action) */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleProceedDonate}
          className="mt-4.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0d4e43] py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-[#0d4e43]/20 transition-all hover:bg-[#093d34] hover:shadow-xl active:scale-[0.98] disabled:opacity-75 cursor-pointer"
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
            onClick={() => {
              handleDismiss();
              router.push("/ung-ho");
            }}
            className="font-bold text-[#0d4e43] transition hover:underline cursor-pointer"
          >
            Xem chiến dịch & sao kê →
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 font-medium transition hover:text-slate-600 cursor-pointer"
          >
            Để sau, tôi tra cứu tiếp
          </button>
        </div>

        {/* Footer bảo chứng VNPay */}
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
          <LuShieldCheck className="size-3.5 text-emerald-600" />
          <span>Thanh toán VNPay QR an toàn • Quét mã qua 40+ app ngân hàng</span>
        </div>
      </div>
    </div>
  );
}
