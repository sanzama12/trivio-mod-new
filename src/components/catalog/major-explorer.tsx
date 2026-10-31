"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  LuBookOpen,
  LuBoxes,
  LuBriefcaseMedical,
  LuBuilding2,
  LuChevronDown,
  LuCpu,
  LuFilter,
  LuFilterX,
  LuGlobe,
  LuGraduationCap,
  LuLeaf,
  LuMessageCircle,
  LuMessageSquare,
  LuPalette,
  LuScale,
  LuSearch,
  LuSettings,
  LuShield,
  LuSlidersHorizontal,
  LuSprout,
  LuTrendingUp,
  LuX,
} from "react-icons/lu";
import type { MajorGroupSummary, MajorListItem } from "@/services/catalog.service";
import { MajorCard } from "./major-card";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 15;

/** Chọn icon chính xác cho từng nhóm ngành theo thiết kế chuẩn */
function getGroupLucideIcon(name: string, slug?: string): IconType {
  const s = `${name} ${slug ?? ""}`.toLowerCase();
  if (s.includes("giáo dục") || s.includes("sư phạm")) return LuGraduationCap;
  if (s.includes("nghệ thuật") || s.includes("thiết kế") || s.includes("kiến trúc")) return LuPalette;
  if (s.includes("ngôn ngữ") || s.includes("văn học") || s.includes("nhân văn")) return LuBookOpen;
  if (s.includes("báo chí") || s.includes("truyền thông") || s.includes("xuất bản")) return LuMessageCircle;
  if (s.includes("khoa học xã hội") || s.includes("tâm lý") || s.includes("hành vi") || s.includes("xã hội")) return LuMessageSquare;
  if (s.includes("kinh doanh") || s.includes("quản lý") || s.includes("kinh tế")) return LuTrendingUp;
  if (s.includes("tài chính") || s.includes("kế toán") || s.includes("ngân hàng")) return LuTrendingUp;
  if (s.includes("luật")) return LuScale;
  if (s.includes("máy tính") || s.includes("công nghệ thông tin") || s.includes("dữ liệu") || s.includes("cntt")) return LuCpu;
  if (s.includes("sản xuất") || s.includes("chế biến") || s.includes("vật liệu")) return LuBoxes;
  if (s.includes("kỹ thuật") || s.includes("công nghệ")) return LuSettings;
  if (s.includes("xây dựng") || s.includes("quy hoạch") || s.includes("hạ tầng")) return LuBuilding2;
  if (s.includes("nông") || s.includes("lâm") || s.includes("thủy sản") || s.includes("thú y")) return LuSprout;
  if (s.includes("môi trường") || s.includes("tài nguyên") || s.includes("khí tượng")) return LuLeaf;
  if (s.includes("y") || s.includes("dược") || s.includes("sức khỏe") || s.includes("y tế")) return LuBriefcaseMedical;
  if (s.includes("du lịch") || s.includes("khách sạn") || s.includes("dịch vụ")) return LuGlobe;
  if (s.includes("an ninh") || s.includes("quốc phòng") || s.includes("ngoại giao") || s.includes("quân sự")) return LuShield;
  return LuBookOpen;
}

function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

interface MajorExplorerProps {
  groups: MajorGroupSummary[];
  items: MajorListItem[];
  initialGroup?: string;
  initialQuery?: string;
}

