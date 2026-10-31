"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuBookOpen,
  LuBuilding2,
  LuCalendarCheck,
  LuCheck,
  LuCoins,
  LuCompass,
  LuExternalLink,
  LuFilter,
  LuGraduationCap,
  LuHeart,
  LuInfo,
  LuLayers,
  LuMapPin,
  LuScale,
  LuSearch,
  LuShare2,
  LuSparkles,
  LuTrendingUp,
  LuUsers,
  LuX,
} from "react-icons/lu";
import type { School } from "@/domain/types";
import type { ProgramView } from "@/services/program.service";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { formatNumber, formatScore, formatTuition, hasTuitionData } from "@/lib/format";
import { SchoolLogo } from "@/components/school/school-logo";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

interface SchoolDetailViewProps {
  school: School;
  programs: ProgramView[];
}

type TabKey = "programs" | "overview" | "admission" | "tuition";

export function SchoolDetailView({ school, programs }: SchoolDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("programs");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const searchInputId = useId();

  const { isSaved, toggleSaved, hydrated } = useTrovio();
  const toast = useToast();
  const schoolSaved = hydrated && isSaved(`school:${school.id}`);

  const handleToggleSaveSchool = () => {
    const added = toggleSaved(`school:${school.id}`);
    toast(added ? `Đã lưu trường ${school.name}` : `Đã bỏ lưu trường ${school.name}`, "success");
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast("Đã sao chép liên kết trường vào bộ nhớ tạm", "success");
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast("Không thể sao chép liên kết", "error");
      }
    }
  };

  // Trích xuất danh sách các nhóm ngành có mặt tại trường
  const majorGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const p of programs) {
      const gId = p.major.groupId || "khac";
      const gName = p.major.name ? p.major.groupId : "Khác";
      if (!map.has(gId)) {
        map.set(gId, { id: gId, name: p.major.groupId, count: 0 });
      }
      map.get(gId)!.count += 1;
    }
    return Array.from(map.values());
  }, [programs]);

  // Trích xuất các phương thức xét tuyển
  const admissionMethods = useMemo(() => {
    const methodsMap = new Map<string, { name: string; desc: string }>();
    for (const p of programs) {
      for (const m of p.program.methods || []) {
        if (!methodsMap.has(m.name)) {
          methodsMap.set(m.name, {
            name: m.name,
            desc: m.desc ? m.desc.replace(/ Điểm chuẩn 2025.*$/, "") : "Phương thức xét tuyển áp dụng cho năm 2026.",
          });
        }
      }
    }
    return Array.from(methodsMap.values());
  }, [programs]);

  // Tính toán khung học phí
  const tuitionPrograms = useMemo(() => {
    return programs.filter(({ program }) => hasTuitionData(program.tuitionMin, program.tuitionMax));
  }, [programs]);

  const minTuition = tuitionPrograms.length > 0 ? Math.min(...tuitionPrograms.map((p) => p.program.tuitionMin)) : null;
  const maxTuition = tuitionPrograms.length > 0 ? Math.max(...tuitionPrograms.map((p) => p.program.tuitionMax)) : null;

  // Lọc chương trình đào tạo
  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return programs.filter(({ program, major }) => {
      if (selectedGroup !== "all" && major.groupId !== selectedGroup) return false;
      if (!q) return true;
      const name = program.name.toLowerCase();
      const code = (program.admissionCode || "").toLowerCase();
      const majorName = major.name.toLowerCase();
      const combos = (program.combos || []).join(" ").toLowerCase();
      return name.includes(q) || code.includes(q) || majorName.includes(q) || combos.includes(q);
    });
  }, [programs, searchQuery, selectedGroup]);

  const schoolType = SCHOOL_TYPE_LABELS[school.type] || "Đại học Công lập";
  const regionLabel = REGION_LABELS[school.region] || "Toàn quốc";

  return (
    <div className="w-full">
      {/* ======================================================== */}
      {/* 1. HERO BANNER: THÔNG TIN TỔNG QUAN VỀ TRƯỜNG */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-[#E8E2D5] bg-white shadow-xs">
        {/* Ảnh nền bìa trường học */}
        <div className="relative h-44 sm:h-56 lg:h-64 w-full overflow-hidden bg-gradient-to-r from-[#0a2744] via-[#0d3b66] to-[#081e33]">
          {school.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.coverUrl}
              alt={`Ảnh khuôn viên ${school.name}`}
              className="h-full w-full object-cover opacity-35"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
          )}
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Khối thông tin trung tâm trường học */}
        <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20">
            {/* Logo trường */}
            <div className="flex items-end gap-4 sm:gap-5">
              <div className="relative flex size-24 sm:size-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white p-1 shadow-md">
                <SchoolLogo school={school} size="lg" priority className="size-full rounded-xl" />
              </div>

              <div className="pt-2 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-stone-900 px-2.5 py-0.5 text-xs font-bold text-amber-300 tracking-wide uppercase">
                    Mã: {school.code}
                  </span>
                  <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                    {schoolType}
                  </span>
                  <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                    {school.city || regionLabel}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900">
                  {school.name}
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-stone-500">
                  Tên viết tắt: <span className="text-stone-800">{school.shortName}</span>
                  {school.founded ? ` · Thành lập năm ${school.founded}` : ""}
                </p>
              </div>
            </div>

            {/* Các nút hành động nhanh */}
            <div className="flex flex-wrap items-center gap-2.5 sm:self-end">
              {school.website ? (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-stone-800 shadow-xs transition-colors hover:bg-stone-50 hover:border-stone-400"
                >
                  <LuExternalLink className="size-4 text-stone-500" />
                  <span>Cổng tuyển sinh</span>
                </a>
              ) : null}

              <button
                type="button"
                onClick={handleToggleSaveSchool}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer",
                  schoolSaved
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                )}
              >
                <LuHeart className={cn("size-4", schoolSaved && "fill-current text-rose-500")} />
                <span>{schoolSaved ? "Đã lưu trường" : "Lưu trường"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                title="Sao chép liên kết"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 shadow-xs hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
              >
                {copied ? <LuCheck className="size-4.5 text-emerald-600" /> : <LuShare2 className="size-4.5" />}
              </button>
            </div>
          </div>

          {/* Dải 4 chỉ số nổi bật của trường */}
          <div className="mt-8 grid grid-cols-2 gap-3 border-t border-stone-100 pt-6 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <LuGraduationCap className="size-4 text-[#00629B]" />
                <span>Chương trình đào tạo</span>
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-black text-stone-900">
                {programs.length} <span className="text-xs font-bold text-stone-500">ngành</span>
              </p>
            </div>

            <div className="rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <LuUsers className="size-4 text-emerald-600" />
                <span>Quy mô sinh viên</span>
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-black text-stone-900">
                {school.students ? `${formatNumber(school.students)}+` : "Đang cập nhật"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <LuCoins className="size-4 text-amber-600" />
                <span>Mức học phí/năm</span>
              </div>
              <p className="mt-1.5 text-lg sm:text-xl font-black text-stone-900 truncate">
                {minTuition !== null && maxTuition !== null
                  ? formatTuition(minTuition, maxTuition)
                  : "Theo đề án"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#EDE8DF] bg-[#FAF8F5] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <LuMapPin className="size-4 text-rose-500" />
                <span>Cơ sở đào tạo</span>
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl font-black text-stone-900">
                {school.campuses && school.campuses.length > 0 ? `${school.campuses.length} cơ sở` : school.city}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. THANH CHUYỂN TAB ĐIỀU HƯỚNG CHI TIẾT */}
      {/* ======================================================== */}
      <nav aria-label="Điều hướng chi tiết trường học" className="mt-8 flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {[
          { key: "programs", label: `Chương trình đào tạo (${programs.length})`, icon: LuGraduationCap },
          { key: "overview", label: "Giới thiệu & Cơ sở", icon: LuBuilding2 },
          { key: "admission", label: `Phương thức tuyển sinh (${admissionMethods.length})`, icon: LuCalendarCheck },
          { key: "tuition", label: "Học phí & Học bổng", icon: LuCoins },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer",
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <Icon className={cn("size-4", isActive ? "text-amber-300" : "text-stone-400")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ======================================================== */}
      {/* 3. NỘI DUNG TỪNG TAB */}
      {/* ======================================================== */}

      {/* --- TAB 1: CHƯƠNG TRÌNH ĐÀO TẠO & ĐIỂM CHUẨN --- */}
      {activeTab === "programs" ? (
        <section aria-labelledby="heading-programs" className="mt-6 space-y-6">
          <h2 id="heading-programs" className="sr-only">Danh sách chương trình đào tạo và điểm chuẩn</h2>
          {/* Thanh tìm kiếm & lọc chương trình bên trong trường */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EDE8DF] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <label htmlFor={searchInputId} className="sr-only">
                Tìm kiếm chương trình hoặc mã ngành
              </label>
              <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên ngành, mã xét tuyển (vd: 7480201), tổ hợp (vd: A00)..."
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] py-2.5 pl-10 pr-9 text-sm text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <LuX className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                Hiển thị <strong className="text-stone-900">{filteredPrograms.length}</strong> / {programs.length} chương trình
              </span>
            </div>
          </div>

          {/* Danh sách thẻ chương trình */}
          {filteredPrograms.length === 0 ? (
            <div className="rounded-2xl border border-[#EDE8DF] bg-white p-12 text-center shadow-xs">
              <LuGraduationCap className="mx-auto size-12 text-stone-400" />
              <h3 className="mt-3 text-base font-bold text-stone-900">Không tìm thấy chương trình phù hợp</h3>
              <p className="mt-1 text-sm text-stone-500">
                Thử xóa từ khóa tìm kiếm để xem tất cả các chương trình đào tạo của trường.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
              >
                Xóa từ khóa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPrograms.map(({ program, major, latestCutoff }) => {
                const cutoffs = program.cutoffs || [];
                const cutoff2025 = cutoffs.find((c) => c.year === 2025)?.score ?? cutoffs[0]?.score;
                const cutoff2024 = cutoffs.find((c) => c.year === 2024)?.score ?? cutoffs[1]?.score;

                return (
                  <article
                    key={program.id}
                    className="group rounded-2xl border border-[#EDE8DF] bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-stone-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Cột thông tin tên ngành & mã */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-bold text-stone-700">
                            {program.admissionCode || "Mã đang cập nhật"}
                          </span>
                          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800">
                            {program.trainingType || "Chương trình chuẩn"}
                          </span>
                          {major.name ? (
                            <Link
                              href={`/nganh/${major.slug}`}
                              className="text-xs font-semibold text-stone-500 hover:text-[#00629B] hover:underline"
                            >
                              Nhóm: {major.name}
                            </Link>
                          ) : null}
                        </div>

                        <h3 className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-stone-900 group-hover:text-[#00629B] transition-colors">
                          <Link href={`/chuong-trinh/${program.slug}`}>
                            {program.name}
                          </Link>
                        </h3>

                        {/* Tổ hợp xét tuyển */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold text-stone-500">Tổ hợp môn:</span>
                          {program.combos && program.combos.length > 0 ? (
                            program.combos.map((cb) => (
                              <span
                                key={cb}
                                className="rounded-md border border-stone-200 bg-[#FAF8F5] px-2 py-0.5 font-mono font-bold text-stone-800"
                              >
                                {cb}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-400">Xét học bạ / ĐGNL</span>
                          )}
                        </div>
                      </div>

                      {/* Cột số liệu điểm chuẩn & học phí */}
                      <div className="flex flex-wrap items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                        {/* Điểm chuẩn 2025 */}
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                            Điểm chuẩn 2025
                          </span>
                          <p className="text-xl sm:text-2xl font-black text-[#00629B]">
                            {formatScore(cutoff2025)}
                          </p>
                          {cutoff2024 ? (
                            <p className="text-xs text-stone-400">
                              2024: <span className="font-semibold text-stone-600">{formatScore(cutoff2024)}</span>
                            </p>
                          ) : null}
                        </div>

                        {/* Học phí */}
                        <div className="text-left sm:text-right text-xs">
                          <span className="text-stone-400">Học phí: </span>
                          <span className="font-bold text-stone-700">
                            {formatTuition(program.tuitionMin, program.tuitionMax)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dòng hành động phía dưới */}
                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                      <div className="text-xs text-stone-500">
                        {program.durationYears ? `Thời gian đào tạo: ${program.durationYears} năm` : "Bằng cử nhân / kỹ sư"}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/chuong-trinh/${program.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#00629B]"
                        >
                          <span>Chi tiết chương trình</span>
                          <LuArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* --- TAB 2: TỔNG QUAN & CƠ SỞ ĐÀO TẠO --- */}
      {activeTab === "overview" ? (
        <section aria-labelledby="heading-overview" className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <h2 id="heading-overview" className="sr-only">Tổng quan trường và cơ sở đào tạo</h2>
          {/* Cột trái: Mô tả và thế mạnh trường */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <LuBuilding2 className="size-5 text-[#00629B]" />
                <span>Giới thiệu về trường</span>
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-stone-700 whitespace-pre-line">
                {school.description || `${school.name} là một trong những cơ sở giáo dục đại học uy tín hàng đầu tại Việt Nam, sở hữu đội ngũ giảng viên giàu kinh nghiệm, môi trường học thuật tiên tiến và mối quan hệ chặt chẽ với các doanh nghiệp trong và ngoài nước.`}
              </p>

              {school.highlight ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                    <LuSparkles className="size-4 text-amber-600" />
                    <span>Điểm nổi bật & Thế mạnh đào tạo</span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base font-semibold leading-relaxed text-amber-950">
                    {school.highlight}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Thông tin website & cổng tuyển sinh */}
            <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <LuCompass className="size-5 text-emerald-600" />
                <span>Kênh thông tin chính thức</span>
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="text-stone-500">Website tuyển sinh:</span>
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-bold text-[#00629B] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{school.website ? school.website.replace("https://", "") : "Đang cập nhật"}</span>
                    <LuArrowUpRight className="size-4" />
                  </a>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="text-stone-500">Mã trường quy ước:</span>
                  <span className="font-mono font-bold text-stone-900">{school.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Khu vực địa lý:</span>
                  <span className="font-bold text-stone-900">{regionLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách cơ sở đào tạo */}
          <div>
            <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-7 shadow-xs">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <LuMapPin className="size-5 text-rose-500" />
                <span>Hệ thống cơ sở đào tạo</span>
              </h3>

              <div className="mt-4 space-y-3">
                {school.campuses && school.campuses.length > 0 ? (
                  school.campuses.map((campus, idx) => (
                    <div
                      key={campus}
                      className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-4 transition-colors hover:border-stone-300"
                    >
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                        {idx === 0 ? "Trụ sở chính" : `Cơ sở đào tạo ${idx + 1}`}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-snug text-stone-900">
                        {campus}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.name} ${campus}`)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#00629B] hover:underline"
                      >
                        <LuMapPin className="size-3.5" />
                        <span>Xem bản đồ đường đi</span>
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
                    Địa chỉ tại thành phố {school.city}. Vui lòng tham khảo đề án tuyển sinh chính thức để biết các điểm học tập cụ thể.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* --- TAB 3: PHƯƠNG THỨC XÉT TUYỂN --- */}
      {activeTab === "admission" ? (
        <section aria-labelledby="heading-admission" className="mt-6 space-y-6">
          <h2 id="heading-admission" className="sr-only">Phương thức xét tuyển áp dụng</h2>
          <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <LuCalendarCheck className="size-5 text-[#00629B]" />
              <span>Các phương thức xét tuyển tuyển sinh 2026</span>
            </h3>
            <p className="mt-2 text-sm text-stone-600 max-w-3xl">
              Trường áp dụng nhiều phương thức xét tuyển độc lập nhằm tạo điều kiện thuận lợi nhất cho thí sinh phát huy thế mạnh năng lực bản thân.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {admissionMethods.map((method, index) => (
                <div
                  key={method.name}
                  className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-5 transition-all hover:border-stone-300 hover:shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-xs font-black text-amber-300">
                      {index + 1}
                    </span>
                    <h4 className="text-base font-bold text-stone-900 leading-snug">
                      {method.name}
                    </h4>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {method.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* --- TAB 4: HỌC PHÍ & HỌC BỔNG --- */}
      {activeTab === "tuition" ? (
        <section aria-labelledby="heading-tuition" className="mt-6 space-y-6">
          <h2 id="heading-tuition" className="sr-only">Học phí và chính sách học bổng</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Khung học phí */}
            <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <LuCoins className="size-5 text-amber-600" />
                <span>Khung học phí tham khảo</span>
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                Mức thu học phí được tính theo tín chỉ hoặc theo năm học, tuỳ thuộc vào chương trình chuẩn, chương trình chất lượng cao hay chương trình liên kết.
              </p>

              <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-50 to-[#FAF8F5] border border-amber-200/80 p-5">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Học phí dao động
                </span>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-stone-900">
                  {minTuition !== null && maxTuition !== null
                    ? `${minTuition} – ${maxTuition} triệu VNĐ / năm`
                    : "Đang cập nhật theo đề án mới nhất"}
                </p>
                <p className="mt-2 text-xs text-stone-600">
                  Lưu ý: Học phí có thể điều chỉnh tăng hàng năm theo quy định của Nhà nước (không quá 10–12%/năm).
                </p>
              </div>
            </div>

            {/* Chính sách học bổng */}
            <div className="rounded-3xl border border-[#EDE8DF] bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <LuSparkles className="size-5 text-emerald-600" />
                <span>Chính sách học bổng & Hỗ trợ tài chính</span>
              </h3>

              <div className="mt-4 text-sm leading-relaxed text-stone-700 whitespace-pre-line">
                {school.scholarships ? (
                  <p>{school.scholarships}</p>
                ) : (
                  <div className="space-y-3">
                    <p>
                      Nhà trường duy trì nhiều quỹ học bổng khuyến khích học tập dành cho sinh viên có thành tích xuất sắc trong kỳ thi tuyển sinh và quá trình rèn luyện:
                    </p>
                    <ul className="space-y-2 list-disc pl-5 text-stone-600">
                      <li><strong>Học bổng Thủ khoa & Á khoa:</strong> Miễn 100% học phí năm học đầu tiên.</li>
                      <li><strong>Học bổng Khuyến khích học tập:</strong> Xét theo kết quả từng học kỳ (loại Xuất sắc, Giỏi, Khá).</li>
                      <li><strong>Học bổng Doanh nghiệp tài trợ:</strong> Cơ hội nhận tài trợ và cam kết thực tập từ các tập đoàn đối tác.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Chú thích tính chính xác của dữ liệu */}
      <div className="mt-10 flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-[#FAF8F5] p-4 text-xs text-stone-500">
        <LuInfo className="mt-0.5 size-4 shrink-0 text-stone-400" />
        <p>
          Dữ liệu tuyển sinh, chỉ tiêu, điểm chuẩn và học phí được Trovio tổng hợp từ đề án tuyển sinh chính thức được công bố của {school.name}. Thí sinh nên đối chiếu lại tại cổng tuyển sinh chính thức của trường trước khi hoàn thiện hồ sơ đăng ký nguyện vọng.
        </p>
      </div>
    </div>
  );
}
