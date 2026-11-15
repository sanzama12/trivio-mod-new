import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBrainCircuit,
  LuCheck,
  LuCircleAlert,
  LuEye,
  LuFileCheck2,
  LuGraduationCap,
  LuListChecks,
  LuLockKeyhole,
  LuScale,
  LuSearch,
  LuSparkles,
  LuTarget,
} from "react-icons/lu";
import {
  AboutBannerCenter,
  AboutTimelineNav,
  Reveal,
} from "@/components/about/about-banner-center";
import { AboutTimeline } from "@/components/about/about-timeline";
import { buttonClass } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Giới thiệu về Trovio",
  description: "Tìm hiểu tầm nhìn, sứ mệnh, sản phẩm, nguyên tắc dữ liệu và cam kết của nền tảng định hướng tuyển sinh Trovio.",
};

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const foundations: Array<{ icon: Icon; title: string; description: ReactNode }> = [
  {
    icon: LuTarget,
    title: "Tầm nhìn",
    description: "Trở thành không gian hỗ trợ định hướng tuyển sinh đáng tin cậy, nơi mọi học sinh đều có thể tiếp cận thông tin rõ ràng và xây dựng lựa chọn phù hợp với chính mình.",
  },
  {
    icon: LuSparkles,
    title: "Sứ mệnh",
    description: "Tổ chức dữ liệu tuyển sinh thành trải nghiệm dễ hiểu; giải thích các quy tắc phức tạp và giúp người học chuyển thông tin thành một kế hoạch hành động cụ thể.",
  },
  {
    icon: LuGraduationCap,
    title: "Giá trị cốt lõi",
    description: (
      <ul className="space-y-1">
        <li>Minh bạch nguồn và cách gợi ý</li>
        <li>Tôn trọng dữ liệu cá nhân</li>
        <li>Trao quyền quyết định cho người học</li>
        <li>Luôn đối chiếu và cải thiện</li>
      </ul>
    ),
  },
];

const products: Array<{ icon: Icon; title: string; description: string; href: string; label: string }> = [
  { icon: LuSearch, title: "Tra cứu & So sánh", description: "Tìm trường, ngành và chương trình theo tổ hợp, phương thức, khu vực, loại hình và học phí; đặt các lựa chọn cạnh nhau để nhìn rõ khác biệt.", href: "/chuong-trinh", label: "Khám phá chương trình" },
  { icon: LuScale, title: "Điểm & Cơ hội", description: "Tính điểm theo tổ hợp, khu vực, đối tượng ưu tiên và đối chiếu đúng phương thức để phân tầng An toàn, Vừa sức, Thử sức.", href: "/diem-cua-toi", label: "Tính điểm của tôi" },
  { icon: LuBrainCircuit, title: "Khám phá ngành", description: "Kết nối sở thích nghề nghiệp RIASEC với nhóm ngành và chương trình, giúp học sinh mở rộng góc nhìn trước khi chọn trường.", href: "/nganh", label: "Khám phá ngành học" },
  { icon: LuListChecks, title: "Danh sách nguyện vọng", description: "Lưu, sắp xếp và rà soát danh sách nguyện vọng để chủ động trong suốt mùa tuyển sinh.", href: "/da-luu", label: "Xây danh sách nguyện vọng" },
];

const commitments = [
  {
    image: "/images/about/students-guidance.webp",
    alt: "Học sinh thảo luận thông tin tuyển sinh với người hướng dẫn",
    icon: LuFileCheck2,
    title: "Thông tin có nguồn, có ngữ cảnh",
    description: "Chỉ tiêu, tổ hợp, phương thức, học phí và điểm chuẩn được ưu tiên đối chiếu từ đề án hoặc thông báo của cơ sở đào tạo. Mỗi dữ liệu cần được hiểu đúng năm, đúng phương thức và đúng thang điểm.",
    bullets: ["Không trộn điểm thi THPT, học bạ và ĐGNL", "Ưu tiên nguồn công bố chính thức", "Cảnh báo khi thông tin có thể đã thay đổi"],
  },
  {
    image: "/images/about/students-planning.webp",
    alt: "Học sinh cùng lập kế hoạch nguyện vọng trên máy tính bảng",
    icon: LuEye,
    title: "Gợi ý phải giải thích được",
    description: "Kết quả không đến từ một điểm số bí mật. Trovio trình bày các yếu tố đã sử dụng — sở thích, khả năng trúng tuyển, vị trí, nhóm ngành và ngân sách — để người học tự kiểm chứng.",
    bullets: ["Nêu rõ lý do một chương trình được gợi ý", "Bộ lọc được áp dụng trước khi xếp hạng", "Không cam kết hay dự đoán chắc chắn kết quả"],
  },
  {
    image: "/images/about/students-campus.webp",
    alt: "Nhóm học sinh khám phá khuôn viên đại học",
    icon: LuLockKeyhole,
    title: "Quyền riêng tư thuộc về người dùng",
    description: "Trovio chỉ dùng dữ liệu bạn chủ động cung cấp để cá nhân hóa trải nghiệm. Nền tảng không thu thập số điện thoại, ngày sinh hay CCCD và không bán dữ liệu học sinh cho quảng cáo.",
    bullets: ["Bạn có thể xem, sửa hoặc xóa dữ liệu", "Liên kết chia sẻ có thời hạn và thu hồi được", "Không quảng cáo nhắm mục tiêu"],
  },
];

