"use client";

import { useState } from "react";
import {
  LuCreditCard,
  LuHandHeart,
  LuHeart,
  LuLock,
  LuQrCode,
  LuShieldCheck,
  LuSparkles,
} from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/field";

const PRESET_AMOUNTS = [
  { label: "20.000 ₫", value: 20000, desc: "Một ly trà đá tiếp sức" },
  { label: "50.000 ₫", value: 50000, desc: "Một bữa sáng cho sĩ tử", popular: true },
  { label: "100.000 ₫", value: 100000, desc: "Chi phí máy chủ 1 ngày" },
  { label: "200.000 ₫", value: 200000, desc: "Gói dữ liệu tuyển sinh" },
  { label: "500.000 ₫", value: 500000, desc: "Hỗ trợ học bổng sĩ tử nghèo" },
];

const PAYMENT_METHODS = [
  { id: "VNPAYQR", label: "VNPAY-QR (App Ngân hàng)", icon: LuQrCode, desc: "Quét mã qua 40+ app ngân hàng & ví" },
  { id: "VNBANK", label: "Thẻ ATM Nội địa", icon: LuCreditCard, desc: "Thanh toán qua thẻ ATM / Internet Banking" },
  { id: "INTCARD", label: "Thẻ Quốc tế (Visa / Master)", icon: LuCreditCard, desc: "Thẻ tín dụng & ghi nợ quốc tế" },
];

export function DonateForm() {
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountStr, setCustomAmountStr] = useState("");
  const [bankCode, setBankCode] = useState<string>("VNPAYQR");

  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finalAmount = isCustomAmount ? Number(customAmountStr.replace(/\D/g, "")) : selectedAmount;

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setCustomAmountStr(raw ? Number(raw).toLocaleString("vi-VN") : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!finalAmount || finalAmount < 10000) {
      setErrorMsg("Số tiền ủng hộ tối thiểu là 10.000 ₫.");
      return;
    }
    if (finalAmount > 100000000) {
      setErrorMsg("Số tiền ủng hộ tối đa cho mỗi lượt là 100.000.000 ₫.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          donorName: donorName.trim() || undefined,
          donorEmail: donorEmail.trim() || undefined,
          message: message.trim() || undefined,
          bankCode: bankCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Không thể tạo liên kết thanh toán.");
      }

      // Chuyển hướng trực tiếp sang cổng VNPay
      if (data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else {
        throw new Error("Không nhận được đường dẫn thanh toán từ hệ thống.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      {/* Bước 1: Chọn số tiền */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            1
          </span>
          <h3 className="text-base font-bold text-slate-900">Chọn số tiền ủng hộ (VNĐ)</h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {PRESET_AMOUNTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setSelectedAmount(item.value);
                setIsCustomAmount(false);
                setErrorMsg(null);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all",
                !isCustomAmount && selectedAmount === item.value
                  ? "border-primary-600 bg-primary-50/70 text-primary-900 ring-2 ring-primary-600/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {item.popular && (
                <span className="absolute -top-2.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  Phổ biến
                </span>
              )}
              <span className="text-base font-extrabold">{item.label}</span>
              <span className="mt-0.5 text-[11px] text-slate-500">{item.desc}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setIsCustomAmount(true);
              setErrorMsg(null);
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all",
              isCustomAmount
                ? "border-primary-600 bg-primary-50/70 text-primary-900 ring-2 ring-primary-600/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span className="text-base font-bold">Số tiền khác</span>
            <span className="mt-0.5 text-[11px] text-slate-500">Tuỳ tâm đóng góp</span>
          </button>
        </div>

        {isCustomAmount && (
          <div className="mt-3">
            <div className="relative">
              <Input
                type="text"
                value={customAmountStr}
                onChange={handleCustomAmountChange}
                placeholder="Nhập số tiền muốn ủng hộ (VD: 300.000)"
                className="pl-4 pr-12 text-base font-bold text-primary-700"
                autoFocus
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Tối thiểu: 10.000 ₫ · Tối đa: 100.000.000 ₫</p>
          </div>
        )}
      </div>

      {/* Bước 2: Phương thức thanh toán VNPay */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            2
          </span>
          <h3 className="text-base font-bold text-slate-900">Phương thức thanh toán qua VNPay</h3>
        </div>

        <div className="mt-4 space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method.id}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all",
                bankCode === method.id
                  ? "border-primary-600 bg-primary-50/40 ring-1 ring-primary-600/30"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={bankCode === method.id}
                  onChange={() => setBankCode(method.id)}
                  className="size-4 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">{method.label}</div>
                  <div className="text-xs text-slate-500">{method.desc}</div>
                </div>
              </div>
              <method.icon className="size-5 text-slate-400" />
            </label>
          ))}
        </div>
      </div>

      {/* Bước 3: Thông tin người ủng hộ */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            3
          </span>
          <h3 className="text-base font-bold text-slate-900">Thông tin người ủng hộ (Tuỳ chọn)</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Họ và tên hoặc Biệt danh</label>
            <Input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="VD: Nguyễn Văn A (hoặc để trống)"
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Email nhận biên lai</label>
            <Input
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="VD: name@example.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Lời nhắn gửi gắm đến các sĩ tử</label>
          <textarea
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="Chúc các bạn 2k8 thi tốt, chạm tay vào cánh cổng đại học mơ ước!"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Tóm tắt & Nút xác nhận */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Tổng số tiền ủng hộ:</span>
          <span className="text-xl font-extrabold text-primary-700">
            {finalAmount ? finalAmount.toLocaleString("vi-VN") : "0"} ₫
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || !finalAmount || finalAmount < 10000}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all",
            loading
              ? "cursor-not-allowed bg-slate-400"
              : "bg-primary-600 shadow-primary-600/30 hover:bg-primary-700 active:scale-[0.99]"
          )}
        >
          <LuHandHeart className="size-5" />
          {loading ? "Đang kết nối cổng VNPay..." : "Xác nhận ủng hộ qua VNPay"}
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <LuLock className="size-3.5" />
          <span>Giao dịch an toàn & bảo mật qua Cổng thanh toán Quốc gia VNPay</span>
        </div>
      </div>
    </form>
  );
}

