import type { Metadata } from "next";
import Link from "next/link";
import { LuBuilding2, LuMapPin, LuSearch } from "react-icons/lu";
import { catalogService } from "@/services";
import { matchesQuery } from "@/lib/text";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { Breadcrumb, EmptyState } from "@/components/ui/misc";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import type { Region } from "@/domain/types";

export const metadata: Metadata = { title: "Danh mục trường" };

const REGIONS: Region[] = ["bac", "trung", "nam"];

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SchoolsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const region = REGIONS.includes(sp.region as Region) ? (sp.region as Region) : undefined;
  const all = await catalogService.listSchools();
  const items = all.filter((s) => {
    if (region && s.region !== region) return false;
    if (q && !matchesQuery(q, s.name, s.shortName, s.code, s.city)) return false;
    return true;
  });

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q, region, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/truong?${s}` : "/truong";
  };

  return (
    <section className="bg-gradient-to-b from-primary-50 to-slate-50">
      <div className="container-page pt-6 pb-16">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Danh mục trường" }]} />
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Danh mục trường</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Toàn bộ trường đang có trong hệ thống. Trường mới hiện ở đây sau khi dữ liệu được nhập.</p>
          <form action="/truong" role="search" className="mt-6 flex max-w-xl flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
            <label htmlFor="school-q" className="sr-only">
              Tìm trường
            </label>
            <input
              id="school-q"
              name="q"
              defaultValue={q}
              placeholder="Tên trường, tên viết tắt hoặc mã trường"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 shadow-card focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            />
            {region ? <input type="hidden" name="region" value={region} /> : null}
            <button className={buttonClass({ className: "w-full min-[420px]:w-auto" })}>
              <LuSearch className="size-4" aria-hidden /> Tìm
            </button>
          </form>
          <nav aria-label="Lọc theo miền" className="mt-4 flex flex-wrap gap-2">
            <Link href={href({ region: undefined })} className={cn("rounded-full px-3 py-1.5 text-[13px] font-semibold", !region ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
              Tất cả
            </Link>
            {REGIONS.map((r) => (
              <Link
                key={r}
                href={href({ region: region === r ? undefined : r })}
                aria-current={region === r ? "true" : undefined}
                className={cn("rounded-full px-3 py-1.5 text-[13px] font-semibold", region === r ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}
              >
                {REGION_LABELS[r]}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10">
          <SectionHeading
            title={`${items.length} trường`}
            subtitle={q || region ? "Đúng bộ lọc đang chọn." : "Không lọc — đây là toàn bộ danh mục."}
            action={
              q || region ? (
                <Link href="/truong" className="text-sm font-semibold text-primary-600 hover:underline">
                  Xoá lọc
                </Link>
              ) : undefined
            }
          />
          {all.length === 0 ? (
            <Card className="mt-6">
              <EmptyState icon={<LuBuilding2 />} title="Chưa có trường" description="Danh sách trống. Sau khi nhập dữ liệu trường, các trường sẽ hiện tại trang này." />
            </Card>
          ) : items.length === 0 ? (
            <Card className="mt-6">
              <EmptyState icon={<LuBuilding2 />} title="Không có trường khớp" description="Thử từ khoá khác hoặc bỏ bộ lọc miền.">
                <Link href="/truong" className={buttonClass({ variant: "outline", size: "sm" })}>
                  Xem tất cả trường
                </Link>
              </EmptyState>
            </Card>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <li key={s.id}>
                  <Link href={`/truong/${s.slug}`} className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-primary-200 hover:shadow-elevated">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-800">
                      {(s.code || s.shortName || s.name).slice(0, 4)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold break-words text-slate-900">{s.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-500">
                        {s.shortName ? <span>{s.shortName}</span> : null}
                        {s.code ? <span>{s.code}</span> : null}
                        {s.city ? (
                          <span className="inline-flex items-center gap-1">
                            <LuMapPin className="size-3" aria-hidden />
                            {s.city}
                          </span>
                        ) : null}
                        <span>{REGION_LABELS[s.region]}</span>
                        <span>{SCHOOL_TYPE_LABELS[s.type]}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
