import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LuBookOpen, LuFilterX, LuLayers3 } from "react-icons/lu";
import { catalogService } from "@/services";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Breadcrumb, EmptyState, Pagination } from "@/components/ui/misc";
import { MajorSchoolSearch } from "@/components/catalog/major-school-search";
import { MajorGroupCard } from "@/components/catalog/major-group-card";
import { MajorCard } from "@/components/catalog/major-card";

export const metadata: Metadata = {
  title: "Khám phá ngành học",
  description: "Khám phá nhóm ngành, ngành học và chương trình đào tạo theo một danh mục rõ ràng, có số liệu.",
};

const LETTERS = ["A", "B", "C", "D", "Đ", "E", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "X", "Y"];
const PAGE_SIZE = 24;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MajorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = sp.group || undefined;
  const q = sp.q?.trim() || undefined;
  const letter = sp.letter || undefined;
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { groups, items, schools } = await catalogService.getDiscoveryPage({ group, q, letter });
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const visibleItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeGroup = groups.find((item) => item.group.id === group);
  const totals = groups.reduce(
    (acc, item) => ({ majors: acc.majors + item.majorCount, programs: acc.programs + item.programCount }),
    { majors: 0, programs: 0 },
  );
  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries({ group, q, letter, ...patch }).filter(([, value]) => value) as [string, string][]);
    const query = params.toString();
    return query ? `/nganh?${query}#danh-sach` : "/nganh#danh-sach";
  };

  return (
    <>
      <section className="relative isolate overflow-hidden bg-slate-950">
        <Image
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2000&q=75"
          alt="Sân trường đại học mùa tuyển sinh"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent" />
        <div className="container-page relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <Breadcrumb inverse items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành" }]} />
            <p className="mt-6 inline-flex items-center gap-2 bg-accent-500 px-3 py-1 text-[13px] font-black text-slate-900">
              <LuLayers3 className="size-4" aria-hidden /> {groups.length} nhóm · {totals.majors.toLocaleString("vi-VN")} ngành · {totals.programs.toLocaleString("vi-VN")} chương trình
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1.02] font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Tìm ngành từ bức tranh lớn đến lựa chọn cụ thể.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Bắt đầu bằng một nhóm bạn quan tâm, lọc theo tên hoặc mã ngành, rồi xem các chương trình đang được đào tạo.
            </p>
            <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl sm:p-4">
              <MajorSchoolSearch
                defaultQuery={q}
                schools={schools.map((school) => ({
                  id: school.id,
                  slug: school.slug,
                  name: school.name,
                  shortName: school.shortName,
                  code: school.code,
                  logoUrl: school.logoUrl,
                  city: school.city,
                  region: school.region,
                  type: school.type,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white" aria-labelledby="nhom-nganh">
        <div className="container-page py-12 lg:py-16">
          <div className="flex flex-col gap-4 border-b-2 border-slate-950 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.16em] text-primary-700 uppercase">Bước 1 · Chọn phạm vi</p>
              <h2 id="nhom-nganh" className="mt-2 text-3xl leading-tight font-black tracking-tight text-slate-950 md:text-4xl">
                Khám phá theo nhóm ngành
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                Mỗi nhóm gom các ngành có nền tảng học tập và hướng nghề nghiệp gần nhau. Số liệu được tính trực tiếp từ danh mục đang công khai.
              </p>
            </div>
            {activeGroup ? (
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border-2 border-slate-950 bg-accent-50 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Đang xem</p>
                  <p className="mt-1 font-black text-slate-950">{activeGroup.group.name}</p>
                </div>
                <Link href="/nganh#danh-sach" className="min-h-10 text-sm font-bold text-primary-700 hover:underline">
                  Bỏ chọn
                </Link>
              </div>
            ) : null}
          </div>
          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((summary, index) => (
              <MajorGroupCard
                key={summary.group.id}
                summary={summary}
                index={index}
                selected={group === summary.group.id}
                href={qs({ group: group === summary.group.id ? undefined : summary.group.id, letter: undefined })}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="danh-sach" className="container-page py-12 lg:py-16" aria-labelledby="tat-ca-nganh">
        <div className="flex flex-col gap-4 border-b-2 border-slate-950 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-primary-700 uppercase">Bước 2 · Thu hẹp lựa chọn</p>
            <h2 id="tat-ca-nganh" className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {activeGroup ? activeGroup.group.name : "Danh sách ngành đào tạo"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {items.length.toLocaleString("vi-VN")} kết quả{q ? ` khớp “${q}”` : ""}{letter ? ` bắt đầu bằng “${letter}”` : ""}.
            </p>
          </div>
          {group || q || letter ? (
            <Link href="/nganh#danh-sach" className={buttonClass({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}>
              <LuFilterX className="size-4" aria-hidden /> Xóa bộ lọc
            </Link>
          ) : null}
        </div>

        <nav aria-label="Lọc ngành theo chữ cái" className="mt-6 rounded-3xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="px-1 pb-3 text-xs font-bold text-slate-500 uppercase">Tên ngành bắt đầu bằng</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={qs({ letter: undefined })}
              className={cn("flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-bold", !letter ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
            >
              Tất cả
            </Link>
            {LETTERS.map((value) => (
              <Link
                key={value}
                href={qs({ letter: value })}
                aria-current={letter === value ? "true" : undefined}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-sm font-bold",
                  letter === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {value}
              </Link>
            ))}
          </div>
        </nav>

        {items.length === 0 ? (
          <div className="mt-6 rounded-3xl border-2 border-slate-950 bg-white">
            <EmptyState icon={<LuBookOpen />} title="Chưa có ngành phù hợp" description="Thử từ khóa khác, chọn chữ cái khác hoặc xóa bớt bộ lọc.">
              <Link href="/nganh#danh-sach" className={buttonClass({ variant: "outline", size: "sm" })}>
                Xem tất cả ngành
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => <MajorCard key={item.major.id} item={item} />)}
          </div>
        )}
        {items.length > PAGE_SIZE ? (
          <div className="mt-8">
            <Pagination page={page} pageCount={pageCount} hrefFor={(value) => qs({ page: String(value) })} />
          </div>
        ) : null}

        <div className="mt-14 grid gap-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <h2 className="max-w-xl text-2xl leading-tight font-black tracking-tight">Danh mục giúp bạn hiểu lựa chọn. Điểm số giúp bạn biết lựa chọn nào vừa sức.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Lưu hồ sơ điểm một lần để Trovio phân nhóm chương trình An toàn, Vừa sức và Thử sức.</p>
          </div>
          <Link href="/diem-cua-toi" className={buttonClass({ variant: "accent", size: "lg", className: "w-full md:w-auto" })}>
            Nhập điểm xét tuyển
          </Link>
        </div>
      </section>
    </>
  );
}
