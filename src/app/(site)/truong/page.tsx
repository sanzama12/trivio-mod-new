import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UsageBeacon } from "@/components/layout/usage-beacon";
import { LuSearch, LuSearchX } from "react-icons/lu";
import { catalogService, parseProgramFilters, programService, serializeProgramFilters, SORT_LABELS, type ProgramSort } from "@/services";
import { cn } from "@/lib/cn";
import { Breadcrumb, EmptyState, Pagination } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { FilterPanel } from "@/components/search/filter-panel";
import { SchoolCard } from "@/components/school/school-card";
import { OpenCompareButton } from "@/components/program/program-actions";

export const metadata: Metadata = { title: "Tìm trường" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SchoolsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseProgramFilters({ ...raw, majors: raw.majors ?? raw.major, regions: raw.regions ?? raw.region });
  const [result, combos, subjects, groups] = await Promise.all([
    programService.searchSchools(filters),
    catalogService.getCombos(),
    catalogService.getSubjects(),
    catalogService.getGroups(),
  ]);
  const href = (patch: Partial<typeof filters>) => `/truong${serializeProgramFilters({ ...filters, ...patch })}`;
  const sort = filters.sort ?? "phu-hop";

  return (
    <div className="bg-paper-50">
      <UsageBeacon key={filters.q ?? ""} kind="search" active={!!filters.q} />
    <div className="container-page min-w-0 py-6 md:py-10">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm trường" }]} />
      <section className="relative isolate mt-4 overflow-hidden rounded-3xl bg-slate-950">
        <Image
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=75"
          alt="Sân trường đại học mùa tuyển sinh"
          fill
          sizes="(max-width: 1024px) 100vw, 1280px"
          className="object-cover opacity-55"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-primary-900/30" />
        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <p className="inline-flex bg-accent-500 px-3 py-1 text-xs font-black tracking-wide text-slate-950 uppercase">Sổ tuyển sinh</p>
          <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-black tracking-tight text-white md:text-5xl">Tìm trường phù hợp với bạn</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">Lọc theo điểm, tổ hợp, học phí và khu vực. Chọn trường để xem giới thiệu và các ngành đào tạo.</p>
        </div>
      </section>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm break-words text-slate-600">
          Tìm thấy <strong className="text-slate-900">{result.total}</strong> trường phù hợp
        </p>
        <OpenCompareButton />
      </div>
      <div className="mt-5 min-w-0">
        <form action="/truong" role="search" className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-2 rounded-xl border-2 border-slate-900 bg-white p-2">
          {Object.entries({ ...filters, q: undefined, page: undefined }).map(([k, v]) =>
            v == null || (Array.isArray(v) && v.length === 0) ? null : <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v.join(",") : String(v)} />,
          )}
          <div className="flex min-w-0 items-center gap-1">
            <LuSearch className="ml-2 size-4 shrink-0 text-slate-400" aria-hidden />
            <label htmlFor="s-q" className="sr-only">
              Từ khoá
            </label>
            <input id="s-q" name="q" defaultValue={filters.q} placeholder="Tên trường, ngành, mã xét tuyển…" className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          </div>
          <button className={cn(buttonClass({ size: "sm" }), "w-full sm:w-auto")}>Tìm</button>
        </form>
      </div>

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 lg:order-2 lg:sticky lg:top-24">
          <FilterPanel filters={filters} combos={combos} subjects={subjects} groups={groups} resultKind="schools" />
        </div>

        <section aria-label="Kết quả tìm kiếm" className="min-w-0 lg:order-1">
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Sắp xếp">
            {(Object.keys(SORT_LABELS) as ProgramSort[]).map((k) => (
              <Link
                key={k}
                role="tab"
                aria-selected={sort === k}
                href={href({ sort: k, page: undefined })}
                scroll={false}
                className={cn(
                  "rounded-full border-2 border-slate-900 px-4 py-2 text-[13px] font-bold transition-colors",
                  sort === k ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100",
                )}
              >
                {SORT_LABELS[k]}
              </Link>
            ))}
          </div>

          {result.total === 0 ? (
            <div className="rounded-2xl border-2 border-slate-900 bg-white">
              <EmptyState
                icon={<LuSearchX />}
                title="Không tìm thấy trường phù hợp"
                description="Thử nới bớt một điều kiện bên dưới, hoặc nhập lại điểm và tổ hợp của bạn."
              >
                <Link href="/truong" className={buttonClass({ variant: "outline", size: "sm" })}>
                  Xoá bộ lọc
                </Link>
                <Link href="/diem-cua-toi" className={buttonClass({ variant: "ghost", size: "sm" })}>
                  Sửa điều kiện điểm
                </Link>
              </EmptyState>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {result.items.map((school) => (
                  <SchoolCard key={school.id} school={school} summary={result.summaries[school.id]} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => href({ page: p })} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
    </div>
  );
}
