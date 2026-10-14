"use client";

/**
 * A05 — Điểm chuẩn & học phí.
 * Tab "Điểm chuẩn theo năm": sửa nhanh điểm năm mới nhất ngay trên bảng, chọn nhiều dòng → "Xác minh hàng loạt",
 * bảng "Cập nhật nguồn tham chiếu" (URL https, ngày kiểm tra, ghi chú). Tab "Học phí theo khóa": sửa học phí, ước tính toàn khoá.
 */
import { useMemo, useState } from "react";
import { LuLink, LuSearch, LuX } from "react-icons/lu";
import type { ScoreRow } from "@/services/data-ops.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Dialog, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { fmtDate, inputCls, Panel, selectCls, td, th } from "./ui";

const STATUS = { verified: { label: "Đã xác minh", tone: "success" }, pending: { label: "Chờ xác minh", tone: "accent" }, missing: { label: "Thiếu dữ liệu", tone: "danger" } } as const;

async function patchProgram(id: string, body: unknown) {
  const res = await fetch(`/api/admin/programs/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json().catch(() => ({ ok: false, message: "Phản hồi không hợp lệ." }))) as { ok: boolean; message?: string; changes?: number };
}

/** Ô sửa nhanh một con số (Enter/blur = lưu, Esc = huỷ). */
function QuickNumber({ value, label, onSave, max, step = "0.01", width = "w-20" }: { value: number | null; label: string; onSave: (v: string) => Promise<boolean>; max: number; step?: string; width?: string }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const dirty = v !== (value == null ? "" : String(value));
  const commit = async () => {
    if (!dirty) return;
    const n = Number(v.replace(",", "."));
    if (v !== "" && (!Number.isFinite(n) || n <= 0 || n > max)) return setState("error");
    setState("saving");
    setState((await onSave(v)) ? "idle" : "error");
  };
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      step={step}
      value={v}
      placeholder="–"
      onChange={(e) => (setV(e.target.value), setState("idle"))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setV(value == null ? "" : String(value));
      }}
      aria-invalid={state === "error"}
      className={cn(
        "h-8 rounded-md border px-2 text-center text-sm font-semibold tabular-nums focus:ring-2 focus:ring-primary-100 focus:outline-none",
        width,
        state === "error" ? "border-danger-500 bg-danger-50 text-danger-700" : dirty ? "border-accent-500 bg-accent-50" : value == null ? "border-danger-200 bg-danger-50/50" : "border-slate-300 bg-white",
        state === "saving" && "opacity-60",
      )}
    />
  );
}

export function ScoreManager({ rows, latestYear, initialQuery, initialTab }: { rows: ScoreRow[]; latestYear: number; initialQuery: string; initialTab: "scores" | "tuition" }) {
  const { post, busy, refresh, toast } = useAdminPost();
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState(initialQuery);
  const [school, setSchool] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<ScoreRow | null>(null);
  const [srcForm, setSrcForm] = useState({ sourceUrl: "", sourceCheckedAt: "", sourceNote: "" });
  const [srcErr, setSrcErr] = useState<{ field?: string; message?: string } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const years = [latestYear, latestYear - 1, latestYear - 2];

  const schools = useMemo(() => [...new Map(rows.map((r) => [r.schoolId, r.school])).entries()].sort((a, b) => a[1].localeCompare(b[1], "vi")), [rows]);
  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return rows.filter((r) => !r.hidden && (!nq || normalizeVi(`${r.admissionCode} ${r.name} ${r.school}`).includes(nq)) && (!school || r.schoolId === school) && (!status || r.status === status));
  }, [rows, q, school, status]);
  const pg = paginate(filtered, page, 12);
  const allOnPage = pg.slice.length > 0 && pg.slice.every((r) => selected.has(r.id));
  const filteredOn = q || school || status;

  const saveScore = async (r: ScoreRow, year: number, raw: string) => {
    const others = r.cutoffs.filter((c) => c.year !== year);
    const cutoffs = raw === "" ? others : [...others, { year, score: Number(raw.replace(",", ".")) }];
    const res = await patchProgram(r.id, { cutoffs });
    if (!res.ok) toast(res.message ?? "Không lưu được điểm.", "warning");
    else {
      toast(`Đã lưu điểm ${year} – ${r.admissionCode}.`, "success");
      refresh();
    }
    return res.ok;
  };
  const saveTuition = async (r: ScoreRow, key: "tuitionMin" | "tuitionMax", raw: string) => {
    const n = Number(raw.replace(",", "."));
    const body = key === "tuitionMin" ? { tuitionMin: n, tuitionMax: Math.max(n, r.tuitionMax) } : { tuitionMax: n };
    const res = await patchProgram(r.id, body);
    if (!res.ok) toast(res.message ?? "Không lưu được học phí.", "warning");
    else {
      toast(`Đã lưu học phí – ${r.admissionCode}.`, "success");
      refresh();
    }
    return res.ok;
  };

  const openSource = (r: ScoreRow) => {
    setSource(r);
    setSrcErr(null);
    setSrcForm({ sourceUrl: r.sourceUrl ?? "", sourceCheckedAt: r.sourceCheckedAt ?? new Date().toISOString().slice(0, 10), sourceNote: r.sourceNote ?? "" });
  };
  const saveSource = async () => {
    if (!source) return;
    const res = await post("/api/admin/scores", { action: "source", id: source.id, ...srcForm }, { success: "Đã cập nhật nguồn tham chiếu." });
    if (res.ok) setSource(null);
    else setSrcErr({ field: res.field, message: res.message });
  };
  const bulkVerify = async () => {
    const res = await post("/api/admin/scores", { action: "verify", ids: [...selected] }, { refresh: true });
    if (res.ok) {
      toast(`Đã xác minh ${res.verified} bản ghi${Number(res.skipped) ? ` · bỏ qua ${res.skipped} dòng thiếu dữ liệu` : ""}.`, "success");
      setSelected(new Set());
    }
  };
  const bulkClear = async () => {
    setClearOpen(false);
    let n = 0;
    for (const id of selected) if ((await post("/api/admin/scores", { action: "clear-year", id, year: latestYear }, { refresh: false })).ok) n++;
    toast(`Đã xoá điểm ${latestYear} của ${n} chương trình.`, "success");
    setSelected(new Set());
    refresh();
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <div role="tablist" aria-label="Loại dữ liệu" className="-mt-2 flex gap-6 border-b border-slate-200">
        {(
          [
            ["scores", "Điểm chuẩn theo năm"],
            ["tuition", "Học phí theo khóa"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("-mb-px border-b-2 px-1 py-3 text-[15px] font-semibold", tab === k ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {l}
          </button>
        ))}
      </div>

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <select aria-label="Trường" className={cn(selectCls, "max-w-[220px]")} value={school} onChange={(e) => (setSchool(e.target.value), setPage(1))}>
          <option value="">Trường: Tất cả</option>
          {schools.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Trạng thái" className={selectCls} value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">Trạng thái: Tất cả</option>
          {Object.entries(STATUS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo ngành, mã</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo ngành, mã…" className={`${inputCls} pl-9`} />
        </label>
        {filteredOn && (
          <button type="button" className="text-sm font-medium text-primary-600 hover:underline" onClick={() => (setQ(""), setSchool(""), setStatus(""), setPage(1))}>
            Xóa bộ lọc
          </button>
        )}
        <span className="text-[13px] text-slate-500">
          {filtered.length.toLocaleString("vi-VN")} / {rows.filter((r) => !r.hidden).length.toLocaleString("vi-VN")} bản ghi
        </span>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          {tab === "scores" ? (
            <table className="w-full min-w-[1040px] [&_td]:!px-3 [&_th]:!px-3">
              <thead className="bg-slate-50">
                <tr>
                  <th className={`${th} w-10`}>
                    <input type="checkbox" aria-label="Chọn tất cả trên trang" className="size-4 accent-primary-600" checked={allOnPage} onChange={() => setSelected((s) => {
                      const n = new Set(s);
                      pg.slice.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
                      return n;
                    })} />
                  </th>
                  <th className={th}>Mã XT</th>
                  <th className={th}>Tên chương trình</th>
                  <th className={th}>Trường</th>
                  <th className={th}>Tổ hợp</th>
                  {years.map((y) => (
                    <th key={y} className={`${th} text-center`}>
                      Điểm {y}
                    </th>
                  ))}
                  <th className={`${th} text-center`}>Chênh lệch</th>
                  <th className={th}>Nguồn</th>
                  <th className={th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pg.slice.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                      Không có bản ghi nào khớp bộ lọc.
                    </td>
                  </tr>
                )}
                {pg.slice.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? "bg-primary-50/40" : undefined}>
                    <td className={td}>
                      <input type="checkbox" aria-label={`Chọn ${r.admissionCode}`} className="size-4 accent-primary-600" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                    <td className={`${td} font-semibold whitespace-nowrap text-slate-900`}>{r.admissionCode}</td>
                    <td className={`${td} max-w-[180px] font-semibold text-slate-900`}>
                      <span className="line-clamp-2" title={r.name}>
                        {r.name}
                      </span>
                    </td>
                    <td className={`${td} max-w-[130px] truncate text-slate-500`} title={r.school}>
                      {r.school}
                    </td>
                    <td className={`${td} text-xs whitespace-nowrap text-slate-600`}>{r.combos.slice(0, 3).join(", ")}{r.combos.length > 3 ? "…" : ""}</td>
                    <td className={`${td} text-center`}>
                      <QuickNumber key={`${r.id}-${r.scores[latestYear]}`} value={r.scores[latestYear]} label={`Điểm ${latestYear} của ${r.admissionCode}`} max={30} onSave={(v) => saveScore(r, latestYear, v)} />
                    </td>
                    <td className={`${td} text-center tabular-nums`}>{r.scores[latestYear - 1]?.toFixed(2) ?? "–"}</td>
                    <td className={`${td} text-center tabular-nums`}>{r.scores[latestYear - 2]?.toFixed(2) ?? "–"}</td>
                    <td className={cn(td, "text-center font-semibold tabular-nums", r.diff == null ? "text-slate-400" : Math.abs(r.diff) > 2 ? "text-danger-700" : r.diff >= 1 ? "text-accent-700" : "text-success-700")}>
                      {r.diff == null ? "–" : `${r.diff > 0 ? "+" : ""}${r.diff.toFixed(2)}`}
                    </td>
                    <td className={td}>
                      <button type="button" onClick={() => openSource(r)} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap", r.sourceUrl ? "text-primary-700 hover:bg-primary-50" : "bg-danger-50 text-danger-700 hover:bg-danger-100")} title={r.sourceUrl ?? "Chưa có URL nguồn"}>
                        <LuLink className="size-3.5 shrink-0" aria-hidden /> {r.sourceUrl ? (r.sourceCheckedAt ? fmtDate(r.sourceCheckedAt).slice(0, 5) : "Có URL") : "Thêm"}
                      </button>
                    </td>
                    <td className={td}>
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Mã XT</th>
                  <th className={th}>Tên chương trình</th>
                  <th className={th}>Trường</th>
                  <th className={`${th} text-center`}>Học phí tối thiểu (tr/năm)</th>
                  <th className={`${th} text-center`}>Học phí tối đa (tr/năm)</th>
                  <th className={`${th} text-center`}>Thời gian</th>
                  <th className={`${th} text-right`}>Ước tính toàn khoá</th>
                  <th className={th}>Nguồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pg.slice.map((r) => (
                  <tr key={r.id}>
                    <td className={`${td} font-semibold text-slate-900`}>{r.admissionCode}</td>
                    <td className={`${td} max-w-[220px] font-semibold text-slate-900`}>
                      <span className="line-clamp-2">{r.name}</span>
                    </td>
                    <td className={`${td} text-slate-500`}>{r.school}</td>
                    <td className={`${td} text-center`}>
                      <QuickNumber key={`${r.id}-min-${r.tuitionMin}`} value={r.tuitionMin} label={`Học phí tối thiểu ${r.admissionCode}`} max={2000} step="0.1" onSave={(v) => saveTuition(r, "tuitionMin", v)} />
                    </td>
                    <td className={`${td} text-center`}>
                      <QuickNumber key={`${r.id}-max-${r.tuitionMax}`} value={r.tuitionMax} label={`Học phí tối đa ${r.admissionCode}`} max={2000} step="0.1" onSave={(v) => saveTuition(r, "tuitionMax", v)} />
                    </td>
                    <td className={`${td} text-center tabular-nums`}>{r.durationYears} năm</td>
                    <td className={`${td} text-right whitespace-nowrap tabular-nums`}>
                      {Math.round(r.tuitionMin * r.durationYears)}–{Math.round(r.tuitionMax * r.durationYears)} tr
                    </td>
                    <td className={`${td} max-w-[180px] truncate text-xs text-slate-500`} title={r.source}>
                      {r.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {tab === "scores" && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">{selected.size} bản ghi đã chọn</span>
            <Button size="sm" className="!bg-success-600 hover:!bg-success-700" disabled={busy} onClick={bulkVerify}>
              Xác minh hàng loạt
            </Button>
            <button type="button" className="text-sm font-semibold text-danger-700 hover:underline" onClick={() => setClearOpen(true)}>
              Xóa điểm {latestYear}
            </button>
            <button type="button" className="ml-auto text-sm text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </button>
          </div>
        )}
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="bản ghi" />
      </Panel>
      <p className="text-[13px] text-slate-500">
        Sửa điểm {latestYear} hoặc học phí trực tiếp trên bảng — nhấn Enter để lưu, Esc để huỷ. Mọi thay đổi được ghi nhật ký. “Xác minh hàng loạt” ghi nhận bạn đã đối chiếu số liệu với nguồn (hiệu lực 12 tháng).
      </p>

      {source && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:pt-24 sm:pr-8" role="dialog" aria-modal="true" aria-labelledby="src-title">
          <button type="button" aria-label="Đóng" tabIndex={-1} className="absolute inset-0 bg-slate-900/20" onClick={() => setSource(null)} />
          <form
            className="relative w-full max-w-[300px] rounded-2xl border border-slate-200 bg-white p-5 shadow-elevated"
            onSubmit={(e) => (e.preventDefault(), saveSource())}
            onKeyDown={(e) => e.key === "Escape" && setSource(null)}
          >
            <div className="flex items-center justify-between">
              <h2 id="src-title" className="text-base font-bold text-slate-900">
                Cập nhật nguồn tham chiếu
              </h2>
              <button type="button" onClick={() => setSource(null)} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="Đóng">
                <LuX className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {source.admissionCode} · {source.school}
            </p>
            {srcErr && !srcErr.field && <p className="mt-3 text-xs text-danger-700">{srcErr.message}</p>}
            <label htmlFor="src-url" className="mt-4 block text-sm font-semibold text-slate-800">
              URL nguồn
            </label>
            <input id="src-url" autoFocus className={cn(inputCls, "mt-1.5", srcErr?.field === "sourceUrl" && "!border-danger-500")} placeholder="https://…" value={srcForm.sourceUrl} onChange={(e) => setSrcForm({ ...srcForm, sourceUrl: e.target.value })} maxLength={300} />
            {srcErr?.field === "sourceUrl" && <p className="mt-1 text-xs text-danger-700">{srcErr.message}</p>}
            <label htmlFor="src-date" className="mt-3 block text-sm font-semibold text-slate-800">
              Ngày kiểm tra
            </label>
            <input id="src-date" type="date" max={new Date().toISOString().slice(0, 10)} className={cn(inputCls, "mt-1.5", srcErr?.field === "sourceCheckedAt" && "!border-danger-500")} value={srcForm.sourceCheckedAt} onChange={(e) => setSrcForm({ ...srcForm, sourceCheckedAt: e.target.value })} />
            {srcErr?.field === "sourceCheckedAt" && <p className="mt-1 text-xs text-danger-700">{srcErr.message}</p>}
            <label htmlFor="src-note" className="mt-3 block text-sm font-semibold text-slate-800">
              Ghi chú
            </label>
            <textarea id="src-note" rows={3} className={cn(inputCls, "mt-1.5 h-auto py-2")} placeholder="Nhập ghi chú hoặc lý do đối soát…" value={srcForm.sourceNote} onChange={(e) => setSrcForm({ ...srcForm, sourceNote: e.target.value })} maxLength={300} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setSource(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      )}

      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title={`Xoá điểm chuẩn ${latestYear}?`}
        subtitle={`${selected.size} chương trình đã chọn`}
        footer={
          <>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" disabled={busy} onClick={bulkClear}>
              Xoá điểm {latestYear}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Chỉ dùng khi nhập nhầm. Điểm các năm khác giữ nguyên; thao tác được ghi nhật ký và có thể nhập lại.</p>
      </Dialog>
    </>
  );
}
