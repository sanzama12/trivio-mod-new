"use client";

/** A03 — danh mục ngành: lọc theo nhóm/trạng thái, thêm/sửa ngành (mã 7 số, nhóm, 3 nhóm Holland), duyệt / tạm ẩn. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuCheck, LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Dialog, Drawer, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, selectCls, td, th } from "./ui";

export interface MajorItem {
  id: string;
  slug: string;
  code: string;
  name: string;
  groupId: string;
  groupName: string;
  riasec: RiasecType[];
  summary: string;
  programs: number;
  hidden: boolean;
}

type Form = { id?: string; code: string; name: string; groupId: string; riasec: [string, string, string]; summary: string };

export function MajorManager({ rows, groups }: { rows: MajorItem[]; groups: { id: string; name: string }[] }) {
  const { post, busy } = useAdminPost();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState<{ field?: string; message?: string } | null>(null);
  const [confirm, setConfirm] = useState<MajorItem | null>(null);

  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return rows.filter((r) => (!nq || normalizeVi(`${r.code} ${r.name}`).includes(nq)) && (!group || r.groupId === group) && (!status || (status === "pending") === r.hidden));
  }, [rows, q, group, status]);
  const pg = paginate(filtered, page, 8);

  const open = (r?: MajorItem) => {
    setErr(null);
    setForm(r ? { id: r.id, code: r.code, name: r.name, groupId: r.groupId, riasec: [r.riasec[0], r.riasec[1], r.riasec[2]], summary: r.summary } : { code: "", name: "", groupId: "", riasec: ["", "", ""], summary: "" });
  };
  const save = async () => {
    if (!form) return;
    const res = await post("/api/admin/catalog", { entity: "major", action: "save", data: form }, { success: form.id ? "Đã lưu ngành." : "Đã thêm ngành (đang chờ duyệt)." });
    if (res.ok) setForm(null);
    else setErr({ field: res.field, message: res.message });
  };
  const fieldErr = (f: string) => (err?.field === f ? <p className="mt-1 text-xs text-danger-700">{err.message}</p> : null);

  return (
    <>
      <Panel className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo tên hoặc mã ngành</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo tên hoặc mã ngành…" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Nhóm ngành" className={selectCls} value={group} onChange={(e) => (setGroup(e.target.value), setPage(1))}>
          <option value="">Nhóm ngành: Tất cả</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select aria-label="Trạng thái" className={selectCls} value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="approved">Đã duyệt</option>
          <option value="pending">Chờ duyệt</option>
        </select>
        <Button onClick={() => open()}>
          <LuPlus className="size-4" aria-hidden /> Thêm ngành mới
        </Button>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Mã ngành</th>
                <th className={th}>Tên ngành</th>
                <th className={th}>Nhóm ngành</th>
                <th className={th}>Mô tả tóm tắt</th>
                <th className={`${th} text-center`}>Số CTĐT</th>
                <th className={th}>Hướng nghiệp</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.slice.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có ngành nào khớp bộ lọc.
                  </td>
                </tr>
              )}
              {pg.slice.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-semibold text-slate-900 tabular-nums`}>{r.code}</td>
                  <td className={`${td} font-semibold text-slate-900`}>{r.hidden ? r.name : <Link href={`/nganh/${r.slug}`} className="hover:text-primary-700 hover:underline">{r.name}</Link>}</td>
                  <td className={td}>
                    <Badge tone="primary">{r.groupName}</Badge>
                  </td>
                  <td className={`${td} max-w-[220px] truncate text-slate-500`} title={r.summary}>
                    {r.summary}
                  </td>
                  <td className={`${td} text-center tabular-nums`}>{r.programs}</td>
                  <td className={td}>
                    <span className="flex gap-1">
                      {r.riasec.map((t) => (
                        <span key={t} title={RIASEC_INFO[t].label} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className={td}>{r.hidden ? <Badge tone="accent">Chờ duyệt</Badge> : <Badge tone="success">Đã duyệt</Badge>}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {r.hidden && (
                      <button type="button" disabled={busy} onClick={() => post("/api/admin/catalog", { entity: "major", action: "show", id: r.id }, { success: "Đã duyệt ngành." })} className="rounded-md p-1.5 text-success-700 hover:bg-success-50" aria-label={`Duyệt ${r.name}`} title="Duyệt">
                        <LuCheck className="size-4" aria-hidden />
                      </button>
                    )}
                    <button type="button" onClick={() => open(r)} className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50" aria-label={`Sửa ${r.name}`}>
                      <LuPencil className="size-4" aria-hidden />
                    </button>
                    {!r.hidden && (
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
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="ngành" />
      </Panel>

      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Sửa ngành" : "Thêm ngành mới"}
        subtitle="Mã ngành theo danh mục của Bộ GD&ĐT (7 chữ số)"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Hủy
            </Button>
            <Button onClick={save} disabled={busy}>
              Lưu ngành
            </Button>
          </>
        }
      >
        {form && (
          <form className="space-y-5" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
            {err && !err.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
            <div>
              <label htmlFor="m-code" className="text-sm font-semibold text-slate-800">
                Mã ngành <span className="text-danger-600">*</span>
              </label>
              <input id="m-code" data-autofocus inputMode="numeric" maxLength={7} className={cn(inputCls, "mt-1.5 h-11", err?.field === "code" && "!border-danger-500")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })} placeholder="VD: 7480201" />
              {fieldErr("code")}
            </div>
            <div>
              <label htmlFor="m-name" className="text-sm font-semibold text-slate-800">
                Tên ngành <span className="text-danger-600">*</span>
              </label>
              <input id="m-name" maxLength={120} className={cn(inputCls, "mt-1.5 h-11", err?.field === "name" && "!border-danger-500")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {fieldErr("name")}
            </div>
            <div>
              <label htmlFor="m-group" className="text-sm font-semibold text-slate-800">
                Nhóm ngành <span className="text-danger-600">*</span>
              </label>
              <select id="m-group" className={cn(selectCls, "mt-1.5 h-11 w-full", err?.field === "groupId" && "!border-danger-500")} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">Chọn nhóm ngành…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {fieldErr("groupId")}
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">
                Hướng nghiệp (3 nhóm Holland, theo thứ tự) <span className="text-danger-600">*</span>
              </legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <select
                    key={i}
                    aria-label={`Nhóm Holland thứ ${i + 1}`}
                    className={cn(selectCls, "h-11", err?.field === "riasec" && "!border-danger-500")}
                    value={form.riasec[i]}
                    onChange={(e) => {
                      const next = [...form.riasec] as Form["riasec"];
                      next[i] = e.target.value;
                      setForm({ ...form, riasec: next });
                    }}
                  >
                    <option value="">—</option>
                    {RIASEC_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {t} – {RIASEC_INFO[t].label}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              {fieldErr("riasec")}
            </fieldset>
            <div>
              <label htmlFor="m-sum" className="text-sm font-semibold text-slate-800">
                Mô tả tóm tắt <span className="text-danger-600">*</span>
              </label>
              <textarea id="m-sum" rows={4} maxLength={300} className={cn(inputCls, "mt-1.5 h-auto py-2.5", err?.field === "summary" && "!border-danger-500")} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              {fieldErr("summary")}
            </div>
            {!form.id && <p className="rounded-lg bg-primary-50 px-3 py-2 text-[13px] text-primary-800">Ngành mới ở trạng thái “Chờ duyệt” — chưa hiện cho học sinh cho tới khi bạn bấm Duyệt.</p>}
          </form>
        )}
      </Drawer>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Tạm ẩn ngành này?"
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
                if (r) await post("/api/admin/catalog", { entity: "major", action: "hide", id: r.id }, { success: "Đã chuyển ngành về Chờ duyệt (tạm ẩn)." });
              }}
            >
              Tạm ẩn
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Ngành và {confirm?.programs ?? 0} chương trình liên kết sẽ không hiện cho học sinh. Có thể duyệt lại bất cứ lúc nào.</p>
      </Dialog>
    </>
  );
}
