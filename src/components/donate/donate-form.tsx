"use client";

import { useState, type FormEvent } from "react";
import { LuArrowUpRight, LuCheck, LuHeart, LuLockKeyhole } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/field";

const AMOUNTS = [20000, 50000, 100000, 200000];
const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

export function DonateForm({ enabled }: { enabled: boolean }) {
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [bankCode, setBankCode] = useState("VNPAYQR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedAmount = custom ? Number(customAmount) : amount;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (!Number.isSafeInteger(selectedAmount) || selectedAmount < 10000 || selectedAmount > 100000000) {
      setError("Nhập số tiền từ 10.000 đến 100.000.000 ₫.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount, bankCode, donorName: fields.get("donorName"), donorEmail: fields.get("donorEmail"), message: fields.get("message") }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.data?.paymentUrl) throw new Error(result.message || "Chưa tạo được liên kết thanh toán. Vui lòng thử lại.");
      window.location.assign(result.data.paymentUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Kết nối bị gián đoạn. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <form id="dong-gop" onSubmit={submit} aria-labelledby="donate-form-title" className="scroll-mt-28 rounded-3xl border border-teal-900/10 bg-white p-6 shadow-[0_20px_70px_-25px_rgba(15,76,75,0.24)] sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="donate-form-title" className="text-2xl font-extrabold tracking-tight text-slate-900">Gửi một lời tiếp sức</h2>
          <p className="mt-2 text-sm text-slate-500">Chọn mức đóng góp phù hợp với bạn.</p>
        </div>
        <LuHeart className="mt-1 size-6 shrink-0 text-teal-700" aria-hidden />
      </div>
      <fieldset disabled={loading} className="space-y-5">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-800">Số tiền đóng góp</legend>
          <div className="grid grid-cols-2 gap-3">
            {AMOUNTS.map((value) => (
              <button key={value} type="button" aria-pressed={!custom && amount === value}
                onClick={() => { setCustom(false); setAmount(value); }}
                className={cn("flex min-h-14 items-center justify-between rounded-xl border px-4 text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700", !custom && amount === value ? "border-teal-800 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-700 hover:border-teal-500")}>
                {money(value)}{!custom && amount === value && <LuCheck className="size-4" aria-hidden />}
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cn("mt-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold", custom ? "border-teal-800 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-600 hover:border-teal-500")}>Chọn số tiền khác</button>
          {custom && <div className="mt-3"><Label htmlFor="donate-amount">Số tiền khác (VNĐ)</Label><Input id="donate-amount" type="number" min={10000} max={100000000} step={1} required inputMode="numeric" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="Nhập số tiền từ 10.000 ₫" /></div>}
        </fieldset>
        <div>
          <Label htmlFor="donate-method">Phương thức thanh toán</Label>
          <select id="donate-method" value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-teal-700">
            <option value="VNPAYQR">Quét mã VNPAY-QR</option>
            <option value="VNBANK">Thẻ ATM / Ngân hàng nội địa</option>
            <option value="INTCARD">Thẻ quốc tế</option>
          </select>
        </div>
        <details className="border-t border-slate-100 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Tên và lời nhắn của bạn <span className="font-normal text-slate-400">(tuỳ chọn)</span></summary>
          <div className="mt-4 space-y-4">
            <div><Label htmlFor="donor-name">Tên hiển thị công khai</Label><Input id="donor-name" name="donorName" maxLength={80} autoComplete="name" placeholder="Để trống để ủng hộ ẩn danh" /></div>
            <div><Label htmlFor="donor-email">Email liên hệ</Label><Input id="donor-email" name="donorEmail" type="email" maxLength={254} autoComplete="email" placeholder="ban@example.com" /><p className="mt-1 text-xs text-slate-500">Email được lưu cùng giao dịch và dùng khi cần hỗ trợ.</p></div>
            <div><Label htmlFor="donor-message">Lời nhắn công khai</Label><textarea id="donor-message" name="message" maxLength={500} rows={3} className="w-full rounded-xl border border-slate-300 p-3 text-sm focus-visible:outline-2 focus-visible:outline-teal-700" placeholder="Một lời động viên gửi đến Trovio…" /></div>
          </div>
        </details>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {!enabled && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">Cổng thanh toán đang chờ cấu hình. Bạn có thể liên hệ đội ngũ qua trang Liên hệ để trao đổi việc đồng hành.</p>}
        <button type="submit" disabled={!enabled || loading} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-teal-900 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
          <span>{loading ? "Đang mở thanh toán…" : `Ủng hộ ${money(selectedAmount || 0)}`}</span><LuArrowUpRight className="size-5 shrink-0" aria-hidden />
        </button>
      </fieldset>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LuLockKeyhole className="size-3.5 shrink-0" aria-hidden />Tiếp tục thanh toán qua cổng VNPAY.</p>
    </form>
  );
}