export function MajorExplorer({ groups, items, initialGroup, initialQuery }: MajorExplorerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialGroup ?? null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (initialGroup) initial[initialGroup] = true;
    return initial;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const searchInputId = useId();

  // Nhóm các ngành theo groupId để hiển thị trong accordion khi mở rộng
  const majorsByGroup = useMemo(() => {
    const map = new Map<string, MajorListItem[]>();
    for (const item of items) {
      const gId = item.group.id;
      if (!map.has(gId)) map.set(gId, []);
      map.get(gId)!.push(item);
    }
    return map;
  }, [items]);

  // Lọc danh sách ngành học theo query và nhóm ngành
  const filteredItems = useMemo(() => {
    const qNorm = normalizeSearch(query.trim());
    return items.filter((item) => {
      if (selectedGroup && item.group.id !== selectedGroup) return false;
      if (!qNorm) return true;
      const nameNorm = normalizeSearch(item.major.name);
      const codeNorm = normalizeSearch(item.major.code || "");
      const summaryNorm = normalizeSearch(item.major.summary || item.major.description || "");
      return nameNorm.includes(qNorm) || codeNorm.includes(qNorm) || summaryNorm.includes(qNorm);
    });
  }, [items, selectedGroup, query]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, validPage]);

  const activeGroupInfo = groups.find((g) => g.group.id === selectedGroup);

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroup((prev) => (prev === groupId ? null : groupId));
    setCurrentPage(1);
    if (groupId) {
      setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
    }
    setIsMobileFilterOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedGroup(null);
    setQuery("");
    setCurrentPage(1);
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="w-full">
      {/* Nút bật bộ lọc trên Mobile */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="relative flex-1">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tên ngành hoặc mã ngành…"
            className="w-full rounded-xl border border-[#E9E3D5] bg-[#F8F5EE] py-2.5 pl-10 pr-9 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <LuX className="size-4" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold shadow-xs transition-colors",
            selectedGroup
              ? "border-[#00629B] bg-[#00629B] text-white"
              : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
          )}
        >
          <LuFilter className="size-4" />
          <span>Bộ lọc</span>
          {selectedGroup ? <span className="size-2 rounded-full bg-amber-300" /> : null}
        </button>
      </div>

      {/* Layout 2 cột: Cột trái (Bộ lọc) & Cột phải (Danh sách ngành) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
        {/* ========================================================= */}
        {/* CỘT TRÁI: BỘ LỌC (DESKTOP) */}
        {/* ========================================================= */}
        <aside
          aria-label="Bộ lọc tìm kiếm ngành học"
          className="sticky top-20 hidden rounded-3xl border border-[#EBE6DC] bg-[#FAF8F5] p-5 shadow-xs lg:block"
        >
          {/* Tiêu đề Bộ lọc */}
          <div className="flex items-center gap-2.5 border-b border-[#EBE5D9] pb-4">
            <LuSlidersHorizontal className="size-5 text-stone-900" aria-hidden />
            <h2 className="text-xl font-black tracking-tight text-stone-900">Bộ lọc</h2>
            {selectedGroup || query ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900"
              >
                <LuFilterX className="size-3.5" />
                <span>Đặt lại</span>
              </button>
            ) : null}
          </div>

          {/* Mục 1: Tìm ngành học */}
          <div className="mt-5">
            <label htmlFor={searchInputId} className="block text-base font-bold text-stone-900">
              Tìm ngành học
            </label>
            <div className="relative mt-2.5">
              <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-stone-400" />
              <input
                id={searchInputId}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tên ngành hoặc mã ngành"
                className="w-full rounded-2xl border border-[#EAE3D4] bg-[#F7F4EC] py-3 pl-10 pr-9 text-[14px] text-stone-800 placeholder:text-stone-400 transition-colors focus:border-stone-400 focus:bg-white focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <LuX className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Mục 2: Nhóm ngành */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Nhóm ngành</h3>
              {selectedGroup ? (
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className="text-xs font-semibold text-[#00629B] hover:underline"
                >
                  Xem tất cả
                </button>
              ) : null}
            </div>

            {/* Danh sách nhóm ngành dạng cuộn/dọc */}
            <div className="mt-3 max-h-[calc(100vh-290px)] space-y-1 overflow-y-auto pr-1">
              {/* Lựa chọn: Tất cả nhóm ngành */}
              <button
                type="button"
                onClick={() => handleSelectGroup(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                  selectedGroup === null
                    ? "bg-[#EAE4D5] text-stone-950 font-bold shadow-xs"
                    : "text-stone-700 hover:bg-[#F3EFE6]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LuSlidersHorizontal className="size-4.5 shrink-0 text-stone-600" />
                  <span className="truncate text-[14.5px]">Tất cả nhóm ngành</span>
                </div>
                <span className="text-[13px] text-stone-500 font-medium shrink-0">
                  {items.length}
                </span>
              </button>

              {/* Từng nhóm ngành */}
              {groups.map((item) => {
                const group = item.group;
                const isSelected = selectedGroup === group.id;
                const isExpanded = !!expandedGroups[group.id];
                const IconComponent = getGroupLucideIcon(group.name, group.slug);
                const groupMajors = majorsByGroup.get(group.id) ?? [];

                return (
                  <div key={group.id} className="rounded-xl">
                    <div
                      onClick={() => handleSelectGroup(group.id)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-[#EAE4D5] text-stone-950 font-bold shadow-xs"
                          : "text-stone-700 hover:bg-[#F3EFE6]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <IconComponent className="size-4.5 shrink-0 text-stone-600" aria-hidden />
                        <span className="truncate text-[14px] leading-tight" title={group.name}>
                          {group.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[13px] text-stone-400 font-medium group-hover:text-stone-600">
                          {item.majorCount}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleGroupExpand(group.id, e)}
                          title={isExpanded ? "Thu gọn" : "Mở rộng danh sách ngành"}
                          aria-label={isExpanded ? `Thu gọn nhóm ${group.name}` : `Mở rộng nhóm ${group.name}`}
                          className="p-0.5 text-stone-400 hover:text-stone-800 transition-colors"
                        >
                          <LuChevronDown
                            className={cn(
                              "size-4 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Accordion mở rộng hiển thị các ngành cụ thể trong nhóm */}
                    {isExpanded && groupMajors.length > 0 ? (
                      <div className="my-1 space-y-0.5 border-l-2 border-stone-300 py-1 pl-4 pr-1 text-xs">
                        {groupMajors.slice(0, 10).map((mItem) => (
                          <Link
                            key={mItem.major.id}
                            href={`/nganh/${mItem.major.slug}`}
                            className="block truncate py-1 text-stone-600 hover:font-bold hover:text-[#00629B]"
                            title={mItem.major.name}
                          >
                            • {mItem.major.name}
                          </Link>
                        ))}
                        {groupMajors.length > 10 ? (
                          <button
                            type="button"
                            onClick={() => handleSelectGroup(group.id)}
                            className="block py-1 text-[11px] font-bold text-[#00629B] hover:underline"
                          >
                            + Xem thêm {groupMajors.length - 10} ngành nữa...
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* CỘT PHẢI: DANH SÁCH THẺ NGÀNH HỌC */}
        {/* ========================================================= */}
        <main className="min-w-0">
          {/* Thanh trạng thái kết quả & Lọc đang chọn */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <p className="text-sm font-semibold text-stone-700">
                Tìm thấy{" "}
                <span className="font-bold text-stone-950">{filteredItems.length}</span>{" "}
                ngành đào tạo
                {selectedGroup && activeGroupInfo
                  ? ` thuộc nhóm “${activeGroupInfo.group.name}”`
                  : ""}
                {query ? ` với từ khóa “${query}”` : ""}
              </p>
            </div>

            {selectedGroup || query ? (
              <div className="flex items-center gap-2">
                {selectedGroup && activeGroupInfo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAE4D5] px-3 py-1 text-xs font-bold text-stone-800">
                    <span>{activeGroupInfo.group.name}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup(null)}
                      className="hover:text-stone-950"
                    >
                      <LuX className="size-3.5" />
                    </button>
                  </span>
                ) : null}

                {query ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-800">
                    <span>“{query}”</span>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="hover:text-stone-950"
                    >
                      <LuX className="size-3.5" />
                    </button>
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#00629B] hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
            ) : null}
          </div>

          {/* Trạng thái không có kết quả */}
          {pageItems.length === 0 ? (
            <div className="rounded-2xl border border-[#EDE8DF] bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                <LuSearch className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-stone-900">Không tìm thấy ngành học phù hợp</h3>
              <p className="mt-1 text-sm text-stone-600">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn nhóm ngành khác để tiếp tục khám phá.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"
              >
                <LuFilterX className="size-4" />
                <span>Xem tất cả ngành</span>
              </button>
            </div>
          ) : (
            /* Danh sách các thẻ ngành học hiển thị dọc theo hàng như ảnh 2 */
            <div className="space-y-4">
              {pageItems.map((item) => (
                <MajorCard key={item.major.id} item={item} />
              ))}
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-bold text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-40"
              >
                Trước
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - validPage) <= 2)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const hasGap = prevP && p - prevP > 1;
                    return (
                      <span key={p} className="inline-flex items-center gap-1.5">
                        {hasGap ? <span className="px-1 text-stone-400">…</span> : null}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl text-sm font-bold transition-colors",
                            p === validPage
                              ? "bg-stone-900 text-white shadow-xs"
                              : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                          )}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-bold text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          ) : null}
        </main>
      </div>

      {/* ========================================================= */}
      {/* DRAWER BỘ LỌC TRÊN MOBILE / TABLET */}
      {/* ========================================================= */}
      {isMobileFilterOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex bg-black/50 lg:hidden backdrop-blur-xs"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-[#FAF8F5] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBE5D9] pb-4">
              <div className="flex items-center gap-2">
                <LuSlidersHorizontal className="size-5 text-stone-900" />
                <h2 className="text-lg font-black text-stone-900">Bộ lọc ngành học</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200"
              >
                <LuX className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Nhóm ngành</h3>
              <div className="mt-3 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                    selectedGroup === null
                      ? "bg-[#EAE4D5] text-stone-950 font-bold"
                      : "text-stone-700 hover:bg-[#F3EFE6]"
                  )}
                >
                  <span>Tất cả nhóm ngành</span>
                  <span className="text-xs text-stone-400">{items.length}</span>
                </button>

                {groups.map((item) => {
                  const group = item.group;
                  const isSelected = selectedGroup === group.id;
                  const Icon = getGroupLucideIcon(group.name, group.slug);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelectGroup(group.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                        isSelected
                          ? "bg-[#EAE4D5] text-stone-950 font-bold"
                          : "text-stone-700 hover:bg-[#F3EFE6]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-4 shrink-0 text-stone-500" />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <span className="text-xs text-stone-400 shrink-0 ml-2">{item.majorCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#EBE5D9] pt-3">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full rounded-xl bg-stone-900 py-3 text-center text-sm font-bold text-white shadow-xs"
              >
                Xem {filteredItems.length} kết quả
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
