"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuBuilding2, LuGraduationCap, LuMapPin, LuSearch, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { matchesQuery } from "@/lib/text";
import { SchoolLogo } from "@/components/school/school-logo";

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
  logoUrl: string | null;
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

export function HeroSearch({ groups, schools, majors, defaultQuery = "", className }: HeroSearchProps) {
  const router = useRouter();
  const [scope, setScope] = useState<"schools" | "majors">("schools");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const resultsId = useId();
  const schoolsMode = scope === "schools";
  const destination = schoolsMode ? "/truong" : "/nganh";
  const resultsHref = query.trim() ? `${destination}?q=${encodeURIComponent(query.trim())}` : destination;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const matchedSchools = useMemo(() => schools.filter((school) =>
    !query.trim() || matchesQuery(query.trim(), school.name, school.shortName, school.code, school.city, school.aliases)
  ), [schools, query]);
  const matchedMajors = useMemo(() => majors.filter((major) =>
    !query.trim() || matchesQuery(query.trim(), major.name, major.code, major.groupName,
      groups.find((group) => group.id === major.groupId)?.name, major.aliases)
  ), [majors, groups, query]);
  const count = schoolsMode ? matchedSchools.length : matchedMajors.length;

  return (
    <div ref={containerRef} className={cn("relative mx-auto w-full max-w-2xl text-left", className)}>
      <div role="group" aria-label="Chọn loại tìm kiếm" className="mb-3 flex gap-2">
        {([
          { key: "schools", label: "Tìm trường", icon: LuBuilding2 },
          { key: "majors", label: "Tìm ngành", icon: LuGraduationCap },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" aria-pressed={scope === key}
            onClick={() => { setScope(key); setIsOpen(true); inputRef.current?.focus(); }}
            className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors",
              scope === key ? "border-primary-700 bg-primary-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            <Icon className="size-4" aria-hidden />{label}
          </button>
        ))}
      </div>
      <form role="search" aria-label={schoolsMode ? "Tìm trường" : "Tìm ngành"} data-tour="search"
        onSubmit={(event) => { event.preventDefault(); setIsOpen(false); router.push(resultsHref); }}
        className={cn("flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-elevated transition-all",
          isOpen ? "border-primary-500 ring-4 ring-primary-100/80" : "border-slate-200")}>
        <LuSearch className="ml-2 size-5 shrink-0 text-slate-400" aria-hidden />
        <label htmlFor={inputId} className="sr-only">{schoolsMode ? "Tên trường hoặc mã trường" : "Tên ngành hoặc mã ngành"}</label>
        <input ref={inputRef} id={inputId} name="q" type="search" value={query}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)} aria-controls={isOpen ? resultsId : undefined}
          placeholder={schoolsMode ? "Nhập tên trường hoặc mã trường…" : "Nhập tên ngành hoặc mã ngành…"}
          autoComplete="off" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none" />
        {query && <button type="button" aria-label="Xoá từ khoá" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><LuX className="size-4" /></button>}
        <button type="submit" className={buttonClass({ className: "shrink-0 px-4 sm:px-6" })}>Tìm</button>
      </form>
      {isOpen && (
        <div id={resultsId} className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(32rem,65dvh)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {query.trim() ? `${count} ${schoolsMode ? "trường" : "ngành"} phù hợp` : schoolsMode ? "Khám phá các trường" : "Khám phá các ngành"}
          </p>
          {count === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-600">
              Chưa tìm thấy {schoolsMode ? "trường" : "ngành"} phù hợp. Thử tên hoặc mã khác.
            </div>
          ) : schoolsMode ? matchedSchools.slice(0, 8).map((school) => (
            <Link key={school.id} href={`/truong/${school.slug}`} onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-primary-50 focus-visible:bg-primary-50">
              <SchoolLogo school={school} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{school.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-semibold text-primary-700">{school.code}</span>
                  {school.city && <span className="inline-flex items-center gap-1"><LuMapPin className="size-3" aria-hidden />{school.city}</span>}
                </p>
              </div>
              <LuArrowRight className="size-4 shrink-0 text-primary-700" aria-hidden />
            </Link>
          )) : matchedMajors.slice(0, 8).map((major) => (
            <Link key={major.id} href={`/nganh/${major.slug}`} onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-primary-50 focus-visible:bg-primary-50">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><LuGraduationCap className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{major.name}</p>
                <p className="mt-1 text-xs text-slate-500">{major.groupName || groups.find((group) => group.id === major.groupId)?.name}{major.code ? ` · Mã ${major.code}` : ""}</p>
              </div>
              <LuArrowRight className="size-4 shrink-0 text-primary-700" aria-hidden />
            </Link>
          ))}
          <Link href={resultsHref} onClick={() => setIsOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center gap-2 border-t border-slate-100 px-3 pt-3 pb-1 text-sm font-bold text-primary-700 hover:underline">
            Xem danh sách {schoolsMode ? "trường" : "ngành"}<LuArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
