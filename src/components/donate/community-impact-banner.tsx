import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DONATION_TIERS } from "@/components/donate/donation-tiers";

export function CommunityImpactBanner({ stats, className }: { stats?: { totalRevenue: number; successCount: number }; className?: string }) {
  const revenue = stats?.totalRevenue ?? 0;
  const count = stats?.successCount ?? 0;
  return <section className={`bg-primary-900 px-6 py-12 text-white sm:px-10 ${className ?? ""}`}>
    <h2 className="text-2xl font-bold">Cùng duy trì Trovio miễn phí</h2>
    <p className="mt-3 max-w-prose text-slate-300">Sự ủng hộ giúp duy trì máy chủ, cập nhật dữ liệu đề án và phát triển tính năng cho học sinh.</p>
    <p className="mt-5 text-sm text-slate-300">{count > 0 && revenue > 0 ? `Đã nhận ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(revenue)} từ ${count} lượt ủng hộ.` : "Chưa có lượt ủng hộ nào. Hãy là người đầu tiên."}</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{DONATION_TIERS.map(tier => <div key={tier.value} className="rounded-2xl border border-white/20 p-4"><p className="font-semibold">{tier.desc}</p><p className="mt-1 text-sm text-slate-300">{tier.label}</p></div>)}</div>
    <p className="mt-6 text-sm text-slate-300">Thanh toán qua VNPay; biên lai giao dịch có thể xem sau khi thanh toán.</p>
    <Link href="#donate-form" className={`${buttonClass({ variant: "white" })} mt-6`}>Ủng hộ Trovio</Link>
  </section>;
}
