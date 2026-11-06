"use client";

import { useId } from "react";
import Link from "next/link";
import {
  LuArrowLeftRight,
  LuBuilding2,
  LuCheck,
  LuCoins,
  LuExternalLink,
  LuFilter,
  LuGraduationCap,
  LuHeart,
  LuHistory,
  LuInfo,
  LuLayers,
  LuMapPin,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuTrendingUp,
  LuUsers,
  LuX,
} from "react-icons/lu";
import type { Region, School } from "@/domain/types";
import type { SchoolCompareItem } from "@/models/dtos";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { formatNumber, formatTuition, hasTuitionData } from "@/lib/format";
import { SchoolLogo } from "@/components/school/school-logo";
import { SchoolCutoffChart } from "./school-cutoff-chart";
import { MAX_COMPARE } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useSchoolCompare } from "./use-school-compare";

export interface SchoolCompareViewProps {
  initialSchools?: School[];
}

const schoolToneStyles = [
  {
    box: "bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 shadow-2xs",
    header: "border-t-4 border-t-emerald-500",
    badge: "bg-emerald-100 border border-emerald-300 text-emerald-950 font-black",
    dot: "bg-emerald-500",
    name: "Trường 1 (Xanh ngọc)",
  },
  {
    box: "bg-amber-50/80 border border-amber-200/90 text-amber-950 shadow-2xs",
    header: "border-t-4 border-t-amber-500",
    badge: "bg-amber-100 border border-amber-300 text-amber-950 font-black",
    dot: "bg-amber-500",
    name: "Trường 2 (Hổ phách)",
  },
  {
    box: "bg-sky-50/80 border border-sky-200/90 text-sky-950 shadow-2xs",
    header: "border-t-4 border-t-sky-500",
    badge: "bg-sky-100 border border-sky-300 text-sky-950 font-black",
    dot: "bg-sky-500",
    name: "Trường 3 (Xanh da trời)",
  },
  {
    box: "bg-purple-50/80 border border-purple-200/90 text-purple-950 shadow-2xs",
    header: "border-t-4 border-t-purple-500",
    badge: "bg-purple-100 border border-purple-300 text-purple-950 font-black",
    dot: "bg-purple-500",
    name: "Trường 4 (Tím)",
  },
];

