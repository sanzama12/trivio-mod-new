"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuArrowRight,
  LuBookOpen,
  LuBuilding2,
  LuCheck,
  LuChevronDown,
  LuCompass,
  LuGraduationCap,
  LuLayers,
  LuMapPin,
  LuSearch,
  LuSparkles,
  LuTrendingUp,
  LuX,
  LuZap,
} from "react-icons/lu";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { GroupIcon } from "@/components/ui/group-icon";
import { matchesQuery } from "@/lib/text";

export interface SearchMajorItem {
  id: string;
  name: string;
  code: string;
  slug: string;
  groupId: string;
  groupName?: string;
  programCount?: number;
  aliases?: string[];
  specializations?: { name: string; aliases?: string[] }[];
}

export interface SearchSchoolItem {
  id: string;
  name: string;
  shortName: string;
  code: string;
  slug: string;
  region: "bac" | "trung" | "nam";
  city: string;
  type: "cong-lap" | "tu-thuc" | "quoc-te";
  level?: "dai-hoc" | "cao-dang" | "hoc-vien";
  highlight?: string;
  aliases?: string[];
}

export interface SearchGroupItem {
  id: string;
  slug: string;
  name: string;
  icon: string;
  tone: "primary" | "accent" | "success" | "danger" | "pink" | "teal" | "violet" | "slate";
  majorCount: number;
}

interface HeroSearchProps {
  groups: SearchGroupItem[];
  schools: SearchSchoolItem[];
  majors: SearchMajorItem[];
  defaultQuery?: string;
  className?: string;
}

const REGION_LABELS: Record<string, string> = {
  all: "Tất cả khu vực",
  bac: "Miền Bắc",
  trung: "Miền Trung",
  nam: "Miền Nam",
};

