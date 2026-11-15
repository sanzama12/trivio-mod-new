import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LuArrowUpRight, LuDatabase, LuHeart, LuServer, LuWrench } from "react-icons/lu";
import { DonateForm } from "@/components/donate/donate-form";
import { donationService } from "@/services/donation.service";
import { isVnpayConfigured } from "@/services/vnpay.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ủng hộ Trovio",
  description: "Đồng hành cùng Trovio duy trì công cụ tra cứu tuyển sinh và khám phá ngành học miễn phí cho học sinh.",
};

const purposes = [
  { Icon: LuServer, title: "Giữ nền tảng vận hành", text: "Chi phí máy chủ, lưu trữ và bảo trì để học sinh tiếp tục tra cứu trường, ngành và điểm chuẩn." },
  { Icon: LuDatabase, title: "Chăm chút dữ liệu tuyển sinh", text: "Dành thời gian thu thập, đối chiếu nguồn và cập nhật thông tin tuyển sinh của các trường." },
  { Icon: LuWrench, title: "Cải thiện công cụ mỗi ngày", text: "Hoàn thiện trải nghiệm tìm kiếm, so sánh và tính điểm từ những góp ý của người dùng." },
];
const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

export default async function DonatePage() {
  const [donors, stats] = await Promise.all([donationService.getRecentDonors(), donationService.getAdminStats()]);
  return (
    <div className="bg-[#f7f7f0]">
      <div className="container-page pb-16 pt-8 sm:pb-24 sm:pt-12">
        <nav aria-label="Đường dẫn" className="mb-8 text-xs text-slate-500"><Link href="/" className="hover:text-teal-800">Trang chủ</Link><span className="mx-2" aria-hidden>/</span><span aria-current="page">Ủng hộ</span></nav>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.85fr)] lg:gap-14">
          <div>
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-800"><LuHeart className="size-4" aria-hidden />Đồng hành cùng Trovio</p>
            <h1 className="max-w-2xl text-4xl leading-[1.17] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">Cùng giữ Trovio<br className="hidden sm:block" /> <span className="text-teal-800">miễn phí cho học sinh.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">Một lựa chọn ngành học cần nhiều thông tin đáng tin cậy. Sự đồng hành của bạn giúp Trovio duy trì các công cụ tra cứu và tiếp tục chăm chút dữ liệu tuyển sinh.</p>
            <a href="#dong-gop" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-900 underline decoration-teal-300 underline-offset-8 lg:hidden">Chọn mức đóng góp<LuArrowUpRight className="size-4" aria-hidden /></a>
            <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-3xl sm:aspect-[16/10]">
              <Image src="/images/about/students-planning.webp" alt="Hai bạn trẻ cùng tìm hiểu thông tin học tập trong khuôn viên trường" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
            </div>
            {stats.successCount > 0 && <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-b border-teal-900/10 pb-6"><div><dt className="text-xs text-slate-500">Đóng góp đã hoàn tất</dt><dd className="mt-1 text-2xl font-extrabold text-teal-900">{money(stats.totalRevenue)}</dd></div><div><dt className="text-xs text-slate-500">Lượt đồng hành</dt><dd className="mt-1 text-2xl font-extrabold text-teal-900">{stats.successCount.toLocaleString("vi-VN")}</dd></div></dl>}
          </div>
          <div className="lg:sticky lg:top-28 lg:self-start"><DonateForm enabled={isVnpayConfigured()} /><p className="mx-auto mt-5 max-w-sm text-center text-xs leading-6 text-slate-500">Đóng góp là tự nguyện. Bạn cũng có thể giúp Trovio bằng cách gửi góp ý hoặc chia sẻ thông tin tuyển sinh cần cập nhật.</p></div>
        </div>

        <section aria-labelledby="donation-purpose" className="mt-16 grid gap-8 border-t border-teal-900/15 pt-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><h2 id="donation-purpose" className="max-w-sm text-3xl leading-tight font-extrabold tracking-tight text-slate-900">Đóng góp của bạn<br />giúp Trovio làm gì?</h2><p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">Ưu tiên của dự án là duy trì nền tảng và chất lượng thông tin phục vụ học sinh.</p></div>
          <div className="divide-y divide-teal-900/10">{purposes.map(({ Icon, title, text }) => <div key={title} className="flex gap-5 py-6 first:pt-0 last:pb-0"><Icon className="mt-1 size-6 shrink-0 text-teal-800" aria-hidden /><div><h3 className="text-base font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></div></div>)}</div>
        </section>

        <section aria-labelledby="donation-thanks" className="mt-14 rounded-3xl bg-white p-6 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="donation-thanks" className="text-2xl font-extrabold tracking-tight text-slate-900">Cảm ơn những người đồng hành</h2><p className="mt-2 text-sm text-slate-500">Các khoản đóng góp đã được xác nhận thanh toán.</p></div><LuHeart className="size-6 text-teal-700" aria-hidden /></div>
          {donors.length ? <ul className="mt-6 grid gap-x-8 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">{donors.map((donor) => <li key={donor.id} className="border-b border-slate-100 py-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-slate-800">{donor.donorName}</span><span className="shrink-0 text-sm font-bold text-teal-800">{money(donor.amount)}</span></div>{donor.message && <p className="mt-2 break-words text-sm leading-6 text-slate-500">{donor.message}</p>}</li>)}</ul> : <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">Chưa có khoản đóng góp hoàn tất để hiển thị.</p>}
        </section>

        <section aria-labelledby="donation-faq" className="mx-auto mt-14 max-w-3xl">
          <h2 id="donation-faq" className="mb-6 text-2xl font-extrabold tracking-tight text-slate-900">Một vài điều bạn có thể muốn biết</h2>
          <div className="divide-y divide-teal-900/10">
            <details className="py-5"><summary className="cursor-pointer text-sm font-bold text-slate-800">Tôi có thể ủng hộ ẩn danh không?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Có. Bạn có thể để trống tên và email khi đóng góp. Tên hiển thị sẽ là “Người ủng hộ ẩn danh”.</p></details>
            <details className="py-5"><summary className="cursor-pointer text-sm font-bold text-slate-800">Làm thế nào để biết giao dịch đã hoàn tất?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Sau bước thanh toán tại VNPAY, bạn được chuyển về trang kết quả của Trovio. Trạng thái được đối chiếu với giao dịch đã lưu trên hệ thống.</p></details>
            <details className="py-5"><summary className="cursor-pointer text-sm font-bold text-slate-800">Tôi muốn đồng hành bằng cách khác thì sao?</summary><p className="mt-3 text-sm leading-7 text-slate-600">Bạn có thể gửi góp ý, báo thông tin cần cập nhật hoặc trao đổi việc hợp tác với đội ngũ qua <Link href="/lien-he" className="font-semibold text-teal-800 underline underline-offset-4">trang Liên hệ</Link>.</p></details>
          </div>
        </section>
      </div>
    </div>
  );
}