export function SchoolCompareView({ initialSchools = [] }: SchoolCompareViewProps) {
  const searchInputId = useId();
  const {
    selectedIds,
    items,
    loading,
    searchQuery,
    setSearchQuery,
    searchRegion,
    setSearchRegion,
    searchResults,
    searching,
    isAddOpen,
    setIsAddOpen,
    selectedChartMajorId,
    setSelectedChartMajorId,
    handleAddSchool,
    handleRemoveSchool,
    handleToggleFavorite,
    handleClearAll,
    commonMajors,
    isSaved,
    hydrated,
  } = useSchoolCompare({ initialSchools });

  return (
    <div className="space-y-8">
      {/* 1. Thanh chọn trường & Quản lý số lượng (2 - 4 trường) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              <LuArrowLeftRight className="size-3.5" />
              <span>
                Đang so sánh: {selectedIds.length} / {MAX_COMPARE} trường đại học
              </span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Bàn cân so sánh trường đại học
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-stone-500">
              Đặt cạnh nhau từ 2 đến 4 trường để đối chiếu địa điểm, học phí, phương thức xét tuyển và xu hướng điểm chuẩn qua các năm.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length < MAX_COMPARE && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:bg-stone-800 active:scale-95"
              >
                <LuPlus className="size-4" />
                <span>Thêm trường so sánh</span>
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                <LuTrash2 className="size-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách chip các trường đang chọn */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-stone-100 pt-4">
          <span className="text-xs font-semibold text-stone-400">Các trường đã chọn:</span>
          {items.map((item) => (
            <div
              key={item.school.id}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800"
            >
              <SchoolLogo school={item.school} size="sm" />
              <span>{item.school.shortName || item.school.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveSchool(item.school.id, item.school.shortName || item.school.name)}
                className="rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                title="Bỏ trường này"
              >
                <LuX className="size-3.5" />
              </button>
            </div>
          ))}

          {selectedIds.length < 2 && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
              * Vui lòng chọn thêm ít nhất {2 - selectedIds.length} trường để bắt đầu so sánh
            </span>
          )}
        </div>
      </div>

      {/* 2. Modal tìm & thêm trường so sánh */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Thêm trường đại học vào so sánh
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tìm kiếm theo tên trường, khu vực hoặc ngành đào tạo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <LuX className="size-5" />
              </button>
            </div>

            {/* Thanh tìm kiếm & Lọc khu vực */}
            <div className="mt-4 space-y-3">
              <div className="relative">
                <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-stone-400" />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên trường, mã trường, hoặc ngành đào tạo (VD: Bách Khoa, CNTT, Luật)..."
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-3 text-sm focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-stone-100"
                  autoFocus
                />
              </div>

              {/* Lọc nhanh theo khu vực */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-stone-400 mr-1">Khu vực:</span>
                {(["all", "bac", "trung", "nam"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSearchRegion(r)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-semibold transition-all",
                      searchRegion === r
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    )}
                  >
                    {r === "all" ? "Tất cả khu vực" : REGION_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách kết quả trường */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {searching ? (
                <div className="py-12 text-center text-sm text-stone-400">Đang tìm kiếm trường...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-500">
                  Không tìm thấy trường nào phù hợp với từ khóa này.
                </div>
              ) : (
                searchResults.map((school) => {
                  const isSelected = selectedIds.includes(school.id);
                  return (
                    <div
                      key={school.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all",
                        isSelected
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-stone-200 hover:border-stone-400 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SchoolLogo school={school} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 truncate">
                            {school.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {school.city || "Toàn quốc"} · {SCHOOL_TYPE_LABELS[school.type]}
                            {school.code ? ` · Mã: ${school.code}` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSchool(school)}
                        disabled={isSelected}
                        className={cn(
                          "shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                          isSelected
                            ? "bg-emerald-600 text-white cursor-default"
                            : "bg-stone-900 text-white hover:bg-stone-800 active:scale-95"
                        )}
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1">
                            <LuCheck className="size-3.5" /> Đã chọn
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <LuPlus className="size-3.5" /> Chọn so sánh
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Bảng so sánh 2 - 4 trường */}
      {selectedIds.length < 2 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/80 p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-700 shadow-xs">
            <LuArrowLeftRight className="size-6 text-stone-500" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-stone-900">
            Chưa đủ số lượng trường để so sánh
          </h3>
          <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
            Hệ thống hỗ trợ so sánh từ 2 đến 4 trường đại học. Vui lòng bấm &ldquo;Thêm trường so sánh&rdquo; để đặt các trường cạnh nhau.
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-stone-800"
          >
            <LuPlus className="size-4" />
            <span>Thêm trường vào so sánh ngay</span>
          </button>
        </div>
      ) : loading ? (
        <div className="h-96 animate-pulse rounded-3xl bg-stone-100" />
      ) : (
        <div className="space-y-8">
          {/* A. THẺ TỔNG QUAN TỪNG TRƯỜNG TRÊN ĐẦU */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item, idx) => {
              const sSaved = hydrated && isSaved(`school:${item.school.id}`);
              const tone = schoolToneStyles[idx % schoolToneStyles.length];
              return (
                <div
                  key={item.school.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition-colors",
                    tone.header
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <SchoolLogo school={item.school} size="md" />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item.school.id, item.school.shortName || item.school.name)}
                          className={cn(
                            "rounded-lg p-2 transition-colors",
                            sSaved ? "text-rose-500 bg-rose-50" : "text-stone-400 hover:bg-stone-100"
                          )}
                          title="Lưu trường yêu thích"
                        >
                          <LuHeart className={cn("size-4", sSaved && "fill-rose-500")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSchool(item.school.id, item.school.shortName || item.school.name)}
                          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                          title="Xóa trường khỏi so sánh"
                        >
                          <LuX className="size-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 text-base sm:text-lg font-black text-stone-900 leading-snug">
                      <Link href={`/truong/${item.school.slug}`} className="hover:text-primary-700 hover:underline">
                        {item.school.name}
                      </Link>
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                      <span className="font-bold text-stone-700">Mã: {item.school.code || "—"}</span>
                      <span>·</span>
                      <span>{SCHOOL_TYPE_LABELS[item.school.type]}</span>
                    </div>

                    {item.school.highlight ? (
                      <p className="mt-2 text-xs text-stone-600 line-clamp-2">
                        {item.school.highlight}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <Link
                      href={`/truong/${item.school.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:underline"
                    >
                      <span>Xem chi tiết trường</span>
                      <LuExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* B. KHỐI BIỂU ĐỒ ĐIỂM CHUẨN QUA CÁC NĂM (2023 - 2025) */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                  <LuTrendingUp className="size-5 text-primary-600" />
                  Biểu đồ so sánh điểm chuẩn qua các năm
                </h3>
                <p className="text-xs text-stone-500">
                  Xu hướng biến động điểm chuẩn 3 năm gần nhất của các trường được chọn.
                </p>
              </div>

              {/* Bộ chọn so sánh: Toàn trường vs Ngành cụ thể */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">Chế độ xem:</span>
                <select
                  value={selectedChartMajorId}
                  onChange={(e) => setSelectedChartMajorId(e.target.value)}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 shadow-2xs focus:border-stone-900 focus:outline-none"
                >
                  <option value="">Điểm chuẩn trung bình toàn trường</option>
                  {commonMajors.map((m) => (
                    <option key={m.id} value={m.id}>
                      Ngành: {m.name} ({m.count}/{items.length} trường đào tạo)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SchoolCutoffChart
              schools={items}
              selectedMajorId={selectedChartMajorId || undefined}
            />
          </div>

          {/* C. BẢNG SO SÁNH MA TRẬN CÁC TIÊU CHÍ CHI TIẾT */}
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-6 py-4">
              <h3 className="text-base font-bold text-stone-900">
                Ma trận so sánh chi tiết các tiêu chí
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                <span className="font-bold text-stone-800">Màu đối chiếu khi khác biệt:</span>
                {items.map((it, i) => {
                  const t = schoolToneStyles[i % schoolToneStyles.length];
                  return (
                    <span key={it.school.id} className="inline-flex items-center gap-1.5 font-semibold">
                      <span className={cn("size-2.5 rounded-full", t.dot)} />
                      <span>{it.school.shortName || it.school.code}: {it.school.name.slice(0, 22)}...</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-stone-200 text-sm">
              {/* Tiêu chí 1: Địa điểm & Khu vực */}
              {(() => {
                const isDiff = new Set(items.map((it) => `${it.school.city || ""}_${it.school.region || ""}`)).size > 1;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] p-5 gap-4">
                    <div className="font-bold text-stone-700 flex items-center justify-between md:flex-col md:items-start gap-1">
                      <div className="flex items-center gap-2">
                        <LuMapPin className="size-4 text-stone-400" />
                        <span>Địa điểm & Khu vực</span>
                      </div>
                      {isDiff && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-extrabold text-stone-700">
                          Khác biệt
                        </span>
                      )}
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    >
                      {items.map((item, colIdx) => {
                        const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                        return (
                          <div
                            key={item.school.id}
                            className={cn(
                              "space-y-1 rounded-xl p-3 transition-colors",
                              isDiff ? tone.box : ""
                            )}
                          >
                            <p className="font-bold text-stone-900">{item.school.city || "Toàn quốc"}</p>
                            <p className="text-xs text-stone-500">{REGION_LABELS[item.school.region]}</p>
                            {item.school.campuses && item.school.campuses.length > 0 && (
                              <div className="mt-2 text-xs text-stone-600 space-y-0.5">
                                <p className="font-semibold text-stone-400">Cơ sở đào tạo:</p>
                                {item.school.campuses.map((c, i) => (
                                  <p key={i}>• {c}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tiêu chí 2: Học phí & Tài chính */}
              {(() => {
                const isDiff = new Set(items.map((it) => `${it.tuitionMin}_${it.tuitionMax}`)).size > 1;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] p-5 gap-4 bg-stone-50/40">
                    <div className="font-bold text-stone-700 flex items-center justify-between md:flex-col md:items-start gap-1">
                      <div className="flex items-center gap-2">
                        <LuCoins className="size-4 text-stone-400" />
                        <span>Học phí / năm</span>
                      </div>
                      {isDiff && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-extrabold text-stone-700">
                          Khác biệt
                        </span>
                      )}
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    >
                      {items.map((item, colIdx) => {
                        const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                        return (
                          <div
                            key={item.school.id}
                            className={cn(
                              "space-y-1 rounded-xl p-3 transition-colors",
                              isDiff ? tone.box : ""
                            )}
                          >
                            <p className="font-bold text-stone-900">
                              {hasTuitionData(item.tuitionMin, item.tuitionMax)
                                ? formatTuition(item.tuitionMin, item.tuitionMax)
                                : "Chưa công bố"}
                            </p>
                            {item.school.scholarships ? (
                              <p className="text-xs text-stone-600 mt-1 line-clamp-3">
                                <strong className="text-stone-800">Học bổng:</strong> {item.school.scholarships}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tiêu chí 3: Quy mô & Ngành đào tạo */}
              {(() => {
                const isDiff = new Set(items.map((it) => `${it.programCount}_${it.school.students || 0}`)).size > 1;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] p-5 gap-4">
                    <div className="font-bold text-stone-700 flex items-center justify-between md:flex-col md:items-start gap-1">
                      <div className="flex items-center gap-2">
                        <LuGraduationCap className="size-4 text-stone-400" />
                        <span>Quy mô đào tạo</span>
                      </div>
                      {isDiff && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-extrabold text-stone-700">
                          Khác biệt
                        </span>
                      )}
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    >
                      {items.map((item, colIdx) => {
                        const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                        return (
                          <div
                            key={item.school.id}
                            className={cn(
                              "space-y-1.5 rounded-xl p-3 transition-colors",
                              isDiff ? tone.box : ""
                            )}
                          >
                            <p className="font-bold text-stone-900">
                              {item.programCount} ngành đào tạo
                            </p>
                            {item.school.students ? (
                              <p className="text-xs text-stone-600">
                                Quy mô: ~{formatNumber(item.school.students)} sinh viên
                              </p>
                            ) : null}
                            {item.school.founded ? (
                              <p className="text-xs text-stone-500">
                                Năm thành lập: {item.school.founded}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tiêu chí 4: Phương thức xét tuyển */}
              {(() => {
                const isDiff = new Set(items.map((it) => it.methods.map((m) => m.name).sort().join(","))).size > 1;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] p-5 gap-4 bg-stone-50/40">
                    <div className="font-bold text-stone-700 flex items-center justify-between md:flex-col md:items-start gap-1">
                      <div className="flex items-center gap-2">
                        <LuLayers className="size-4 text-stone-400" />
                        <span>Phương thức xét tuyển</span>
                      </div>
                      {isDiff && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-extrabold text-stone-700">
                          Khác biệt
                        </span>
                      )}
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                    >
                      {items.map((item, colIdx) => {
                        const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                        return (
                          <div
                            key={item.school.id}
                            className={cn(
                              "space-y-2 rounded-xl p-3 transition-colors",
                              isDiff ? tone.box : ""
                            )}
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {item.methods.map((m, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-md bg-white border border-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-800"
                                >
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tiêu chí 5: Lịch sử điểm chuẩn các năm (2025, 2024, 2023) */}
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] p-5 gap-4">
                <div className="font-bold text-stone-700 flex items-center gap-2">
                  <LuHistory className="size-4 text-stone-400" />
                  Điểm chuẩn TB từng năm
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
                >
                  {items.map((item, colIdx) => {
                    const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                    return (
                      <div key={item.school.id} className="space-y-2 text-xs">
                        {item.cutoffsByYear.length > 0 ? (
                          item.cutoffsByYear.map((c) => (
                            <div
                              key={c.year}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 border transition-colors",
                                tone.box
                              )}
                            >
                              <span className="font-bold text-stone-700">Năm {c.year}</span>
                              <span className="font-black text-sm">
                                {c.avgScore.toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-stone-400 italic">Chưa có dữ liệu chính thức</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* D. BẢNG SO SÁNH ĐIỂM CHUẨN TỪNG NGÀNH HỌC */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  So sánh điểm chuẩn từng năm theo ngành đào tạo
                </h3>
                <p className="text-xs text-stone-500">
                  Đối chiếu điểm chuẩn phương thức điểm thi THPT của các ngành học giữa các trường. Khi điểm chuẩn khác biệt, điểm sẽ được tô màu riêng tương ứng với từng trường.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-600">
                    <th className="py-3 px-3 font-bold">Ngành học</th>
                    {items.map((item, colIdx) => {
                      const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                      return (
                        <th key={item.school.id} className="py-3 px-3 font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn("size-2 rounded-full", tone.dot)} />
                            <span>{item.school.shortName || item.school.name}</span>
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {commonMajors.slice(0, 15).map((m) => {
                    const latestScores = items.map((it) => it.programs.find((p) => p.majorId === m.id)?.cutoffs?.[0]?.score ?? null);
                    const validScores = latestScores.filter((s): s is number => s !== null);
                    const isScoreDiff = new Set(validScores.map((s) => s.toFixed(2))).size > 1;

                    return (
                      <tr key={m.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <p className="text-stone-900 font-bold">{m.name}</p>
                            {isScoreDiff && (
                              <span className="rounded-full bg-stone-200/90 px-1.5 py-0.2 text-[9px] font-extrabold text-stone-700">
                                Khác biệt
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400">Mã: {m.code}</p>
                        </td>
                        {items.map((item, colIdx) => {
                          const prog = item.programs.find((p) => p.majorId === m.id);
                          const tone = schoolToneStyles[colIdx % schoolToneStyles.length];
                          if (!prog) {
                            return (
                              <td key={item.school.id} className="py-3 px-3 text-stone-400 italic">
                                Không đào tạo
                              </td>
                            );
                          }
                          const cutoffs = prog.cutoffs || [];
                          const latest = cutoffs[0];
                          return (
                            <td key={item.school.id} className="py-3 px-3">
                              {latest ? (
                                <div className="space-y-1">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs",
                                      isScoreDiff ? tone.badge : "text-primary-800 bg-stone-100"
                                    )}
                                  >
                                    {latest.score.toFixed(2)}{" "}
                                    <span className="text-[10px] font-normal opacity-75 ml-1">
                                      ({latest.year})
                                    </span>
                                  </span>
                                  {cutoffs.length > 1 && (
                                    <p className="text-[11px] text-stone-500">
                                      {cutoffs.slice(1).map((c) => `${c.year}: ${c.score.toFixed(2)}`).join(" · ")}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-400">Chưa có</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
