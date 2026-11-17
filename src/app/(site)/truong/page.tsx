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
import { SchoolHeroBanner } from "@/components/school/school-hero-banner";
import { PersonalizedSuggestions } from "@/components/search/personalized-suggestions";
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
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 min-w-0 py-6 md:py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm trường" }]} />
      <SchoolHeroBanner filters={filters} groups={groups} totalSchools={result.total} />
      <PersonalizedSuggestions query={filters.q} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm break-words text-slate-600">
          Tìm thấy <strong className="font-bold text-slate-900">{result.total}</strong> trường phù hợp
        </p>
        <OpenCompareButton />
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
