import type { Metadata } from "next";
import Link from "next/link";
import { LuSearch, LuSearchX } from "react-icons/lu";
import { catalogService, parseProgramFilters, programService, serializeProgramFilters, SORT_LABELS, type ProgramSort } from "@/services";
import { cn } from "@/lib/cn";
import { Breadcrumb, EmptyState, Pagination } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProgramCard } from "@/components/program/program-card";
import { SavedScoreHint } from "@/components/search/saved-score-hint";
import { EstimatedTag } from "@/components/ui/estimated-tag";

export const metadata: Metadata = { title: "Tìm chương trình đào tạo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseProgramFilters(await searchParams);
  const [result, combos, subjects] = await Promise.all([programService.search(filters), catalogService.getCombos(), catalogService.getSubjects()]);
  const href = (patch: Partial<typeof filters>) => `/chuong-trinh${serializeProgramFilters({ ...filters, ...patch })}`;
  const sort = filters.sort ?? "phu-hop";

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm chương trình" }]} />
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">Tìm chương trình đào tạo đại học</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tìm thấy <strong className="text-primary-600">{result.total}</strong> chương trình phù hợp
            {filters.score == null && (
              <>
                {" "}·{" "}
                <SavedScoreHint filters={filters} />
              </>
            )}
          </p>
        </div>
        <form action="/chuong-trinh" role="search" className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
          {Object.entries({ ...filters, q: undefined, page: undefined }).map(([k, v]) =>
            v == null || (Array.isArray(v) && v.length === 0) ? null : <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v.join(",") : String(v)} />,
          )}
          <LuSearch className="ml-2 size-4 text-slate-400" aria-hidden />
          <label htmlFor="s-q" className="sr-only">
            Từ khoá
          </label>
          <input id="s-q" name="q" defaultValue={filters.q} placeholder="Tên trường, ngành, mã xét tuyển…" className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          <button className={buttonClass({ size: "sm" })}>Tìm</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel filters={filters} combos={combos} subjects={subjects} />
        </div>

        <section aria-label="Kết quả tìm kiếm">
          {filters.method && filters.method !== "thpt" && (
            <p role="note" className="mb-4 flex items-start gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-[13px] text-slate-700">
              <EstimatedTag className="mt-0.5 shrink-0" />
              <span>
                Điểm chuẩn học bạ / đánh giá năng lực trong bản demo là <strong>số ước tính</strong> suy ra từ điểm thi THPT, chưa phải điểm trường công bố. Chỉ dùng để thử tính năng — hãy đối chiếu đề án tuyển sinh của trường.
              </span>
            </p>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Sắp xếp">
            {(Object.keys(SORT_LABELS) as ProgramSort[]).map((k) => (
              <Link
                key={k}
                role="tab"
                aria-selected={sort === k}
                href={href({ sort: k, page: undefined })}
                scroll={false}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                  sort === k ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-primary-200",
                )}
              >
                {SORT_LABELS[k]}
              </Link>
            ))}
          </div>

          {result.total === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
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
  );
}
