"use client";

/** A02 — danh sách trường + ngăn kéo "Thêm trường mới / Sửa trường" (kiểm tra từng ô như Figma). */
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuCheck, LuPencil, LuPlus, LuSearch, LuTrash2, LuTriangleAlert, LuUndo2, LuX } from "react-icons/lu";
import type { Region, SchoolType } from "@/domain/types";
import { PROVINCES } from "@/domain/provinces";
import { SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Dialog, Drawer, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, selectCls, td, th } from "./ui";

export interface SchoolItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: SchoolType;
  city: string;
  region: Region;
  website: string;
  description: string;
  campuses: number;
  majors: number;
  programs: number;
  hidden: boolean;
  custom: boolean;
  slug: string;
}

const REGION_LABEL: Record<Region, string> = { bac: "Miền Bắc", trung: "Miền Trung", nam: "Miền Nam" };
const TYPE_TONE = { "cong-lap": "success", "tu-thuc": "accent", "quoc-te": "violet" } as const;

type Form = { id?: string; name: string; code: string; type: SchoolType | ""; city: string; website: string; description: string };
const blank: Form = { name: "", code: "", type: "", city: "", website: "", description: "" };

/** Kiểm tra phía client (giống server) để hiện trạng thái từng ô ngay khi nhập. */
function check(f: Form) {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 4) errors.name = "Tên trường là bắt buộc";
  if (!f.code.trim()) errors.code = "Mã trường là bắt buộc";
  else if (!/^[A-Z0-9]{2,6}$/.test(f.code.trim().toUpperCase())) errors.code = "Mã trường gồm 2–6 chữ in hoa hoặc số";
  if (!f.type) errors.type = "Chọn loại hình";
  if (!f.city) errors.city = "Vui lòng chọn khu vực";
  const w = f.website.trim();
  const warning = w && (!/^https:\/\//i.test(w) || !/\.edu\.vn(\/.*)?$/i.test(w.replace(/^https?:\/\//i, ""))) ? "URL chưa được xác minh" : null;
  return { errors, warning };
}

function FieldShell({ state, children, icon }: { state: "ok" | "error" | "warn" | "idle"; children: React.ReactNode; icon?: boolean }) {
  return (
    <div className="relative">
      {children}
      {icon !== false && state !== "idle" && (
        <span className={cn("pointer-events-none absolute top-1/2 right-3 -translate-y-1/2", state === "ok" ? "text-success-700" : state === "warn" ? "text-accent-700" : "text-danger-700")} aria-hidden>
          {state === "ok" ? <LuCheck className="size-4" /> : state === "warn" ? <LuTriangleAlert className="size-4" /> : <LuX className="size-4" />}
        </span>
      )}
    </div>
  );
}

const ring = (state: "ok" | "error" | "warn" | "idle") =>
  state === "ok" ? "!border-success-500" : state === "error" ? "!border-danger-500" : state === "warn" ? "!border-accent-500" : "";

