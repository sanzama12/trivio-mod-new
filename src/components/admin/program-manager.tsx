"use client";

/** A04 — chương trình đào tạo: lọc trường/ngành/hệ, mở trang sửa, thêm chương trình mới (ngăn kéo). */
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuPencil, LuPlus, LuSearch } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Drawer, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, selectCls, td, th } from "./ui";

export interface ProgramItem {
  id: string;
  code: string;
  name: string;
  schoolId: string;
  school: string;
  majorId: string;
  major: string;
  trainingType: string;
  cutoff: { year: number; score: number } | null;
  tuitionMin: number;
  tuitionMax: number;
  hidden: boolean;
  edited: boolean;
}

const TYPES = ["Chính quy", "Chất lượng cao", "Tiên tiến", "Quốc tế"] as const;
const blank = { schoolId: "", majorId: "", name: "", admissionCode: "", trainingType: "Chính quy", combos: [] as string[], quota: "", tuitionMin: "", tuitionMax: "", durationYears: "4", c2025: "", c2024: "", c2023: "", source: "" };
type Form = typeof blank;

export function ProgramManager({ rows, schools, majors, combos, initialQuery }: { rows: ProgramItem[]; schools: { id: string; name: string }[]; majors: { id: string; name: string; code: string }[]; combos: string[]; initialQuery: string }) {
  const { post, busy } = useAdminPost();
  const [q, setQ] = useState(initialQuery);
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState<{ field?: string; message?: string } | null>(null);

  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return rows.filter((r) => (!nq || normalizeVi(`${r.code} ${r.name} ${r.school} ${r.major}`).includes(nq)) && (!school || r.schoolId === school) && (!major || r.majorId === major) && (!type || r.trainingType === type));
  }, [rows, q, school, major, type]);
  const pg = paginate(filtered, page, 10);

  const save = async () => {
    if (!form) return;
    const res = await post("/api/admin/catalog", { entity: "program", action: "save", data: { ...form, cutoffs: { 2025: form.c2025, 2024: form.c2024, 2023: form.c2023 } } }, { success: "Đã thêm chương trình." });
    if (res.ok) setForm(null);
    else setErr({ field: res.field, message: res.message });
  };
  const fe = (f: string) => (err?.field === f ? <p className="mt-1 text-xs text-danger-700">{err.message}</p> : null);
  const bad = (f: string) => err?.field === f && "!border-danger-500";
  const set = (k: keyof Form, v: string | string[]) => form && setForm({ ...form, [k]: v });

  return (
    <>
      <Panel className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo tên chương trình</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo tên chương trình, mã…" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Trường" className={cn(selectCls, "max-w-[220px]")} value={school} onChange={(e) => (setSchool(e.target.value), setPage(1))}>
          <option value="">Trường: Tất cả</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select aria-label="Ngành" className={cn(selectCls, "max-w-[220px]")} value={major} onChange={(e) => (setMajor(e.target.value), setPage(1))}>
          <option value="">Ngành: Tất cả</option>
          {majors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select aria-label="Hệ đào tạo" className={selectCls} value={type} onChange={(e) => (setType(e.target.value), setPage(1))}>
          <option value="">Hệ đào tạo: Tất cả</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button onClick={() => (setErr(null), setForm({ ...blank, schoolId: school, majorId: major }))}>
          <LuPlus className="size-4" aria-hidden /> Thêm chương trình
        </Button>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Mã CT</th>
                <th className={th}>Tên chương trình</th>
                <th className={th}>Trường đại học</th>
                <th className={th}>Ngành liên kết</th>
                <th className={th}>Hệ ĐT</th>
                <th className={`${th} text-center`}>Điểm gần nhất</th>
                <th className={`${th} text-right`}>Học phí/năm</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.slice.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có chương trình nào khớp bộ lọc.
                  </td>
                </tr>
              )}
              {pg.slice.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-semibold text-slate-900`}>{r.code}</td>
                  <td className={`${td} max-w-[240px] font-semibold text-slate-900`}>
                    <Link href={`/quan-tri/chuong-trinh/${encodeURIComponent(r.id)}`} className="line-clamp-2 hover:text-primary-700 hover:underline">
                      {r.name}
                    </Link>
                    {r.edited && <span className="text-[11px] font-medium text-accent-700">Đã chỉnh sửa</span>}
                  </td>
                  <td className={`${td} text-slate-500`}>{r.school}</td>
                  <td className={`${td} text-slate-500`}>{r.major}</td>
                  <td className={td}>
                    <Badge tone="primary">{r.trainingType}</Badge>
                  </td>
                  <td className={`${td} text-center`}>
                    {r.cutoff ? (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-900 tabular-nums" title={`Năm ${r.cutoff.year}`}>
                        {r.cutoff.score.toFixed(2)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{r.tuitionMin === r.tuitionMax ? `${r.tuitionMin} tr` : `${r.tuitionMin}–${r.tuitionMax} tr`}</td>
                  <td className={td}>{r.hidden ? <Badge tone="slate">Tạm ẩn</Badge> : <Badge tone="success">Tuyển sinh</Badge>}</td>
                  <td className={`${td} text-right`}>
                    <Link href={`/quan-tri/chuong-trinh/${encodeURIComponent(r.id)}`} className="inline-flex rounded-md p-1.5 text-primary-600 hover:bg-primary-50" aria-label={`Sửa ${r.name}`}>
                      <LuPencil className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="chương trình" />
      </Panel>

      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        title="Thêm chương trình đào tạo"
        subtitle="Số liệu lấy từ đề án tuyển sinh chính thức của trường"
        width="max-w-[560px]"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Hủy
            </Button>
            <Button onClick={save} disabled={busy}>
              Lưu chương trình
            </Button>
          </>
        }
      >
        {form && (
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
            {err && !err.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-school" className="text-sm font-semibold text-slate-800">
                  Trường <span className="text-danger-600">*</span>
                </label>
                <select id="p-school" data-autofocus className={cn(selectCls, "mt-1.5 w-full", bad("schoolId"))} value={form.schoolId} onChange={(e) => set("schoolId", e.target.value)}>
                  <option value="">Chọn trường…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {fe("schoolId")}
              </div>
              <div>
                <label htmlFor="p-major" className="text-sm font-semibold text-slate-800">
                  Ngành liên kết <span className="text-danger-600">*</span>
                </label>
                <select id="p-major" className={cn(selectCls, "mt-1.5 w-full", bad("majorId"))} value={form.majorId} onChange={(e) => set("majorId", e.target.value)}>
                  <option value="">Chọn ngành…</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.name}
                    </option>
                  ))}
                </select>
                {fe("majorId")}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <label htmlFor="p-name" className="text-sm font-semibold text-slate-800">
                  Tên chương trình
                </label>
                <input id="p-name" className={cn(inputCls, "mt-1.5")} maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Để trống = tên ngành" />
              </div>
              <div>
                <label htmlFor="p-code" className="text-sm font-semibold text-slate-800">
                  Mã xét tuyển <span className="text-danger-600">*</span>
                </label>
                <input id="p-code" className={cn(inputCls, "mt-1.5 uppercase", bad("admissionCode"))} maxLength={20} value={form.admissionCode} onChange={(e) => set("admissionCode", e.target.value.toUpperCase())} />
                {fe("admissionCode")}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="p-type" className="text-sm font-semibold text-slate-800">
                  Hệ đào tạo
                </label>
                <select id="p-type" className={cn(selectCls, "mt-1.5 w-full")} value={form.trainingType} onChange={(e) => set("trainingType", e.target.value)}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="p-quota" className="text-sm font-semibold text-slate-800">
                  Chỉ tiêu <span className="text-danger-600">*</span>
                </label>
                <input id="p-quota" inputMode="numeric" className={cn(inputCls, "mt-1.5", bad("quota"))} value={form.quota} onChange={(e) => set("quota", e.target.value)} />
                {fe("quota")}
              </div>
              <div>
                <label htmlFor="p-years" className="text-sm font-semibold text-slate-800">
                  Số năm
                </label>
                <input id="p-years" inputMode="decimal" className={cn(inputCls, "mt-1.5", bad("durationYears"))} value={form.durationYears} onChange={(e) => set("durationYears", e.target.value)} />
                {fe("durationYears")}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-tmin" className="text-sm font-semibold text-slate-800">
                  Học phí tối thiểu (triệu/năm) <span className="text-danger-600">*</span>
                </label>
                <input id="p-tmin" inputMode="decimal" className={cn(inputCls, "mt-1.5", bad("tuitionMin"))} value={form.tuitionMin} onChange={(e) => set("tuitionMin", e.target.value)} />
                {fe("tuitionMin")}
              </div>
              <div>
                <label htmlFor="p-tmax" className="text-sm font-semibold text-slate-800">
                  Học phí tối đa (triệu/năm)
                </label>
                <input id="p-tmax" inputMode="decimal" className={cn(inputCls, "mt-1.5")} value={form.tuitionMax} onChange={(e) => set("tuitionMax", e.target.value)} placeholder="= tối thiểu" />
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">Điểm chuẩn THPT (thang 30)</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-3">
                {(["c2025", "c2024", "c2023"] as const).map((k) => (
                  <label key={k} className="text-xs text-slate-500">
                    {k.slice(1)}
                    <input inputMode="decimal" className={cn(inputCls, "mt-1", bad("cutoffs"))} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                  </label>
                ))}
              </div>
              {fe("cutoffs")}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">Tổ hợp xét tuyển</legend>
              <div className={cn("mt-1.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2", bad("combos"))}>
                {combos.map((c) => {
                  const on = form.combos.includes(c);
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => set("combos", on ? form.combos.filter((x) => x !== c) : [...form.combos, c])} className={cn("rounded-md px-2 py-1 text-xs font-semibold", on ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                      {c}
                    </button>
                  );
                })}
              </div>
              {fe("combos")}
            </fieldset>
            <div>
              <label htmlFor="p-src" className="text-sm font-semibold text-slate-800">
                Nguồn dữ liệu <span className="text-danger-600">*</span>
              </label>
              <input id="p-src" className={cn(inputCls, "mt-1.5", bad("source"))} maxLength={200} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="VD: Đề án tuyển sinh 2026 của trường" />
              {fe("source")}
            </div>
          </form>
        )}
      </Drawer>
    </>
  );
}
