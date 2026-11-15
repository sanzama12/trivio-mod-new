import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LuHandHeart } from "react-icons/lu";
import { getCurrentUser } from "@/lib/auth";
import { donationService } from "@/services/donation.service";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Lịch sử đóng góp", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: BadgeTone; hint: string }> = {
  success: { label: "Thành công", tone: "success", hint: "Khoản đóng góp đã được xác nhận." },
  pending: { label: "Đang chờ", tone: "warning", hint: "Chưa nhận được kết quả từ cổng thanh toán." },
  failed: { label: "Không thành công", tone: "danger", hint: "Giao dịch bị từ chối hoặc lỗi; tiền chưa bị trừ." },
  cancelled: { label: "Đã huỷ", tone: "slate", hint: "Bạn đã huỷ giao dịch trước khi hoàn tất." },
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "—");

export default async function DonationHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=%2Fung-ho%2Flich-su");
  const items = await donationService.listForUser(user.id);
  const total = items.filter((i) => i.status === "success").reduce((sum, i) => sum + i.amount, 0);
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Ủng hộ Trovio", href: "/ung-ho" }, { label: "Lịch sử đóng góp" }]} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Lịch sử đóng góp của bạn</h1>
      <p className="mt-2 text-sm text-slate-600">
        Gồm các lần ủng hộ bạn thực hiện khi đã đăng nhập. {items.length > 0 && <>Tổng đã ghi nhận: <strong className="text-slate-900">{total.toLocaleString("vi-VN")} ₫</strong>.</>}
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={<LuHandHeart />}
            title="Bạn chưa có lần đóng góp nào"
            description="Những lần ủng hộ thực hiện khi đang đăng nhập sẽ hiện ở đây cùng trạng thái giao dịch."
          >
            <ButtonLink href="/ung-ho">Ủng hộ Trovio</ButtonLink>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 space-y-3" aria-label="Danh sách giao dịch ủng hộ">
          {items.map((d) => {
            const st = STATUS[d.status] ?? STATUS.pending;
            return (
              <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-bold text-slate-900">{d.amount.toLocaleString("vi-VN")} ₫</p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{st.hint}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex gap-2"><dt className="text-slate-500">Thời gian tạo:</dt><dd className="text-slate-800">{when(d.createdAt)}</dd></div>
                  {d.paidAt && <div className="flex gap-2"><dt className="text-slate-500">Xác nhận lúc:</dt><dd className="text-slate-800">{when(d.paidAt)}</dd></div>}
                  {d.vnpBankCode && <div className="flex gap-2"><dt className="text-slate-500">Ngân hàng:</dt><dd className="text-slate-800">{d.vnpBankCode}</dd></div>}
                  <div className="flex gap-2 sm:col-span-2"><dt className="shrink-0 text-slate-500">Mã tham chiếu:</dt><dd className="break-all font-mono text-xs text-slate-800">{d.vnpTxnRef}</dd></div>
                </dl>
                {d.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{d.message}”</p>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-sm text-slate-600">
        Cần hỗ trợ về một giao dịch? <Link href="/lien-he" className="font-semibold text-primary-700 underline underline-offset-4">Liên hệ Trovio</Link> và gửi kèm mã tham chiếu.
      </p>
    </div>
  );
}
