import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuBriefcase, LuCircleCheck, LuTrendingUp } from "react-icons/lu";
import { RIASEC_INFO } from "@/domain/riasec";
import { catalogService, programService } from "@/services";
import { outcomeService } from "@/services/outcome.service";
import { OutcomePanel } from "@/components/outcomes/outcome-panel";
import { formatScore, formatTuition } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/misc";
import { RiasecPill } from "@/components/riasec/riasec-pill";
import { MajorStyleCard } from "@/components/work-style/style-bits";
import { SaveButton } from "@/components/program/program-actions";
import { SchoolCode } from "@/components/program/program-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await catalogService.getMajorBySlug((await params).slug);
  return { title: data ? `Ngành ${data.major.name}` : "Không tìm thấy ngành" };
}

export default async function MajorPage({ params }: Props) {
  const data = await catalogService.getMajorBySlug((await params).slug);
  if (!data) notFound();
  const { major, group } = data;
  const [programs, outcome, benchmarks] = await Promise.all([
    programService.listByMajor(major.id),
    outcomeService.getMajor(major.id),
    outcomeService.benchmarks(),
  ]);
  const income = benchmarks.find((b) => b.id === "income-2025") ?? null;
  const levels = ["Quản lý & chiến lược", "Thực thi & chuyên môn"] as const;

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành", href: "/nganh" }, { label: group.name, href: `/nganh?group=${group.id}` }, { label: major.name }]} />

      <section className="mt-4 rounded-3xl bg-gradient-to-br from-primary-800 to-primary-600 p-6 text-white md:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Ngành {major.name}</h1>
          <span className="rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-slate-900">{group.name}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
          {[
            ["Mã ngành", major.code],
            ["Chương trình", `${programs.length} chương trình`],
            ["Nhu cầu tuyển dụng", major.demand],
            ["Tăng trưởng tuyển dụng", `+${major.growth}%/năm (minh hoạ)`],
          ].map(([k, v]) => (
            <span key={k} className="rounded-lg bg-white/10 px-3 py-1.5">
              {k}: <strong>{v}</strong>
            </span>
          ))}
        </div>
        <p className="mt-5 max-w-3xl leading-relaxed text-primary-50">{major.description}</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Ngành này học gì?</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {major.curriculum.map((b) => (
                <div key={b.title}>
                  <p className="mb-3 text-xs font-bold tracking-wider text-primary-600 uppercase">{b.title}</p>
                  <ul className="space-y-3">
                    {b.items.map((it) => (
                      <li key={it.name} className="flex gap-3">
                        <LuCircleCheck className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{it.name}</p>
                          <p className="text-[13px] text-slate-500">{it.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <OutcomePanel outcome={outcome} income={income} />

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Cơ hội việc làm & vị trí sau tốt nghiệp</h2>
              <Badge tone="success">
                <LuTrendingUp className="size-3.5" aria-hidden /> +{major.growth}% so với năm trước · minh hoạ
              </Badge>
            </div>
            {levels.map((lvl) => {
              const list = major.careers.filter((c) => c.level === lvl);
              if (!list.length) return null;
              return (
                <div key={lvl} className="mt-5">
                  <p className="mb-3 text-xs font-bold tracking-wider text-primary-600 uppercase">Vị trí {lvl.toLowerCase()}</p>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {list.map((c) => (
                      <li key={c.title} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <LuBriefcase className="size-4" aria-hidden />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{c.title}</p>
                          <p className="text-[13px] font-semibold text-slate-600" title="Khoảng lương tham khảo minh hoạ, chưa có nguồn thống kê">
                            {c.salary} <span className="font-normal text-accent-700">· minh hoạ</span>
                          </p>
                          <p className="mt-1 text-[13px] text-slate-500">{c.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">Sở thích nghề nghiệp – Mã RIASEC</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">Ngành {major.name} phù hợp với người có xu hướng:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {major.riasec.map((t) => (
                <RiasecPill key={t} type={t} />
              ))}
            </div>
            <ul className="mt-4 space-y-3">
              {major.riasec.map((t) => (
                <li key={t} className="text-[13px]">
                  <strong className="text-slate-900">
                    {t} – {RIASEC_INFO[t].label}:
                  </strong>{" "}
                  <span className="text-slate-600">{RIASEC_INFO[t].desc}</span>
                </li>
              ))}
            </ul>
            <Link href="/trac-nghiem" className="mt-4 inline-block text-[13px] font-semibold text-primary-600 hover:underline">
              Làm trắc nghiệm RIASEC để kiểm tra độ phù hợp →
            </Link>
          </Card>
          <MajorStyleCard major={{ slug: major.slug, groupId: major.groupId, name: major.name }} />
        </aside>
      </div>

      <section className="mt-12">
        <p className="text-xs font-bold tracking-wider text-accent-700 uppercase">Danh sách khuyến dùng</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Các trường đào tạo ngành {major.name}</h2>
          <span className="text-sm text-slate-500">
            Tìm thấy <strong className="text-primary-600">{programs.length}</strong> chương trình
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {programs.map(({ program, school }) => (
            <Card key={program.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
              <SchoolCode code={school.code} />
              <div className="min-w-0 flex-1">
                <Link href={`/chuong-trinh/${program.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                  {school.name}
                </Link>
                <p className="text-[13px] text-slate-500">
                  {program.name} · {school.city}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
                <span>
                  Điểm chuẩn {program.cutoffs[0]?.year ? `${program.cutoffs[0].year}: ` : ""}{" "}
                  <strong className="rounded-md bg-primary-600 px-1.5 py-0.5 text-white">{program.cutoffs.length ? formatScore(program.cutoffs[0].score) : "Chưa có dữ liệu chính thức"}</strong>
                </span>
                <span>
                  Học phí: <strong className="text-slate-900">{formatTuition(program.tuitionMin, program.tuitionMax)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SaveButton id={program.id} />
                <Link href={`/chuong-trinh/${program.slug}`} className={buttonClass({ size: "sm" })}>
                  Xem chi tiết chương trình
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
