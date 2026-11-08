import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LuCircleCheck, LuCircleX, LuClock, LuCompass, LuHouse, LuReceipt, LuRefreshCw } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { donationService, type DonationReceipt } from "@/services/donation.service";

export const metadata: Metadata = {
  title: "Kết quả thanh toán ủng hộ",
  robots: { index: false, follow: false },
};

// Trạng thái đơn thay đổi theo IPN của VNPay → luôn đọc mới.
export const dynamic = "force-dynamic";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

export default async function DonationResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; loi?: string }>;
}) {
  const { ref, loi } = await searchParams;
  const receipt = ref ? await donationService.getReceipt(ref).catch(() => null) : null;

  return (
    <div className="min-h-[80vh] bg-paper-50 py-16 sm:py-20">
      <div className="container-page max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {receipt ? <ReceiptView receipt={receipt} /> : <ErrorView reason={loi} />}
        </div>
      </div>
    </div>
  );
}

function ReceiptView({ receipt }: { receipt: DonationReceipt }) {
  if (receipt.status === "success") {
    return (
      <div className="text-center">
        <StatusIcon tone="success"><LuCircleCheck className="size-9" aria-hidden /></StatusIcon>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Cảm ơn bạn đã ủng hộ</h1>
        <p className="mt-2 text-sm text-slate-600">
          VNPay đã xác nhận khoản ủng hộ của bạn. Trovio dùng khoản này để duy trì máy chủ và giữ web miễn phí cho học sinh.
        </p>
        <ReceiptTable receipt={receipt} badge="Đã thanh toán" />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className={buttonClass()}>
            <LuHouse className="size-4" aria-hidden /> Về trang chủ
          </Link>
          <Link href="/chuong-trinh" className={buttonClass({ variant: "secondary" })}>
            <LuCompass className="size-4" aria-hidden /> Tìm chương trình
          </Link>
        </div>
      </div>
    );
  }

  if (receipt.status === "pending") {
    return (
      <div className="text-center">
        <StatusIcon tone="pending"><LuClock className="size-9" aria-hidden /></StatusIcon>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Đang chờ VNPay xác nhận</h1>
        <p className="mt-2 text-sm text-slate-600">
          Giao dịch chưa có kết quả cuối cùng. Thường chỉ mất vài giây; bạn có thể tải lại trang để kiểm tra.
          Nếu tài khoản đã bị trừ tiền mà sau 15 phút vẫn ở trạng thái này, hãy liên hệ Trovio kèm mã đơn bên dưới.
        </p>
        <ReceiptTable receipt={receipt} badge="Đang xử lý" />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/ung-ho/ket-qua?ref=${encodeURIComponent(receipt.txnRef)}`} className={buttonClass()}>
            <LuRefreshCw className="size-4" aria-hidden /> Kiểm tra lại
          </Link>
          <Link href="/" className={buttonClass({ variant: "secondary" })}>
            <LuHouse className="size-4" aria-hidden /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const cancelled = receipt.status === "cancelled";
  return (
    <div className="text-center">
      <StatusIcon tone="failed"><LuCircleX className="size-9" aria-hidden /></StatusIcon>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {cancelled ? "Bạn đã huỷ giao dịch" : "Giao dịch chưa thành công"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {receipt.reason ?? "Giao dịch không thành công."} Tài khoản của bạn không bị trừ tiền cho giao dịch này.
      </p>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-600">Mã đơn: {receipt.txnRef}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/ung-ho" className={buttonClass()}>
          <LuRefreshCw className="size-4" aria-hidden /> Thử lại
        </Link>
        <Link href="/" className={buttonClass({ variant: "secondary" })}>
          <LuHouse className="size-4" aria-hidden /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function ErrorView({ reason }: { reason?: string }) {
  const text =
    reason === "xac-thuc"
      ? "Không xác thực được phản hồi từ VNPay (chữ ký không hợp lệ hoặc không tìm thấy đơn). Nếu bạn đã bị trừ tiền, hãy liên hệ Trovio."
      : reason === "he-thong"
        ? "Hệ thống gặp lỗi khi xử lý kết quả thanh toán. Nếu bạn đã bị trừ tiền, hãy liên hệ Trovio."
        : "Không tìm thấy giao dịch. Đường dẫn có thể đã sai hoặc hết hạn.";
  return (
    <div className="text-center">
      <StatusIcon tone="failed"><LuCircleX className="size-9" aria-hidden /></StatusIcon>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Không xem được kết quả</h1>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/ung-ho" className={buttonClass()}>Về trang ủng hộ</Link>
        <Link href="/tro-giup" className={buttonClass({ variant: "secondary" })}>Liên hệ hỗ trợ</Link>
      </div>
    </div>
  );
}

function StatusIcon({ tone, children }: { tone: "success" | "pending" | "failed"; children: ReactNode }) {
  const cls =
    tone === "success"
      ? "bg-success-50 text-success-700"
      : tone === "pending"
        ? "bg-accent-50 text-accent-800"
        : "bg-danger-50 text-danger-700";
  return <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${cls}`}>{children}</div>;
}

function ReceiptTable({ receipt, badge }: { receipt: DonationReceipt; badge: string }) {
  const rows: [string, ReactNode][] = [
    ["Người ủng hộ", receipt.donorName],
    ["Số tiền", <span key="a" className="text-base font-semibold text-primary-700 tabular-nums">{formatVnd(receipt.amount)}</span>],
    ["Mã đơn", <span key="r" className="font-mono">{receipt.txnRef}</span>],
  ];
  if (receipt.transactionNo) rows.push(["Mã giao dịch VNPay", <span key="t" className="font-mono">{receipt.transactionNo}</span>]);
  if (receipt.bankCode) rows.push(["Ngân hàng", receipt.bankCode]);
  rows.push([receipt.paidAt ? "Thời gian xác nhận" : "Thời gian tạo đơn", formatTime(receipt.paidAt ?? receipt.createdAt)]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <LuReceipt className="size-4" aria-hidden /> Biên lai ủng hộ
        </span>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{badge}</span>
      </div>
      <dl className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-slate-600">{k}</dt>
            <dd className="text-right font-medium break-all text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