const rules = [
  ["01", "Nguồn chính thức", "Ưu tiên đề án, thông báo và cổng tuyển sinh của cơ sở đào tạo."],
  ["02", "Đúng phương thức", "Chỉ so sánh dữ liệu khi cùng phương thức và cùng thang điểm."],
  ["03", "Có thời điểm", "Thông tin luôn gắn với năm hoặc thời điểm cập nhật có thể xác định."],
  ["04", "Có giải thích", "Gợi ý nêu tiêu chí và giới hạn để người dùng tự kiểm chứng."],
  ["05", "Người học quyết định", "Trovio hỗ trợ thu hẹp lựa chọn, không đăng ký hay quyết định thay bạn."],
] as const;

function SectionBand({ label, title, description }: { label: string; title: string; description?: string }) {
  // Port từ .about-title của dungmori: label đứng trong box viền 2px (chừa đáy),
  // title uppercase có gạch trên 2px chạy hết chiều rộng 80%.
  return (
    <header className="mx-auto flex max-w-2xl flex-col items-center">
      <div className="border-2 border-slate-900 border-b-0 bg-paper-50 px-3 py-0.5 text-xl font-bold tracking-wide text-slate-900">{label}</div>
      <div className="flex w-full items-center gap-4 border-t-2 border-slate-900 pt-4">
        <h2 className="mx-auto text-center text-2xl font-bold tracking-[-.02em] text-slate-900 uppercase sm:text-4xl">{title}</h2>
      </div>
      {description && <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>}
    </header>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-white text-slate-900">
      <div className="h-1.5 bg-primary-500" aria-hidden />
      <div className="container-page pt-6">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Giới thiệu" }]} />
      </div>

      <main className="container-page pb-16">
        <AboutBannerCenter />

        <Reveal>
        <section className="pt-14 sm:pt-16">
          <SectionBand label="About us" title="Tổng quan" />
          <div className="mx-auto mt-9 max-w-5xl space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
            <p><strong className="text-slate-900">Trovio</strong> là nền tảng hỗ trợ học sinh và phụ huynh tra cứu, so sánh chương trình đào tạo, tính điểm, khám phá sở thích nghề nghiệp và xây dựng danh sách nguyện vọng.</p>
            <p>Thông tin tuyển sinh thường nằm rải rác trong nhiều đề án, thông báo và cổng dữ liệu khác nhau. Trovio tổ chức các mảnh thông tin này theo trường, ngành, chương trình và phương thức xét tuyển để người dùng dễ tìm, dễ đối chiếu và biết bước nào cần kiểm tra tiếp.</p>
            <p>Nền tảng không phải cổng đăng ký tuyển sinh chính thức và không thay người học ra quyết định. Mọi kết quả được dùng như một cơ sở tham khảo có giải thích; trước khi đăng ký, thí sinh vẫn cần đối chiếu đề án mới nhất của trường và hệ thống của Bộ GD&amp;ĐT.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {foundations.map(({ icon: Icon, title, description }) => (
              <article key={title} className="flex min-h-[22rem] flex-col items-center rounded-[2.5rem] border border-dashed border-slate-400 bg-paper-50 p-7 text-center transition hover:border-primary-500 hover:shadow-lg">
                <h3 className="text-2xl font-black text-slate-950">{title}</h3>
                <div className="mt-8 flex size-24 items-center justify-center rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100"><Icon className="size-11 text-primary-700" aria-hidden /></div>
                <div className="mt-8 text-sm leading-6 text-slate-600">{description}</div>
              </article>
            ))}
          </div>
        </section>
        </Reveal>

        <Reveal>
        <section className="pt-16 sm:pt-20">
          <SectionBand label="Product ecosystem" title="Trovio có gì?" description="Bốn nhóm công cụ kết nối thành một hành trình liền mạch: khám phá, đối chiếu, lập kế hoạch và theo sát mùa tuyển sinh." />
          <div className="mt-10 grid gap-x-12 gap-y-9 lg:grid-cols-2">
            {products.map(({ icon: Icon, title, description, href, label }) => (
              <article key={title} className="grid gap-5 sm:grid-cols-[8rem_1fr] sm:items-start">
                <div className="flex aspect-square w-32 items-center justify-center rounded-2xl bg-primary-500 p-3 shadow-sm">
                  <div className="flex size-full flex-col items-center justify-center rounded-xl bg-white text-primary-700">
                    <Icon className="size-10" aria-hidden />
                    <span className="mt-2 text-[10px] font-black tracking-wider uppercase">Trovio</span>
                  </div>
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-black text-slate-900">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                  <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-primary-700">{label} <LuArrowRight className="size-4" aria-hidden /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        </Reveal>

        <section className="pt-16 sm:pt-20">
          <AboutTimeline />
        </section>

        <Reveal>
        <section className="pt-16 sm:pt-20">
          <SectionBand label="Our commitment" title="Trovio cam kết" />
          <div className="mt-10 space-y-12 sm:space-y-16">
            {commitments.map(({ image, alt, icon: Icon, title, description, bullets }, index) => (
              <article key={title} className="grid items-center gap-7 lg:grid-cols-2 lg:gap-14">
                <div className={index % 2 ? "lg:order-2" : undefined}>
                  <div className="rounded-[2.5rem] border border-primary-400 bg-white p-4 shadow-[0_20px_45px_-35px_rgba(15,93,94,.5)]">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]">
                      <Image src={image} alt={alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                    </div>
                  </div>
                </div>
                <div className={index % 2 ? "lg:order-1" : undefined}>
                  <div className="flex items-stretch overflow-hidden rounded-r-3xl border border-primary-300 bg-paper-50">
                    <div className="flex w-24 shrink-0 items-center justify-center bg-primary-400"><Icon className="size-10 text-slate-950" aria-hidden /></div>
                    <h3 className="flex items-center px-5 py-4 text-xl font-black text-slate-950 sm:text-2xl">{title}</h3>
                  </div>
                  <p className="mt-6 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
                  <ul className="mt-5 space-y-3">
                    {bullets.map((bullet) => <li key={bullet} className="flex gap-2.5 text-sm text-slate-700"><LuCheck className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden /> {bullet}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
        </Reveal>

        <Reveal>
        <section className="pt-16 sm:pt-20">
          <SectionBand label="Information rules" title="Quy tắc thông tin" description="Năm nguyên tắc giúp nội dung trên Trovio rõ ràng, nhất quán và không tạo cảm giác chắc chắn giả." />
          <ol className="mt-9 grid gap-3 md:grid-cols-5">
            {rules.map(([number, title, description]) => (
              <li key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-3xl font-black text-primary-200">{number}</span>
                <h3 className="mt-3 font-black text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 rounded-3xl border border-accent-200 bg-accent-50 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-800"><LuCircleAlert className="size-6" aria-hidden /></div>
            <div><h3 className="font-black text-slate-900">Giới hạn cần biết</h3><p className="mt-1 text-sm leading-6 text-slate-700">Điểm chuẩn, học phí và phương thức có thể thay đổi sau thời điểm cập nhật. Trovio không cam kết kết quả tuyển sinh và không phải cổng đăng ký chính thức.</p></div>
            <Link href="/dieu-khoan" className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-900">Đọc đầy đủ <LuArrowRight className="size-4" aria-hidden /></Link>
          </div>
        </section>
        </Reveal>

        <section className="pt-16 sm:pt-20">
          <div className="rounded-[2rem] bg-primary-700 px-6 py-9 text-white sm:px-10 sm:py-11">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div><div className="flex items-center gap-2 text-sm font-bold text-teal-100"><LuBadgeCheck className="size-5" aria-hidden /> Bắt đầu mà không cần tài khoản</div><h2 className="mt-3 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">Khám phá lựa chọn, kiểm chứng thông tin và xây kế hoạch theo cách của bạn.</h2></div>
              <div className="flex flex-wrap gap-3"><Link href="/chuong-trinh" className={buttonClass({ className: "bg-white text-primary-800 shadow-none hover:bg-primary-50" })}>Tìm chương trình <LuArrowRight className="size-4" aria-hidden /></Link><Link href="/lien-he" className={buttonClass({ variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>Liên hệ Trovio</Link></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