const QUICK_FILTERS = [
  {
    icon: LuZap,
    title: "Học phí dưới 20 triệu/năm",
    subtitle: "Mức học phí đại học công lập tiết kiệm",
    href: "/chuong-trinh?tuition=duoi-20tr",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  {
    icon: LuBookOpen,
    title: "Xét tuyển học bạ THPT",
    subtitle: "Các chương trình mở đợt xét học bạ sớm",
    href: "/chuong-trinh?method=hocba",
    tone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    icon: LuTrendingUp,
    title: "Điểm ĐGNL ĐHQG",
    subtitle: "Tra cứu chương trình xét điểm Đánh giá năng lực",
    href: "/chuong-trinh?method=dgnl-hcm",
    tone: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  {
    icon: LuCompass,
    title: "Trắc nghiệm chọn ngành (RIASEC)",
    subtitle: "Khám phá ngành phù hợp tính cách của bạn",
    href: "/trac-nghiem",
    tone: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
];

export function HeroSearch({ groups, schools, majors, defaultQuery = "", className }: HeroSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [activeTab, setActiveTab] = useState<"groups" | "schools" | "majors" | "quick">("groups");
  const [schoolRegion, setSchoolRegion] = useState<"all" | "bac" | "trung" | "nam">("all");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filtered live results when user types
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return null;

    const matchedSchools = schools
      .filter((s) => matchesQuery(q, s.name, s.shortName, s.code, s.city, s.aliases))
      .slice(0, 8);

    const matchedMajors = majors
      .filter((m) =>
        matchesQuery(
          q,
          m.name,
          m.code,
          m.groupName,
          m.aliases,
          m.specializations?.map((sp) => sp.name),
          m.specializations?.flatMap((sp) => sp.aliases || [])
        )
      )
      .slice(0, 8);

    const matchedGroups = groups
      .filter((g) => matchesQuery(q, g.name))
      .slice(0, 4);

    return {
      schools: matchedSchools,
      majors: matchedMajors,
      groups: matchedGroups,
      totalMatches: matchedSchools.length + matchedMajors.length + matchedGroups.length,
    };
  }, [query, schools, majors, groups]);

  // Filtered schools in catalog tab
  const displayedSchools = useMemo(() => {
    if (schoolRegion === "all") return schools.slice(0, 12);
    return schools.filter((s) => s.region === schoolRegion).slice(0, 12);
  }, [schools, schoolRegion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    const q = query.trim();
    if (q) {
      router.push(`/chuong-trinh?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/chuong-trinh");
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setIsOpen(false);
    router.push(`/nganh?group=${groupId}`);
  };

  const handleSelectSchool = (slug: string) => {
    setIsOpen(false);
    router.push(`/truong/${slug}`);
  };

  const handleSelectMajor = (slug: string) => {
    setIsOpen(false);
    router.push(`/nganh/${slug}`);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative mx-auto w-full max-w-2xl text-left", className)}>
      {/* Search Input Box */}
      <form
        onSubmit={handleSubmit}
        role="search"
        data-tour="search"
        className={cn(
          "group relative flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-elevated transition-all duration-200",
          isOpen
            ? "border-primary-500 ring-4 ring-primary-100/80 shadow-2xl"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          aria-label="Mở danh mục có sẵn"
          className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition"
        >
          <LuSearch className="size-5" aria-hidden />
        </button>

        <label htmlFor="hero-search-input" className="sr-only">
          Tìm trường, ngành, chương trình đào tạo
        </label>
        <input
          ref={inputRef}
          id="hero-search-input"
          name="q"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm trường, ngành, chương trình đào tạo…"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            aria-label="Xoá từ khoá"
          >
            <LuX className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Xem danh mục có sẵn"
        >
          <span>Danh mục</span>
          <LuChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        <button type="submit" className={buttonClass({ className: "px-6" })}>
          Tìm kiếm
        </button>
      </form>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white/98 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* STATE 1: Real-time Live Search Results */}
          {searchResults !== null ? (
            <div className="max-h-[460px] overflow-y-auto p-4 divide-y divide-slate-100">
              {searchResults.totalMatches === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <LuSearch className="size-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Không tìm thấy gợi ý cho &quot;{query}&quot;
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Thử tìm với tên viết tắt (ví dụ: BKA, NEU, CNTT, Y khoa) hoặc nhấn &quot;Tìm kiếm&quot; để tra cứu toàn bộ cơ sở dữ liệu.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {["CNTT", "Kinh tế", "Bách Khoa", "Y Dược", "Marketing", "Ngoại Thương"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setQuery(tag);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Matching Major Groups */}
                  {searchResults.groups.length > 0 && (
                    <div className="pb-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <LuLayers className="size-3.5 text-primary-600" />
                          Nhóm ngành ({searchResults.groups.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {searchResults.groups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => handleSelectGroup(group.id)}
                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-left transition hover:border-primary-200 hover:bg-primary-50/50"
                          >
                            <GroupIcon group={group} className="size-8 rounded-lg" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900">{group.name}</div>
                              <div className="text-xs text-slate-500">{group.majorCount} ngành đào tạo</div>
                            </div>
                            <LuArrowRight className="size-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Schools */}
                  {searchResults.schools.length > 0 && (
                    <div className="py-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <LuBuilding2 className="size-3.5 text-primary-600" />
                          Trường Đại học, Học viện & Cao đẳng ({searchResults.schools.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.schools.map((school) => (
                          <button
                            key={school.id}
                            type="button"
                            onClick={() => handleSelectSchool(school.slug)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-primary-50/60"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 font-bold text-xs text-primary-800">
                                {school.code || school.shortName.slice(0, 3).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
                                  <span>{school.name}</span>
                                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                    {school.level === "cao-dang" ? "Cao đẳng" : school.level === "hoc-vien" ? "Học viện" : "Đại học"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span className="font-medium text-primary-700">({school.shortName})</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <LuMapPin className="size-3" /> {school.city}
                                  </span>
                                  <span>•</span>
                                  <span>{REGION_LABELS[school.region]}</span>
                                </div>
                              </div>
                            </div>
                            <LuArrowRight className="size-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Majors */}
                  {searchResults.majors.length > 0 && (
                    <div className="pt-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <LuGraduationCap className="size-3.5 text-primary-600" />
                          Ngành & Chuyên ngành đào tạo ({searchResults.majors.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.majors.map((major) => (
                          <button
                            key={major.id}
                            type="button"
                            onClick={() => handleSelectMajor(major.slug)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-primary-50/60"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">{major.name}</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 shrink-0">
                                  {major.code}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                {major.groupName && (
                                  <span className="text-primary-700 font-medium">{major.groupName}</span>
                                )}
                                {major.specializations && major.specializations.length > 0 && (
                                  <span className="text-[11px] text-slate-400 truncate">
                                    • Gồm: {major.specializations.slice(0, 3).map((sp) => sp.name).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <LuArrowRight className="size-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Quick Submit Banner */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 p-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition shadow-sm"
                >
                  <LuSearch className="size-4" />
                  <span>Tìm tất cả chương trình đào tạo cho &quot;{query}&quot;</span>
                  <LuArrowRight className="size-4 ml-auto" />
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: Default Categories & Recommendations */
            <div>
              {/* Category Tabs Header */}
              <div className="flex border-b border-slate-100 bg-slate-50/80 px-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("groups")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition",
                    activeTab === "groups"
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <LuLayers className="size-3.5" />
                  <span>Nhóm ngành ({groups.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("schools")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition",
                    activeTab === "schools"
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <LuBuilding2 className="size-3.5" />
                  <span>Trường ĐH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("majors")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition",
                    activeTab === "majors"
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <LuGraduationCap className="size-3.5" />
                  <span>Ngành hot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("quick")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition",
                    activeTab === "quick"
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <LuSparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nhanh</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="max-h-[380px] overflow-y-auto p-4">
                {/* TAB 1: NHÓM NGÀNH */}
                {activeTab === "groups" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Chọn nhóm ngành đào tạo trọng điểm
                      </span>
                      <Link
                        href="/nganh"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-0.5"
                      >
                        Tất cả ngành <LuArrowRight className="size-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {groups.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectGroup(item.id)}
                          className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 text-left shadow-xs transition hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-card"
                        >
                          <GroupIcon group={item} className="size-9 rounded-lg transition group-hover:scale-105" />
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900 group-hover:text-primary-700 transition">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-500">{item.majorCount} ngành học</span>
                          </div>
                          <LuArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: TRƯỜNG ĐẠI HỌC */}
                {activeTab === "schools" && (
                  <div>
                    {/* Region Pill Filters */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {(["all", "bac", "trung", "nam"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSchoolRegion(r)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold transition",
                            schoolRegion === r
                              ? "bg-primary-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {REGION_LABELS[r]}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {displayedSchools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => handleSelectSchool(school.slug)}
                          className="group flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 text-left transition hover:border-primary-200 hover:bg-primary-50/50"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 font-bold text-xs text-primary-800 group-hover:bg-primary-600 group-hover:text-white transition">
                            {school.code || school.shortName.slice(0, 3).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-slate-900 group-hover:text-primary-700">
                              {school.shortName}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">{school.name}</div>
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                              <LuMapPin className="size-2.5" /> {school.city}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 text-center">
                      <Link
                        href="/chuong-trinh"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
                      >
                        Xem tất cả {schools.length} trường đại học <LuArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* TAB 3: NGÀNH HOT */}
                {activeTab === "majors" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Top ngành học được tìm kiếm nhiều nhất
                      </span>
                      <Link
                        href="/nganh"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-0.5"
                      >
                        Xem tất cả <LuArrowRight className="size-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {majors.slice(0, 10).map((major) => (
                        <button
                          key={major.id}
                          type="button"
                          onClick={() => handleSelectMajor(major.slug)}
                          className="group flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 text-left transition hover:border-primary-200 hover:bg-primary-50/50"
                        >
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-900 group-hover:text-primary-700">
                              {major.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">Mã: {major.code}</span>
                          </div>
                          <LuArrowRight className="size-3.5 text-slate-300 transition group-hover:text-primary-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: GỢI Ý NHANH */}
                {activeTab === "quick" && (
                  <div className="space-y-2">
                    <span className="block mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tra cứu nhanh theo nhu cầu
                    </span>
                    {QUICK_FILTERS.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition",
                          item.tone
                        )}
                      >
                        <item.icon className="size-5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{item.title}</div>
                          <div className="text-xs opacity-80">{item.subtitle}</div>
                        </div>
                        <LuArrowRight className="size-4 shrink-0 opacity-60" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Tip */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
                <span>💡 Gõ từ khóa để tìm kiếm nhanh trường, mã ngành hoặc tên ngành</span>
                <span className="hidden sm:inline">Phím <kbd className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-mono">ESC</kbd> để đóng</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
