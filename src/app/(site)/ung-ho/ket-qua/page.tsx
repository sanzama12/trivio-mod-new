import type { Metadata } from "next";
import Link from "next/link";
import {
  LuCircleCheck,
  LuCircleX,
  LuCompass,
  LuHandHeart,
  LuHouse,
  LuReceipt,
  LuRefreshCw,
  LuShieldCheck,
} from "react-icons/lu";

export const metadata: Metadata = {
  title: "Kết quả thanh toán ủng hộ — TriOVO",
  robots: { index: false, follow: false },
};

export default async function DonationResultPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    txnRef?: string;
    amount?: string;
    donorName?: string;
    bankCode?: string;
    transNo?: string;
    paidAt?: string;
  }>;
}) {
  const { status, message, txnRef, amount, donorName, bankCode, transNo, paidAt } =
    await searchParams;

  const isSuccess = status === "success";
  const numAmount = Number(amount || 0);

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-slate-50 via-white to-slate-100/60 py-16 sm:py-20">
      <div className="container-page max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          {/* Trạng thái thành công */}
          {isSuccess ? (
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                <LuCircleCheck className="size-9" />
              </div>

              <h1 className="mt-5 text-2xl font-black text-slate-900 sm:text-3xl">
                Cảm ơn tấm lòng của bạn!
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Khoản đóng góp của bạn đã được ghi nhận thành công qua cổng thanh toán VNPay. TriOVO trân trọng gửi lời tri ân sâu sắc nhất tới bạn!
              </p>

              {/* Phiếu biên nhận */}
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 text-left text-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <LuReceipt className="size-4" /> Biên lai ủng hộ
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Đã thanh toán
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Người ủng hộ:</span>
                    <span className="font-semibold text-slate-900">{donorName || "Nhà hảo tâm giấu tên"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="text-base font-extrabold text-primary-700">
                      {formatVnd(numAmount)}
                    </span>
                  </div>

                  {transNo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã giao dịch VNPay:</span>
                      <span className="font-mono text-slate-800">{transNo}</span>
                    </div>
                  )}

                  {txnRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã đơn tham chiếu:</span>
                      <span className="font-mono text-slate-800">{txnRef}</span>
                    </div>
                  )}

                  {bankCode && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngân hàng thanh toán:</span>
                      <span className="font-medium text-slate-800">{bankCode}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian xác nhận:</span>
                    <span className="text-slate-800">
                      {paidAt ? new Date(paidAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary-600/25 transition hover:bg-primary-700"
                >
                  <LuHouse className="size-4" /> Về trang chủ
                </Link>
                <Link
                  href="/chuong-trinh"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LuCompass className="size-4" /> Khám phá ngành học
                </Link>
              </div>
            </div>
          ) : (
            /* Trạng thái thất bại hoặc lỗi */
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm">
                <LuCircleX className="size-9" />
              </div>

              <h1 className="mt-5 text-2xl font-black text-slate-900 sm:text-3xl">
                Giao dịch chưa hoàn tất
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                {message || "Giao dịch thanh toán đã bị huỷ hoặc xảy ra lỗi trong quá trình xử lý qua cổng VNPay."}
              </p>

              {txnRef && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-500">
                  Mã tham chiếu đơn: {txnRef}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/ung-ho"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary-600/25 transition hover:bg-primary-700"
                >
                  <LuRefreshCw className="size-4" /> Thử ủng hộ lại
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LuHouse className="size-4" /> Về trang chủ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
