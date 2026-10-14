"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuPencil, LuSearch } from "react-icons/lu";
import { formatMonthVi, formatScore, formatTuitionShort } from "@/lib/format";
import { matchesQuery } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";

export interface AdminRow {
  id: string;
  name: string;
  school: string;
  cutoff: number | null;
  tuition: [number, number];
  source: string;
  updatedAt: string; // YYYY-MM
  edited: boolean;
}

/** Chương trình cần kiểm tra lại: lần cập nhật cách đây hơn 6 tháng. */
function isStale(ym: string, now = new Date()) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return true;
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) > 6;
}

export function AdminProgramTable({ items }: { items: AdminRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "edited" | "stale">("all");
  const list = useMemo(
    () =>
      items.filter(
        (r) => (!q || matchesQuery(q, r.name, r.school, r.id)) && (filter === "all" || (filter === "edited" ? r.edited : isStale(r.updatedAt))),
      ),
    [items, q, filter],
  );
  const stale = items.filter((r) => isStale(r.updatedAt)).length;

  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Chương trình", items.length],
          ["Đã chỉnh so với dữ liệu gốc", items.filter((r) => r.edited).length],
          ["Cần kiểm tra lại (> 6 tháng)", stale],
        ].map(([l, n]) => (
          <Card key={l} className="p-4">
            <p className="text-2xl font-extrabold text-primary-600">{n}</p>
            <p className="text-[13px] text-slate-600">{l}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="admin-q" className="sr-only">
            Tìm chương trình
          </label>
          <Input id="admin-q" placeholder="Tìm theo tên chương trình, trường, mã…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-[13px]" role="group" aria-label="Lọc">
          {(
            [
              ["all", "Tất cả"],
              ["edited", "Đã chỉnh"],
              ["stale", "Cần kiểm tra"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn("rounded-md px-3 py-1.5 font-semibold", filter === k ? "bg-white text-primary-700 shadow-sm" : "text-slate-600")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Chương trình</th>
              <th scope="col" className="px-4 py-3 text-right">Chuẩn THPT</th>
              <th scope="col" className="px-4 py-3">Học phí</th>
              <th scope="col" className="px-4 py-3">Nguồn</th>
              <th scope="col" className="px-4 py-3">Cập nhật</th>
              <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.school}
                    {r.edited && <span className="ml-2 rounded-full bg-accent-50 px-1.5 py-0.5 font-semibold text-accent-700">Đã chỉnh</span>}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-bold text-primary-700">{formatScore(r.cutoff)}</td>
                <td className="px-4 py-3 text-slate-700">{formatTuitionShort(r.tuition[0], r.tuition[1])}</td>
                <td className="max-w-56 truncate px-4 py-3 text-slate-600" title={r.source}>
                  {r.source}
                </td>
                <td className={cn("px-4 py-3", isStale(r.updatedAt) ? "font-semibold text-accent-700" : "text-slate-600")}>{formatMonthVi(r.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/quan-tri/chuong-trinh/${encodeURIComponent(r.id)}`} className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
                    <LuPencil className="size-3.5" aria-hidden /> Sửa
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Không có chương trình phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
