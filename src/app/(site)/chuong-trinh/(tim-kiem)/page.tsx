import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LuSearch, LuSearchX } from "react-icons/lu";
import { catalogService, parseProgramFilters, programService, serializeProgramFilters, SORT_LABELS, type ProgramSort } from "@/services";
import { ADMISSION_METHODS } from "@/services/scoring.service";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { cn } from "@/lib/cn";
import { Breadcrumb, EmptyState, Pagination } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProgramCard } from "@/components/program/program-card";
import { OpenCompareButton } from "@/components/program/program-actions";
import { SavedScoreHint } from "@/components/search/saved-score-hint";
import { PersonalizedSuggestions } from "@/components/search/personalized-suggestions";

export const metadata: Metadata = { title: "Tìm chương trình đào tạo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseProgramFilters(await searchParams);
  const [result, combos, subjects, groups] = await Promise.all([
    programService.search(filters),
    catalogService.getCombos(),
    catalogService.getSubjects(),
    catalogService.getGroups(),
  ]);
  const href = (patch: Partial<typeof filters>) => `/chuong-trinh${serializeProgramFilters({ ...filters, ...patch })}`;
  const sort = filters.sort ?? "phu-hop";

  return (
    <div className="bg-paper-50">
    <div className="container-page min-w-0 py-6 md:py-10">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm chương trình" }]} />
      <section className="relative isolate mt-4 overflow-hidden rounded-3xl bg-primary-900">
        <Image
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=75"
          alt="Sân trường đại học mùa tuyển sinh"
          fill
          sizes="(max-width: 1024px) 100vw, 1280px"
          className="hidden object-cover opacity-55 md:block"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/65 to-primary-900/30" />
        <div className="relative px-5 py-4 sm:px-8 md:py-10">
          <p className="inline-flex bg-accent-500 px-3 py-1 text-xs font-semibold tracking-wide text-slate-950">Sổ tuyển sinh</p>
          <h1 className="mt-2 max-w-3xl leading-tight text-white text-2xl md:text-4xl font-bold tracking-tight">Tìm chương trình đào tạo phù hợp với bạn</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-200 md:text-base">Lọc theo điểm, tổ hợp, học phí và khu vực để đi từ danh mục rộng đến lựa chọn có căn cứ.</p>
          <p className="mt-2 text-sm text-slate-200">Với hồ sơ đã lưu, mức phù hợp dùng tổ hợp tốt nhất của bạn cho từng chương trình; bộ lọc và sắp xếp theo điểm ghim.</p>
        </div>
      </section>
      {(filters.score != null || filters.method || filters.combos?.length || filters.regions?.length || filters.budgetMax != null || filters.types?.length || filters.groups?.length) ? <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-slate-700">Đang dùng:</span>
        {filters.score != null && <Link href={href({ score: undefined })} aria-label={`Bỏ điều kiện điểm ${filters.score}`} className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">Điểm {filters.score} <span aria-hidden>×</span></Link>}
        {filters.method && <Link href={href({ method: undefined })} aria-label="Bỏ điều kiện phương thức" className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">{ADMISSION_METHODS[filters.method]?.short ?? filters.method} <span aria-hidden>×</span></Link>}
        {filters.combos?.map((v) => <Link key={v} href={href({ combos: filters.combos?.filter((x) => x !== v) })} aria-label={`Bỏ tổ hợp ${v}`} className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">{v} <span aria-hidden>×</span></Link>)}
        {filters.regions?.map((v) => <Link key={v} href={href({ regions: filters.regions?.filter((x) => x !== v) })} aria-label={`Bỏ khu vực ${REGION_LABELS[v]}`} className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">{REGION_LABELS[v] ?? v} <span aria-hidden>×</span></Link>)}
        {filters.budgetMax != null && <Link href={href({ budgetMax: undefined })} aria-label="Bỏ giới hạn học phí" className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">Học phí tối đa {filters.budgetMax} triệu/năm <span aria-hidden>×</span></Link>}
        {filters.types?.map((v) => <Link key={v} href={href({ types: filters.types?.filter((x) => x !== v) })} aria-label={`Bỏ loại trường ${SCHOOL_TYPE_LABELS[v]}`} className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">{SCHOOL_TYPE_LABELS[v] ?? v} <span aria-hidden>×</span></Link>)}
        {filters.groups?.map((v) => <Link key={v} href={href({ groups: filters.groups?.filter((x) => x !== v) })} aria-label={`Bỏ nhóm ngành ${groups.find((g) => g.id === v)?.name ?? v}`} className="min-h-11 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-slate-800 hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-primary-600">{groups.find((g) => g.id === v)?.name ?? v} <span aria-hidden>×</span></Link>)}
      </div> : null}
      <div className="mt-5 min-w-0">
        <form action="/chuong-trinh" role="search" className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-card focus-within:border-primary-300">
          {Object.entries({ ...filters, q: undefined, page: undefined }).map(([k, v]) =>
            v == null || (Array.isArray(v) && v.length === 0) ? null : <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v.join(",") : String(v)} />,
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <LuSearch className="ml-2 size-4 shrink-0 text-slate-400" aria-hidden />
            <label htmlFor="s-q" className="sr-only">
              Từ khoá
            </label>
            <input id="s-q" name="q" defaultValue={filters.q} placeholder="Tên trường, ngành, mã xét tuyển…" className="h-9 min-w-0 flex-1 bg-transparent text-sm placeholder:text-slate-600 focus:outline-none" />
          </div>
          <button className={cn(buttonClass({ size: "sm" }), "shrink-0")}>Tìm</button>
        </form>
        <PersonalizedSuggestions query={filters.q} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm break-words text-slate-600">
          Tìm thấy <strong className="text-slate-900">{result.total}</strong> chương trình phù hợp
          {filters.score == null && (
            <>
              {" "}·{" "}
              <SavedScoreHint filters={filters} />
            </>
          )}
        </p>
        <OpenCompareButton />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 items-start gap-2 lg:sticky lg:top-24 lg:block">
          <FilterPanel filters={filters} combos={combos} subjects={subjects} groups={groups} />
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Sắp xếp">
            {(Object.keys(SORT_LABELS) as ProgramSort[]).map((k) => <Link key={k} href={href({ sort: k, page: undefined })} scroll={false} aria-current={sort === k ? "page" : undefined} className={cn("inline-flex min-h-11 sm:min-h-0 sm:h-9 shrink-0 items-center rounded-full border px-3 text-sm font-semibold", sort === k ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700")}>{SORT_LABELS[k]}</Link>)}
          </div>
        </div>

        <section aria-label="Kết quả tìm kiếm" className="min-w-0">
          <div className="mb-4 hidden flex-wrap items-center gap-2 lg:flex" role="tablist" aria-label="Sắp xếp">
            {(Object.keys(SORT_LABELS) as ProgramSort[]).map((k) => (
              <Link
                key={k}
                role="tab"
                aria-selected={sort === k}
                href={href({ sort: k, page: undefined })}
                scroll={false}
                className={cn(
                  "inline-flex min-h-11 sm:min-h-0 sm:h-9 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                  sort === k ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary-300",
                )}
              >
                {SORT_LABELS[k]}
              </Link>
            ))}
          </div>

          {result.total === 0 ? (
            <div className="rounded-2xl border border-slate-200 shadow-card hover:border-primary-300 bg-white">
              <EmptyState
                icon={<LuSearchX />}
                title="Không tìm thấy chương trình phù hợp"
                description="Thử nới bớt một điều kiện bên dưới, hoặc nhập lại điểm và tổ hợp của bạn."
              >
                {result.suggestions.map((s) => (
                  <Link key={s.label} href={href({ ...s.patch, page: undefined })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                    {s.label} · {s.count} kết quả
                  </Link>
                ))}
                <Link href="/chuong-trinh" className={buttonClass({ variant: "outline", size: "sm" })}>
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
                {result.items.map((v) => (
                  <ProgramCard key={v.program.id} view={v} />
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
