import { buttonClass } from "@/components/ui/button";
import type { Metadata } from "next";
import { Reveal } from "@/components/about/about-banner-center";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { MajorExplorer } from "@/components/catalog/major-explorer";
import { UsageBeacon } from "@/components/layout/usage-beacon";
import { PersonalizedSuggestions } from "@/components/search/personalized-suggestions";

export const metadata: Metadata = {
  title: "Tìm ngành học",
  description: "Tìm ngành theo tên, mã ngành hoặc nhóm ngành. Xem giới thiệu ngành trước khi khám phá các trường đào tạo.",
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MajorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = sp.group || undefined;
  const q = sp.q?.trim() || undefined;

  const { groups, items } = await catalogService.getDiscoveryPage();

  const totals = groups.reduce(
    (acc, item) => ({
      majors: acc.majors + item.majorCount,
      programs: acc.programs + item.programCount,
      schools: acc.schools + item.schoolCount,
    }),
    { majors: 0, programs: 0, schools: 0 }
  );

  return (
    <div className="min-h-screen bg-paper-50 pb-20">
      <UsageBeacon key={q ?? ""} kind="search" active={!!q} />
      <div className="container-page min-w-0 py-6">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành" }]} />

        {/* Hero — editorial: label nhỏ, statement lớn trái, số liệu khổng lồ bên phải */}
        <Reveal>
          <header className="mt-10 grid items-end gap-8 border-b-2 border-slate-900 pb-8 lg:grid-cols-[1.35fr_auto] lg:gap-16">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-accent-500" aria-hidden />
                <span className="text-[11px] font-extrabold tracking-[.24em] text-primary-800 uppercase">学問案内 · Khám phá ngành</span>
              </div>
              <h1 className="mt-4 text-[2.1rem] leading-[1.08] font-black tracking-[-.04em] text-slate-900 sm:text-[3.2rem] lg:text-[3.6rem]">
                Hiểu ngành trước
                <br />
                <span className="text-slate-400">khi chọn trường.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Tìm theo tên, mã hoặc nhóm ngành; xem nội dung ngành và các trường đào tạo.
              </p>
            </div>

            {/* Số liệu kiểu masthead báo — ba cột tabular */}
            <dl className="flex divide-x divide-slate-300">
              {[
                { v: totals.majors, l: "ngành" },
                { v: groups.length, l: "nhóm ngành" },
              ].map(({ v, l }, i) => (
                <div key={l} className={i === 0 ? "pr-5 text-right" : "px-5 text-right last:pr-0"}>
                  <dd className="text-3xl font-black tabular-nums tracking-[-.03em] text-slate-900 sm:text-[2.6rem]">{v.toLocaleString("vi-VN")}</dd>
                  <dt className="mt-1 text-[10px] font-bold tracking-[.16em] text-slate-500 uppercase">{l}</dt>
                </div>
              ))}
            </dl>
          </header>
        </Reveal>

        <PersonalizedSuggestions query={q} />

        {/* Khu vực chính: Danh mục ngành đào tạo */}
        <Reveal>
          <section className="mt-12">
            <div className="mb-6 flex flex-col gap-1">
              <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Tất cả ngành đào tạo ({totals.majors})
              </h2>
            </div>
            <MajorExplorer
              groups={groups}
              items={items}
              initialGroup={group}
              initialQuery={q}
            />
          </section>
        </Reveal>

      </div>
    </div>
  );
}
