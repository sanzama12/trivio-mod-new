"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DataSource } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { SourceChip } from "./source-chip";

interface Cell {
  value: number;
  low?: number;
  high?: number;
  source: DataSource;
  year: number;
}
export interface OutcomeRow {
  majorId: string;
  slug: string;
  name: string;
  groupId: string;
  groupName: string;
  employment: Cell | null;
  starting: Cell | null;
  experienced: Cell | null;
}

type SortKey = "name" | "employment" | "starting" | "experienced";
const vn = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

export function OutcomeTable({ rows, groups }: { rows: OutcomeRow[]; groups: [string, string][] }) {
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<SortKey>("starting");
  const list = useMemo(() => {
    const filtered = rows.filter((r) => !group || r.groupId === group);
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      const va = a[sort]?.value ?? -1;
      const vb = b[sort]?.value ?? -1;
      return vb - va;
    });
  }, [rows, group, sort]);

  const cell = (c: Cell | null, unit: string) =>
    c ? (
      <div>
        <p className="font-bold text-slate-900">
          {vn(c.value)}
          <span className="ml-0.5 text-xs font-normal text-slate-500">{unit}</span>
        </p>
        {c.low !== undefined && c.high !== undefined && (
          <p className="text-xs text-slate-500">
            {vn(c.low)}–{vn(c.high)}
          </p>
        )}
        <SourceChip source={c.source} year={c.year} className="mt-1" />
      </div>
    ) : (
      <span className="text-xs text-slate-500">Chưa có nguồn</span>
    );

  return (
    <section className="mt-8" aria-label="Bảng việc làm & thu nhập">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="oc-group" className="text-sm font-semibold text-slate-700">
          Nhóm ngành
        </label>
        <select
          id="oc-group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        >
          <option value="">Tất cả</option>
          {groups.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <label htmlFor="oc-sort" className="text-sm font-semibold text-slate-700">
          Sắp xếp
        </label>
        <select
          id="oc-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        >
          <option value="starting">Lương khởi điểm ↓</option>
          <option value="experienced">Thu nhập sau 3–5 năm ↓</option>
          <option value="employment">Tỷ lệ có việc làm ↓</option>
          <option value="name">Tên ngành A → Z</option>
        </select>
      </div>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Ngành</th>
              <th scope="col" className="px-4 py-3">Có việc làm (12 tháng)</th>
              <th scope="col" className="px-4 py-3">Lương khởi điểm</th>
              <th scope="col" className="px-4 py-3">Sau 3–5 năm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.majorId} className={cn("align-top")}>
                <td className="px-4 py-3">
                  <Link href={`/nganh/${r.slug}#viec-lam`} className="font-semibold text-slate-900 hover:text-primary-700">
                    {r.name}
                  </Link>
                  <p className="text-xs text-slate-500">{r.groupName}</p>
                </td>
                <td className="px-4 py-3">{cell(r.employment, "%")}</td>
                <td className="px-4 py-3">{cell(r.starting, " tr")}</td>
                <td className="px-4 py-3">{cell(r.experienced, " tr")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-slate-500">Đơn vị lương: triệu đồng/tháng. “Khoảng” là mức phổ biến (thấp – cao).</p>
    </section>
  );
}
