import type { Metadata } from "next";
import Link from "next/link";
import {
  LuArrowLeftRight,
  LuArrowRight,
  LuBuilding2,
  LuCalendarClock,
  LuCompass,
  LuGraduationCap,
  LuSparkles,
} from "react-icons/lu";
import { catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { MajorExplorer } from "@/components/catalog/major-explorer";
import { MajorSmartSuggester } from "@/components/catalog/major-smart-suggester";

export const metadata: Metadata = {
  title: "Khám phá ngành học | Trovio",
  description: "Khám phá nhóm ngành, tìm kiếm ngành học và danh sách các trường đại học đào tạo trên toàn quốc.",
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MajorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = sp.group || undefined;
  const q = sp.q?.trim() || undefined;

  // Lấy toàn bộ danh mục nhóm ngành & ngành học và danh mục môn học
  const [{ groups, items }, subjects] = await Promise.all([
    catalogService.getDiscoveryPage(),
    catalogService.getSubjects(),
  ]);

  const totals = groups.reduce(
    (acc, item) => ({
      majors: acc.majors + item.majorCount,
      programs: acc.programs + item.programCount,
      schools: acc.schools + item.schoolCount,
    }),
    { majors: 0, programs: 0, schools: 0 }
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-20">
      {/* Thanh định hướng & Tiêu đề trang gọn gàng */}
      <section className="border-b border-[#EBE6DC] bg-white">
        <div className="container-page py-6 sm:py-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá ngành" }]} />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF5EB] px-3 py-1 text-xs font-bold text-[#B58A3C]">
                <LuGraduationCap className="size-4" />
                <span>
                  {groups.length} nhóm ngành · {totals.majors} ngành đào tạo
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900">
                Khám phá ngành học
              </h1>
              <p className="mt-1 text-sm sm:text-base text-stone-600 max-w-2xl">
                Tìm kiếm thông tin ngành học, tìm trường đào tạo và xem tổng quan nghề nghiệp giúp bạn định hướng tương lai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Khu vực chính: Gợi ý ngành theo sở thích & thế mạnh + Bộ lọc danh mục */}
      <section className="container-page py-6 sm:py-8 space-y-10">
        <MajorSmartSuggester
          groups={groups.map((g) => g.group)}
          subjects={subjects}
        />

        <div>
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Tất cả ngành đào tạo ({totals.majors})
            </h2>
            <p className="text-sm text-stone-500">
              Tra cứu theo nhóm ngành, lọc theo tên gọi hoặc xem nhanh các trường đào tạo trực thuộc.
            </p>
          </div>
          <MajorExplorer
            groups={groups}
            items={items}
            initialGroup={group}
            initialQuery={q}
          />
        </div>

        {/* Khối điều hướng cao cấp: Bước tiếp theo sau khi chọn ngành */}
        <div className="relative mt-16 overflow-hidden rounded-3xl border border-sky-800/30 bg-gradient-to-br from-[#0a2744] via-[#0d3b66] to-[#081e33] p-8 sm:p-10 lg:p-12 text-white shadow-xl">
          {/* Họa tiết ánh sáng trang trí */}
          <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-sky-500/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 size-96 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />

          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            {/* Cột trái: Lời kêu gọi hành động định hướng */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-200">
                <LuSparkles className="size-3.5 text-amber-300" aria-hidden="true" />
                <span>Bước tiếp theo sau khi chọn ngành</span>
              </span>

              <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Đã nhắm được ngành yêu thích? Khám phá ngay các trường đào tạo hàng đầu.
              </h2>

              <p className="mt-3 text-sm sm:text-base leading-relaxed text-sky-100/80 max-w-xl">
                Cùng một ngành học nhưng mỗi trường đại học lại có thế mạnh chuyên sâu, môi trường thực tập và mức học phí khác nhau. Hãy tìm hiểu ngôi trường phù hợp nhất với bạn.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/truong"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-amber-400 px-5 sm:px-6 py-3.5 text-sm font-bold text-stone-950 shadow-md transition-all hover:bg-amber-300 hover:shadow-lg active:scale-95"
                >
                  <LuBuilding2 className="size-4.5" />
                  <span>Khám phá danh mục trường</span>
                  <LuArrowRight className="size-4" />
                </Link>

                <Link
                  href="/chuong-trinh"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-xs transition-all hover:bg-white/20 hover:border-white/30 active:scale-95"
                >
                  <LuCompass className="size-4 text-sky-200" />
                  <span>Tìm chương trình đào tạo</span>
                </Link>
              </div>
            </div>

            {/* Cột phải: 3 khối tính năng kính (Glassmorphic cards) */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 lg:grid-cols-1">
              {/* Thẻ 1: Danh mục trường */}
              <Link
                href="/truong"
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-xs transition-all hover:border-white/25 hover:bg-white/10"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 group-hover:scale-105 transition-transform">
                  <LuBuilding2 className="size-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    200+ trường đại học & học viện
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
                    Tra cứu thông tin tuyển sinh, cơ sở vật chất, địa chỉ và học phí trên toàn quốc.
                  </p>
                </div>
              </Link>

              {/* Thẻ 2: Tìm chương trình đào tạo */}
              <Link
                href="/chuong-trinh"
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-xs transition-all hover:border-white/25 hover:bg-white/10"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 group-hover:scale-105 transition-transform">
                  <LuCompass className="size-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Tìm kiếm chương trình đào tạo
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
                    Lọc theo điểm số, tổ hợp môn thi và mức học phí chi tiết.
                  </p>
                </div>
              </Link>

              {/* Thẻ 3: Mốc tuyển sinh 2026 */}
              <Link
                href="/moc-tuyen-sinh"
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-xs transition-all hover:border-white/25 hover:bg-white/10"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-105 transition-transform">
                  <LuCalendarClock className="size-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Lịch & Mốc tuyển sinh 2026
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
                    Cập nhật thời hạn nộp hồ sơ, lịch thi ĐGNL/ĐGTD và các đợt xét tuyển sớm.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
