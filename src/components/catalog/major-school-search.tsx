"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuMapPin, LuSearch } from "react-icons/lu";
import type { Region, SchoolType } from "@/domain/types";
import { buttonClass } from "@/components/ui/button";
import { matchesQuery } from "@/lib/text";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";

export type CatalogSchool = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  code: string;
  city: string;
  region: Region;
  type: SchoolType;
};

/** Ô tìm trên trang ngành: bấm vào hiện toàn bộ trường đang có trong danh mục. */
export function MajorSchoolSearch({ schools, defaultQuery = "" }: { schools: CatalogSchool[]; defaultQuery?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim();
    return q ? schools.filter((s) => matchesQuery(q, s.name, s.shortName, s.code, s.city)) : schools;
  }, [query, schools]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setOpen(false);
      router.push("/truong");
      return;
    }
    setOpen(false);
    router.push(`/nganh?q=${encodeURIComponent(q)}#tat-ca`);
  }

  return (
    <div ref={box} className="relative mx-auto mt-7 max-w-xl text-left">
      <form
        onSubmit={submit}
        role="search"
        className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-elevated min-[420px]:flex-row min-[420px]:items-center"
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls="school-catalog"
          aria-label="Mở danh mục trường"
          onClick={() => setOpen(true)}
          className="ml-1 hidden size-8 shrink-0 items-center justify-center text-slate-400 min-[420px]:ml-2 min-[420px]:flex"
        >
          <LuSearch className="size-5" aria-hidden />
        </button>
        <label htmlFor="m-q" className="sr-only">
          Tìm ngành hoặc mở danh mục trường
        </label>
        <input
          id="m-q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Tìm theo tên ngành hoặc mã ngành…"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 bg-transparent px-2 focus:outline-none"
        />
        <button className={buttonClass({ className: "w-full shrink-0 min-[420px]:w-auto" })}>Tìm kiếm</button>
      </form>

      {open && (
        <div id="school-catalog" className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 max-h-[min(70vh,420px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-elevated">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Danh mục trường ({shown.length})</p>
            <Link href="/truong" className="text-xs font-semibold text-primary-600 hover:underline" onClick={() => setOpen(false)}>
              Xem tất cả
            </Link>
          </div>
          {schools.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-500">Chưa có trường trong danh mục. Sau khi nhập dữ liệu, danh sách trường sẽ hiện ở đây.</p>
          ) : shown.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-500">Không có trường khớp “{query.trim()}”.</p>
          ) : (
            <ul>
              {shown.map((s) => (
                <li key={s.id}>
                  <Link href={`/truong/${s.slug}`} onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 hover:bg-primary-50">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-[11px] font-bold text-primary-800">
                      {(s.code || s.shortName || s.name).slice(0, 4)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{s.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        {s.shortName ? <span>{s.shortName}</span> : null}
                        {s.city ? (
                          <span className="inline-flex items-center gap-1">
                            <LuMapPin className="size-3" aria-hidden />
                            {s.city}
                          </span>
                        ) : null}
                        <span>{REGION_LABELS[s.region]}</span>
                        <span>{SCHOOL_TYPE_LABELS[s.type]}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