export function SchoolManager({ rows }: { rows: SchoolItem[] }) {
  const { post, busy, refresh, toast } = useAdminPost();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Form | null>(null);
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());
  const [serverErr, setServerErr] = useState<{ field?: string; message?: string } | null>(null);
  const [confirm, setConfirm] = useState<SchoolItem | null>(null);

  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return rows.filter(
      (r) =>
        (!nq || normalizeVi(`${r.code} ${r.name} ${r.shortName}`).includes(nq)) &&
        (!type || r.type === type) &&
        (!region || r.region === region) &&
        (!status || (status === "hidden") === r.hidden),
    );
  }, [rows, q, type, region, status]);
  const pg = paginate(filtered, page, 8);
  const allOnPage = pg.slice.length > 0 && pg.slice.every((r) => selected.has(r.id));

  const open = (r?: SchoolItem) => {
    setForm(r ? { id: r.id, name: r.name, code: r.code, type: r.type, city: r.city, website: r.website, description: r.description } : { ...blank });
    setTouched(new Set());
    setServerErr(null);
  };
  const v = form ? check(form) : { errors: {}, warning: null };
  const state = (k: keyof Form): "ok" | "error" | "warn" | "idle" => {
    if (!form || !touched.has(k)) return serverErr?.field === k ? "error" : "idle";
    if (serverErr?.field === k) return "error";
    if (v.errors[k]) return "error";
    if (k === "website") return form.website ? (v.warning ? "warn" : "ok") : "idle";
    return k === "description" ? "idle" : "ok";
  };
  const msg = (k: keyof Form) => (serverErr?.field === k ? serverErr.message : touched.has(k) ? v.errors[k] : undefined);
  const set = (k: keyof Form, val: string) => {
    setForm((f) => (f ? { ...f, [k]: val } : f));
    setTouched((t) => new Set(t).add(k));
    if (serverErr?.field === k) setServerErr(null);
  };

  const save = async () => {
    if (!form) return;
    setTouched(new Set(["name", "code", "type", "city", "website"] as (keyof Form)[]));
    if (Object.keys(v.errors).length) return;
    const res = await post("/api/admin/catalog", { entity: "school", action: "save", data: { ...form, code: form.code.trim().toUpperCase() } }, { success: form.id ? "Đã lưu thay đổi trường." : "Đã thêm trường mới." });
    if (res.ok) setForm(null);
    else setServerErr({ field: res.field, message: res.message });
  };

  const bulk = async (hidden: boolean) => {
    let n = 0;
    for (const id of selected) if ((await post("/api/admin/catalog", { entity: "school", action: hidden ? "hide" : "show", id }, { refresh: false })).ok) n++;
    setSelected(new Set());
    toast(`${hidden ? "Đã tạm ẩn" : "Đã hiển thị lại"} ${n} trường.`, "success");
    refresh();
  };

  return (
    <>
      <Panel className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo tên trường</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo tên trường…" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Loại hình" className={selectCls} value={type} onChange={(e) => (setType(e.target.value), setPage(1))}>
          <option value="">Loại hình: Tất cả</option>
          {Object.entries(SCHOOL_TYPE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="Khu vực" className={selectCls} value={region} onChange={(e) => (setRegion(e.target.value), setPage(1))}>
          <option value="">Khu vực: Tất cả</option>
          {Object.entries(REGION_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="Trạng thái" className={selectCls} value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="hidden">Tạm ẩn</option>
        </select>
        <Button onClick={() => open()}>
          <LuPlus className="size-4" aria-hidden /> Thêm trường mới
        </Button>
      </Panel>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary-50 px-4 py-2.5 text-sm">
          <span className="font-semibold text-primary-800">{selected.size} trường đã chọn</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk(true)}>
            Tạm ẩn
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk(false)}>
            Hiển thị lại
          </Button>
          <button type="button" className="text-sm text-slate-600 hover:underline" onClick={() => setSelected(new Set())}>
            Bỏ chọn
          </button>
        </div>
      )}

      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={`${th} w-10`}>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả trên trang"
                    className="size-4 accent-primary-600"
                    checked={allOnPage}
                    onChange={() => setSelected((s) => {
                      const n = new Set(s);
                      pg.slice.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
                      return n;
                    })}
                  />
                </th>
                <th className={th}>Mã trường</th>
                <th className={th}>Tên trường</th>
                <th className={th}>Loại hình</th>
                <th className={th}>Khu vực</th>
                <th className={`${th} text-center`}>Số cơ sở</th>
                <th className={`${th} text-center`}>Số ngành</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.slice.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có trường nào khớp bộ lọc.
                  </td>
                </tr>
              )}
              {pg.slice.map((r) => (
                <tr key={r.id} className={r.hidden ? "bg-slate-50/60" : undefined}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${r.name}`}
                      className="size-4 accent-primary-600"
                      checked={selected.has(r.id)}
                      onChange={() => setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(r.id)) n.delete(r.id);
                        else n.add(r.id);
                        return n;
                      })}
                    />
                  </td>
                  <td className={`${td} font-semibold text-slate-900`}>{r.code}</td>
                  <td className={`${td} font-semibold text-slate-900`}>
                    {r.hidden ? r.name : <Link href={`/truong/${r.slug}`} className="hover:text-primary-700 hover:underline">{r.name}</Link>}
                  </td>
                  <td className={td}>
                    <Badge tone={TYPE_TONE[r.type]}>{SCHOOL_TYPE_LABELS[r.type]}</Badge>
                  </td>
                  <td className={`${td} text-slate-500`}>{r.city}</td>
                  <td className={`${td} text-center tabular-nums`}>{r.campuses}</td>
                  <td className={`${td} text-center tabular-nums`}>{r.majors}</td>
                  <td className={td}>{r.hidden ? <Badge tone="slate">Tạm ẩn</Badge> : <Badge tone="success">Hoạt động</Badge>}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    <button type="button" onClick={() => open(r)} className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50" aria-label={`Sửa ${r.name}`}>
                      <LuPencil className="size-4" aria-hidden />
                    </button>
                    {r.hidden ? (
                      <button type="button" disabled={busy} onClick={() => post("/api/admin/catalog", { entity: "school", action: "show", id: r.id }, { success: "Đã hiển thị lại trường." })} className="rounded-md p-1.5 text-success-700 hover:bg-success-50" aria-label={`Hiển thị lại ${r.name}`}>
                        <LuUndo2 className="size-4" aria-hidden />
                      </button>
                    ) : (
                      <button type="button" onClick={() => setConfirm(r)} className="rounded-md p-1.5 text-danger-600 hover:bg-danger-50" aria-label={`Tạm ẩn ${r.name}`}>
                        <LuTrash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="trường" />
      </Panel>

      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Sửa thông tin trường" : "Thêm trường mới"}
        subtitle="Điền thông tin tuyển sinh chi tiết"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Hủy
            </Button>
            <Button onClick={save} disabled={busy}>
              Lưu trường
            </Button>
          </>
        }
      >
        {form && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            noValidate
          >
            {serverErr && !serverErr.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{serverErr.message}</p>}
            <div>
              <label htmlFor="s-name" className="text-sm font-semibold text-slate-800">
                Tên trường <span className="text-danger-600">*</span>
              </label>
              <FieldShell state={state("name")}>
                <input id="s-name" data-autofocus className={cn(inputCls, "mt-1.5 h-11 pr-9", ring(state("name")))} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} aria-invalid={state("name") === "error"} aria-describedby="s-name-err" placeholder="VD: Trường Đại học ABC" />
              </FieldShell>
              {msg("name") && <p id="s-name-err" className="mt-1 text-xs text-danger-700">{msg("name")}</p>}
            </div>
            <div>
              <label htmlFor="s-code" className="text-sm font-semibold text-slate-800">
                Mã trường <span className="text-danger-600">*</span>
              </label>
              <FieldShell state={state("code")}>
                <input id="s-code" className={cn(inputCls, "mt-1.5 h-11 pr-9 uppercase", ring(state("code")))} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={6} aria-invalid={state("code") === "error"} aria-describedby="s-code-err" placeholder="Ví dụ: BKA, KHA…" />
              </FieldShell>
              {msg("code") && <p id="s-code-err" className="mt-1 text-xs text-danger-700">{msg("code")}</p>}
            </div>
            <div>
              <label htmlFor="s-type" className="text-sm font-semibold text-slate-800">
                Loại hình <span className="text-danger-600">*</span>
              </label>
              <select id="s-type" className={cn(selectCls, "mt-1.5 h-11 w-full", ring(state("type")))} value={form.type} onChange={(e) => set("type", e.target.value)} aria-invalid={state("type") === "error"}>
                <option value="">Chọn loại hình…</option>
                {Object.entries(SCHOOL_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              {msg("type") && <p className="mt-1 text-xs text-danger-700">{msg("type")}</p>}
            </div>
            <div>
              <label htmlFor="s-city" className="text-sm font-semibold text-slate-800">
                Khu vực <span className="text-danger-600">*</span>
              </label>
              <select id="s-city" className={cn(selectCls, "mt-1.5 h-11 w-full", ring(state("city")))} value={form.city} onChange={(e) => set("city", e.target.value)} aria-invalid={state("city") === "error"} aria-describedby="s-city-err">
                <option value="">Chọn tỉnh, thành phố…</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {msg("city") && <p id="s-city-err" className="mt-1 text-xs text-danger-700">{msg("city")}</p>}
            </div>
            <div>
              <label htmlFor="s-web" className="text-sm font-semibold text-slate-800">
                Website trường
              </label>
              <FieldShell state={state("website")}>
                <input id="s-web" className={cn(inputCls, "mt-1.5 h-11 pr-9", ring(state("website")))} value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={200} placeholder="https://tuyensinh.abc.edu.vn" aria-describedby="s-web-hint" />
              </FieldShell>
              {msg("website") ? (
                <p id="s-web-hint" className="mt-1 text-xs text-danger-700">{msg("website")}</p>
              ) : state("website") === "warn" ? (
                <p id="s-web-hint" className="mt-1 text-xs text-accent-700">URL chưa được xác minh (nên là https và thuộc .edu.vn)</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="s-desc" className="text-sm font-semibold text-slate-800">
                Mô tả tóm tắt
              </label>
              <textarea id="s-desc" rows={4} className={cn(inputCls, "mt-1.5 h-auto py-2.5")} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} placeholder="Nhập thông tin giới thiệu chung…" />
            </div>
          </form>
        )}
      </Drawer>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Tạm ẩn trường này?"
        subtitle={confirm?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                const r = confirm;
                setConfirm(null);
                if (r) await post("/api/admin/catalog", { entity: "school", action: "hide", id: r.id }, { success: "Đã tạm ẩn trường." });
              }}
            >
              Tạm ẩn
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Trường và {confirm?.programs ?? 0} chương trình của trường sẽ không hiện cho học sinh. Dữ liệu được giữ nguyên và có thể hiển thị lại bất cứ lúc nào.
        </p>
      </Dialog>
    </>
  );
}
