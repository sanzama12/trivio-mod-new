import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowRight, LuBookOpen, LuSearch } from "react-icons/lu";
import { catalogService } from "@/services";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { GroupIcon } from "@/components/ui/group-icon";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Khám phá ngành học" };

const LETTERS = ["A", "B", "C", "D", "Đ", "E", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "X", "Y"];

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MajorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = sp.group || undefined;
  const q = sp.q?.trim() || undefined;
  const letter = sp.letter || undefined;
  const [groups, items] = await Promise.all([catalogService.getGroupsWithCounts(), catalogService.listMajors({ group, q, letter })]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ group, q, letter, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/nganh?${s}#tat-ca` : "/nganh#tat-ca";
  };

  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-slate-50">
        <div className="container-page pt-6 pb-14">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành" }]} />
          <div className="mt-8 text-center">
            <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">Hệ thống phân loại ngành đào tạo</span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Khám phá ngành học</h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Tìm hiểu chi tiết về các ngành đào tạo tại Việt Nam, nhu cầu thị trường và cơ hội việc làm tương lai.</p>
            <form action="/nganh" role="search" className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-elevated">
              <LuSearch className="ml-3 size-5 text-slate-400" aria-hidden />
              <label htmlFor="m-q" className="sr-only">
                Tìm ngành
              </label>
              <input id="m-q" name="q" defaultValue={q} placeholder="Tìm theo tên ngành hoặc mã ngành…" className="h-11 min-w-0 flex-1 bg-transparent focus:outline-none" />
              <button className={buttonClass()}>Tìm kiếm</button>
            </form>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <SectionHeading title="Nhóm ngành phổ biến" subtitle="Chọn một nhóm để lọc danh sách ngành bên dưới." />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map(({ group: g, majorCount }) => (
            <Link
              key={g.id}
              href={qs({ group: group === g.id ? undefined : g.id, letter: undefined })}
              aria-current={group === g.id ? "true" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-card transition hover:shadow-elevated",
                group === g.id ? "border-primary-600 ring-2 ring-primary-100" : "border-slate-200 hover:border-primary-200",
              )}
            >
              <GroupIcon group={g} />
              <span>
                <span className="block text-[15px] font-semibold text-slate-900">{g.name}</span>
                <span className="text-[13px] text-slate-500">{majorCount} ngành</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="tat-ca" className="container-page pb-16">
        <SectionHeading
          title="Tất cả ngành đào tạo"
          subtitle={`${items.length} ngành${group ? ` thuộc nhóm ${groups.find((g) => g.group.id === group)?.group.name}` : ""}${q ? ` khớp “${q}”` : ""}${letter ? ` bắt đầu bằng “${letter}”` : ""}.`}
          action={
            group || q || letter ? (
              <Link href="/nganh#tat-ca" className="text-sm font-semibold text-primary-600 hover:underline">
                Xoá lọc
              </Link>
            ) : undefined
          }
        />
        <nav aria-label="Lọc theo chữ cái" className="mt-6 flex flex-wrap gap-1.5">
          <Link href={qs({ letter: undefined })} className={cn("rounded-full px-3 py-1.5 text-[13px] font-semibold", !letter ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
            Tất cả
          </Link>
          {LETTERS.map((l) => (
            <Link
              key={l}
              href={qs({ letter: l })}
              aria-current={letter === l ? "true" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-[13px] font-semibold",
                letter === l ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary-300",
              )}
            >
              {l}
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <Card className="mt-6">
            <EmptyState icon={<LuBookOpen />} title="Chưa có ngành phù hợp" description="Thử từ khoá khác hoặc bỏ bớt bộ lọc.">
              <Link href="/nganh" className={buttonClass({ variant: "outline", size: "sm" })}>
                Xem tất cả ngành
              </Link>
            </EmptyState>
          </Card>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map(({ major, group: g, programCount }) => (
              <Card key={major.id} className="flex flex-col p-5 transition hover:shadow-elevated">
                <div className="flex items-start justify-between gap-3">
                  <GroupIcon group={g} className="size-10" />
                  <Badge tone={g?.tone || "slate"}>{g?.name || "Khác"}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  <Link href={`/nganh/${major.slug}`} className="hover:text-primary-700">
                    {major.name}
                  </Link>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">Mã ngành {major.code}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{major.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[13px]">
                  <span className="text-slate-500">{programCount} chương trình đào tạo</span>
                  <Link href={`/nganh/${major.slug}`} className="flex items-center gap-1 font-semibold text-primary-600 hover:underline">
                    Xem chi tiết <LuArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-primary-700 to-primary-600 p-8 text-white md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-bold">Chưa biết ngành nào phù hợp với bản thân?</h2>
            <p className="mt-2 max-w-xl text-primary-100">Làm bài trắc nghiệm sở thích nghề nghiệp RIASEC (miễn phí, 7–10 phút) để nhận gợi ý ngành học phù hợp.</p>
          </div>
          <Link href="/trac-nghiem" className={buttonClass({ variant: "accent", size: "lg" })}>
            Làm trắc nghiệm sở thích →
          </Link>
        </div>
      </section>
    </>
  );
}
