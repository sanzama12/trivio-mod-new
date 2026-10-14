"use client";

/** A01 — bảng "Vấn đề dữ liệu cần xử lý": lọc theo loại dữ liệu, trường, tìm kiếm; 5 dòng/trang. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import type { DataIssue } from "@/services/data-ops.service";
import { Badge } from "@/components/ui/badge";
import { normalizeVi } from "@/lib/text";
import { Pager, paginate } from "./overlay";
import { fmtDate, inputCls, selectCls, td, th } from "./ui";

const SEVERITY = { high: { label: "Chờ xử lý", tone: "accent" }, medium: { label: "Chờ xử lý", tone: "accent" }, low: { label: "Đang xem xét", tone: "primary" } } as const;

export function DataIssues({ issues }: { issues: DataIssue[] }) {
  const [type, setType] = useState("");
  const [school, setSchool] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const types = useMemo(() => [...new Set(issues.map((i) => i.dataType))].sort((a, b) => a.localeCompare(b, "vi")), [issues]);
  const schools = useMemo(() => [...new Set(issues.map((i) => i.target.split(" · ")[0]))].sort((a, b) => a.localeCompare(b, "vi")), [issues]);
  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return issues.filter((i) => (!type || i.dataType === type) && (!school || i.target.startsWith(school)) && (!nq || normalizeVi(`${i.target} ${i.problem} ${i.detail}`).includes(nq)));
  }, [issues, type, school, q]);
  const pg = paginate(filtered, page, 5);

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="iss-type">
          Loại dữ liệu
        </label>
        <select id="iss-type" className={selectCls} value={type} onChange={(e) => (setType(e.target.value), setPage(1))}>
          <option value="">Loại dữ liệu: Tất cả</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="iss-school">
          Trường
        </label>
        <select id="iss-school" className={selectCls} value={school} onChange={(e) => (setSchool(e.target.value), setPage(1))}>
          <option value="">Trường/Ngành: Tất cả</option>
          {schools.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo tên chương trình</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" className={`${inputCls} pl-9`} placeholder="Tìm theo tên chương trình…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        </label>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[860px]">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Loại dữ liệu</th>
              <th className={th}>Trường/Ngành</th>
              <th className={th}>Vấn đề</th>
              <th className={th}>Ngày phát hiện</th>
              <th className={th}>Trạng thái</th>
              <th className={`${th} text-right`}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pg.slice.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Không có vấn đề nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {pg.slice.map((i) => (
              <tr key={i.id}>
                <td className={`${td} text-slate-500`}>{i.dataType}</td>
                <td className={`${td} max-w-[220px] truncate font-semibold text-slate-900`} title={i.target}>
                  {i.target}
                </td>
                <td className={`${td} max-w-[320px]`}>
                  <span className="line-clamp-2" title={`${i.problem} — ${i.detail}`}>
                    {i.problem}
                  </span>
                </td>
                <td className={`${td} whitespace-nowrap text-slate-500`}>{i.at ? fmtDate(i.at) : "Kiểm tra tự động"}</td>
                <td className={td}>
                  <Badge tone={SEVERITY[i.severity].tone}>{i.severity === "high" ? "Ưu tiên cao" : SEVERITY[i.severity].label}</Badge>
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {i.viewHref && (
                    <Link href={i.viewHref} className="mr-3 text-sm font-semibold text-primary-600 hover:underline" {...(i.viewHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      Xem
                    </Link>
                  )}
                  <Link href={i.href} className="inline-flex rounded-lg border border-primary-600 px-3 py-1 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                    Xử lý
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="vấn đề" />
      </div>
    </>
  );
}
