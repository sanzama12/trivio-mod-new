"use client";

import Link from "next/link";
import {
  LuArrowRight,
  LuBookOpen,
  LuCheck,
  LuCompass,
  LuGraduationCap,
  LuHeart,
  LuLoaderCircle,
  LuRotateCcw,
  LuSchool,
  LuSparkles,
  LuStar,
} from "react-icons/lu";
import type { MajorGroup, Subject } from "@/domain/types";
import { useMajorSmartSuggester } from "./use-major-smart-suggester";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface MajorSmartSuggesterProps {
  groups: MajorGroup[];
  subjects: Subject[];
}

export function MajorSmartSuggester({ groups, subjects }: MajorSmartSuggesterProps) {
  const {
    selectedGroups,
    selectedSubjects,
    recommendations,
    loading,
    activeTab,
    setActiveTab,
    toggleGroup,
    toggleSubject,
    setSelectedGroups,
    setSelectedSubjects,
    resetSelections,
    handleSaveToProfile,
    handleToggleHeart,
    isFavorite,
    hasSelections,
  } = useMajorSmartSuggester();

  return (
    <section className="mb-10 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-card">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-slate-900 px-6 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-500/20 px-3 py-1 text-xs font-semibold text-accent-200 ring-1 ring-accent-500/30">
              <LuSparkles className="size-3.5 text-accent-500" />
              <span>Gợi ý ngành học phù hợp</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Định hướng ngành dựa trên sở thích & môn thế mạnh
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-primary-100 max-w-2xl">
              Chọn lĩnh vực bạn yêu thích và các môn học sở trường. Hệ thống kết nối trực tiếp với danh mục ngành đào tạo, kiến thức và cơ hội nghề nghiệp mà không cần làm bài trắc nghiệm tâm lý.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "results" ? "customize" : "results")}
              className={buttonClass({ variant: "white", size: "sm" })}
            >
              {activeTab === "customize" ? "Xem gợi ý" : "Tùy chỉnh tiêu chí"}
            </button>
            {hasSelections && (
              <button
                type="button"
                onClick={handleSaveToProfile}
                className={buttonClass({ variant: "secondary", size: "sm" })}
                title="Lưu vào hồ sơ cá nhân"
              >
                Lưu vào hồ sơ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8">
        {/* Bộ lọc nhanh sở thích & môn thế mạnh */}
        <div className={cn("space-y-6 pb-6", activeTab === "results" && hasSelections ? "border-b border-slate-100" : "")}>
          {/* Lĩnh vực / Nhóm ngành */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-700">
                <LuCompass className="size-4 text-primary-700" />
                1. Lĩnh vực & Nhóm ngành yêu thích ({selectedGroups.length} đã chọn)
              </label>
              {selectedGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGroups([])}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-700"
                >
                  Xoá chọn
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {groups.map((grp) => {
                const active = selectedGroups.includes(grp.id);
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => toggleGroup(grp.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all cursor-pointer",
                      active
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    )}
                  >
                    {active && <LuCheck className="size-3.5 text-current" />}
                    <span>{grp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Môn học thế mạnh */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-700">
                <LuStar className="size-4 text-accent-800 fill-accent-500" />
                2. Môn học thế mạnh của bạn ({selectedSubjects.length} đã chọn)
              </label>
              {selectedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubjects([])}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-700"
                >
                  Xoá chọn
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => {
                const active = selectedSubjects.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all cursor-pointer",
                      active
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    )}
                  >
                    {active && <LuCheck className="size-3.5" />}
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Danh sách các ngành học gợi ý */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LuGraduationCap className="size-5 text-primary-700" />
              Ngành học phù hợp nhất với bạn
            </h3>
            <span className="text-xs text-slate-600 font-medium">
              {loading ? "Đang phân tích..." : `${recommendations.length} ngành gợi ý`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-600">
              <LuLoaderCircle className="size-6 animate-spin text-primary-700 mr-2" />
              Đang phân tích các ngành học phù hợp với sở thích và môn thế mạnh...
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => {
                const isFav = isFavorite(rec.major.id);
                return (
                  <article
                    key={rec.major.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-xs transition-all hover:border-slate-400 hover:bg-white hover:shadow-md"
                  >
                    <div>
                      {/* Badge Điểm phù hợp & Tim yêu thích */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-semibold text-slate-950">
                            Khớp sở thích & thế mạnh
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {rec.group.name}
                          </span>
                        </div>
                        <button
                          aria-label={isFav ? "Bỏ lưu ngành" : "Lưu ngành quan tâm"}
                          type="button"
                          onClick={() => handleToggleHeart(rec.major.id, rec.major.name)}
                          title={isFav ? "Bỏ lưu ngành" : "Lưu ngành quan tâm"}
                          className={cn(
                            "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-full border transition-all cursor-pointer",
                            isFav
                              ? "border-primary-200 bg-primary-50 text-primary-500"
                              : "border-slate-200 bg-white text-slate-600 hover:text-primary-500"
                          )}
                        >
                          <LuHeart className={cn("size-4", isFav && "fill-current")} />
                        </button>
                      </div>

                      {/* Tên ngành */}
                      <h4 className="mt-2.5 text-lg font-bold text-slate-900 line-clamp-1">
                        <Link href={`/nganh/${rec.major.slug}`} className="hover:text-primary-700 hover:underline">
                          {rec.major.name}
                        </Link>
                      </h4>

                      {/* Lý do gợi ý */}
                      <p className="mt-1 text-xs font-semibold text-primary-700 line-clamp-1">
                        {rec.reasons.join(" · ")}
                      </p>

                      {/* Kiến thức đào tạo */}
                      <div className="mt-3 rounded-xl bg-white p-3 border border-slate-100">
                        <p className="text-xs font-semibold tracking-wide text-slate-600 mb-1">
                          Kiến thức đào tạo
                        </p>
                        <p className="text-xs leading-relaxed text-slate-600 line-clamp-2 max-w-prose">
                          {rec.knowledge}
                        </p>
                      </div>

                      {/* Định hướng nghề nghiệp */}
                      <div className="mt-2 rounded-xl bg-white p-3 border border-slate-100">
                        <p className="text-xs font-semibold tracking-wide text-slate-600 mb-1">
                          Cơ hội nghề nghiệp
                        </p>
                        <p className="text-xs leading-relaxed text-slate-600 line-clamp-2 max-w-prose">
                          {rec.careerOrientation}
                        </p>
                      </div>
                    </div>

                    {/* Chân thẻ: Số trường & Nút Tìm trường đào tạo */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <LuSchool className="size-3.5" />
                        {rec.schoolCount > 0 ? `${rec.schoolCount} trường đào tạo` : "Nhiều trường đào tạo"}
                      </span>
                      <Link
                        href={`/chuong-trinh?majors=${encodeURIComponent(rec.major.id)}`}
                        className={buttonClass({ size: "sm" })}
                      >
                        <span>Tìm trường</span>
                        <LuArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
              <LuBookOpen className="size-8 text-slate-600 mx-auto" />
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Hãy chọn ít nhất một lĩnh vực hoặc môn học thế mạnh phía trên
              </p>
              <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
                Hệ thống sẽ ngay lập tức đối chiếu với danh mục ngành đào tạo đại học để gợi ý các ngành phù hợp nhất cho bạn.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
