import Link from "next/link";
import { LuArrowRight, LuChevronRight, LuCompass, LuSchool, LuSearch, LuShieldCheck, LuSparkles, LuTarget } from "react-icons/lu";
import { catalogService, programService } from "@/services";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { GroupIcon } from "@/components/ui/group-icon";
import { ForYouSection } from "@/components/home/for-you";
import { JourneySteps } from "@/components/home/journey-steps";

const paths = [
  {
    icon: LuSchool,
    title: "Đã có trường mong muốn",
    desc: "Tra cứu thông tin tuyển sinh, điểm chuẩn và học phí của trường bạn quan tâm nhanh chóng.",
    cta: "Tìm trường",
    href: "/chuong-trinh",
  },
  {
    icon: LuSearch,
    title: "Đã biết ngành yêu thích",
    desc: "Xem chi tiết ngành học và so sánh chương trình đào tạo thực tế tại nhiều trường khác nhau.",
    cta: "Xem ngành học",
    href: "/nganh",
  },
  {
    icon: LuCompass,
    title: "Chưa có định hướng",
    desc: "Làm trắc nghiệm tính cách RIASEC để khám phá chính xác ngành học phù hợp với sở thích.",
    cta: "Làm trắc nghiệm",
    href: "/trac-nghiem",
  },
];

const principles = [
  { icon: LuShieldCheck, title: "Dữ liệu có nguồn rõ ràng", desc: "Mỗi chương trình ghi nguồn đề án tuyển sinh và ngày kiểm tra gần nhất." },
  { icon: LuTarget, title: "Điểm chuẩn mang tính tham khảo", desc: "Phân tích điểm chuẩn 3 năm gần nhất giúp tối ưu cơ hội lựa chọn, không cam kết trúng tuyển." },
  { icon: LuSparkles, title: "Khách quan, không quảng cáo", desc: "Hệ thống gợi ý tự động dựa hoàn toàn trên thuật toán, không nhận tài trợ xếp hạng." },
];

export default async function HomePage() {
  const [groups, stats] = await Promise.all([catalogService.getGroupsWithCounts(), programService.stats()]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-slate-50">
        <div className="container-page py-16 text-center md:py-24">
          <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
            Cổng định hướng đại học thông minh
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-3xl leading-tight font-bold tracking-tight text-slate-900 md:text-5xl md:leading-[1.15]">
            Tìm đúng trường, chọn đúng ngành – khởi đầu tương lai của bạn
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Hỗ trợ sĩ tử tìm kiếm cơ hội học tập, so sánh điểm chuẩn, học phí và cấu trúc chương trình đào tạo của các trường đại học toàn quốc.
          </p>
          <form action="/chuong-trinh" method="get" role="search" data-tour="search" className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-elevated min-[420px]:flex-row min-[420px]:items-center">
            <LuSearch className="ml-3 size-5 shrink-0 text-slate-400" aria-hidden />
            <label htmlFor="hero-q" className="sr-only">
              Tìm trường, ngành, chương trình
            </label>
            <input
              id="hero-q"
              name="q"
              placeholder="Tìm trường, ngành, chương trình đào tạo…"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-slate-500 focus:outline-none"
            />
            <button type="submit" className={buttonClass({ className: "w-full shrink-0 px-6 min-[420px]:w-auto" })}>
              Tìm kiếm
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-[13px]">
            {[`${stats.programs} chương trình`, `${stats.schools} trường`, "Cập nhật 2026"].map((t) => (
              <span key={t} className="rounded-full border border-primary-200 bg-white px-3 py-1 font-medium text-primary-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Dành cho bạn */}
      <JourneySteps />
      <ForYouSection />

      {/* 3 lối đi */}
      <section className="container-page py-16">
        <SectionHeading title="3 điểm xuất phát để bắt đầu" subtitle="Chọn lối đi phù hợp với bạn ngay từ đầu để tiết kiệm thời gian tìm kiếm và so sánh." />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {paths.map((p) => (
            <Card key={p.title} className="flex flex-col p-6">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <p.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              <Link href={p.href} className={buttonClass({ size: "sm", className: "mt-6 self-start" })}>
                {p.cta} <LuArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Nhóm ngành */}
      <section className="container-page pb-16">
        <SectionHeading
          title="Khám phá theo nhóm ngành"
          subtitle="Lựa chọn nhanh các ngành nghề thuộc 8 nhóm ngành trọng điểm, cập nhật định hướng tuyển sinh mới nhất."
          action={
            <Link href="/nganh" className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
              Tất cả các ngành <LuArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map(({ group, majorCount }) => (
            <Link
              key={group.id}
              href={`/nganh?group=${group.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-primary-200 hover:shadow-elevated"
            >
              <GroupIcon group={group} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-900">{group.name}</span>
                <span className="text-[13px] text-slate-500">{majorCount} ngành</span>
              </span>
              <LuChevronRight className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* Minh bạch */}
      <section className="border-t border-slate-200 bg-white">
        <div className="container-page py-16">
          <SectionHeading align="center" title="Nguyên tắc gợi ý minh bạch" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                <p.icon className="mt-0.5 size-6 shrink-0 text-primary-600" aria-hidden />
                <div>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm">
            <Link href="/cach-goi-y" className="font-semibold text-primary-600 hover:underline">
              Tìm hiểu cách Trovio gợi ý và nguồn dữ liệu →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
