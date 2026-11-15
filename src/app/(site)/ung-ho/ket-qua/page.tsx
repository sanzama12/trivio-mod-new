import type { Metadata } from "next";
import Link from "next/link";
import { LuCircleCheck, LuCircleHelp, LuArrowRight } from "react-icons/lu";
import { repositories } from "@database/repositories";

export const metadata: Metadata = { title: "Kết quả ủng hộ", robots: { index: false, follow: false } };

export default async function DonationResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const txnRef = typeof params.txnRef === "string" ? params.txnRef : "";
  const donation = /^[A-Za-z0-9_]{1,100}$/.test(txnRef) ? await repositories.donations.getByTxnRef(txnRef) : null;
  const success = donation?.status === "success";
  return (
    <section className="flex min-h-[65vh] items-center justify-center bg-paper-50 px-5 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-teal-900/10 bg-white p-8 text-center shadow-sm sm:p-12">
        {success ? <LuCircleCheck className="mx-auto size-14 text-teal-700" aria-hidden /> : <LuCircleHelp className="mx-auto size-14 text-amber-600" aria-hidden />}
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">{success ? "Cảm ơn bạn đã đồng hành!" : "Giao dịch chưa hoàn tất"}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{success ? "Khoản đóng góp của bạn đã được xác nhận trên hệ thống Trovio." : "Bạn có thể kiểm tra trạng thái tại ngân hàng hoặc liên hệ đội ngũ Trovio để được hỗ trợ."}</p>
        {donation && <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-left text-sm"><div><dt className="text-slate-500">Mã tham chiếu</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{donation.vnpTxnRef}</dd></div><div><dt className="text-slate-500">Số tiền</dt><dd className="mt-1 font-bold text-teal-800">{donation.amount.toLocaleString("vi-VN")} ₫</dd></div></dl>}
        <Link href="/ung-ho" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-900 px-6 text-sm font-bold text-white">Về trang Ủng hộ<LuArrowRight className="size-4" aria-hidden /></Link>
        <Link href="/lien-he" className="mt-4 block text-sm font-semibold text-teal-800 underline underline-offset-4">Liên hệ hỗ trợ</Link>
      </div>
    </section>
  );
}
