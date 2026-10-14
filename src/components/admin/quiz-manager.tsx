"use client";

/** A06 — ngân hàng câu hỏi RIASEC (lọc theo nhóm, sửa, tạm ẩn, thêm) + ma trận nhóm Holland → ngành với trọng số ưu tiên. */
import { useMemo, useState } from "react";
import { LuEye, LuEyeOff, LuInfo, LuPencil, LuPlus, LuUndo2 } from "react-icons/lu";
import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Dialog, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, selectCls, td, th } from "./ui";

export interface QuizQuestionItem {
  id: number;
  type: RiasecType;
  text: string;
  hidden: boolean;
  custom: boolean;
  edited: boolean;
}

export const RIASEC_TONE: Record<RiasecType, BadgeTone> = { R: "teal", I: "primary", A: "violet", S: "pink", E: "accent", C: "slate" };
const tag = (t: RiasecType) => `${t} - ${RIASEC_INFO[t].label}`;

export function QuizManager({ questions, weights, linked, minPerType }: { questions: QuizQuestionItem[]; weights: Record<RiasecType, number>; linked: Record<string, string[]>; minPerType: number }) {
  const { post, busy } = useAdminPost();
  const [filter, setFilter] = useState<RiasecType | "">("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<{ id?: number; text: string; type: RiasecType | "" } | null>(null);
  const [err, setErr] = useState<{ field?: string; message?: string } | null>(null);
  const [w, setW] = useState<Record<RiasecType, string>>(() => Object.fromEntries(RIASEC_ORDER.map((t) => [t, String(weights[t] ?? 1)])) as Record<RiasecType, string>);
  const [editingW, setEditingW] = useState<RiasecType | null>(null);
  const [wErr, setWErr] = useState<{ field?: string; message?: string } | null>(null);

  const counts = useMemo(() => Object.fromEntries(RIASEC_ORDER.map((t) => [t, questions.filter((q) => q.type === t).length])) as Record<RiasecType, number>, [questions]);
  const active = useMemo(() => Object.fromEntries(RIASEC_ORDER.map((t) => [t, questions.filter((q) => q.type === t && !q.hidden).length])) as Record<RiasecType, number>, [questions]);
  const list = filter ? questions.filter((q) => q.type === filter) : questions;
  const pg = paginate(list, page, 10);
  const wChanged = RIASEC_ORDER.some((t) => Number(w[t]) !== (weights[t] ?? 1));

  const saveQ = async () => {
    if (!edit) return;
    const res = await post("/api/admin/quiz", { kind: "question", action: edit.id ? "edit" : "add", id: edit.id, text: edit.text, type: edit.type }, { success: edit.id ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi." });
    if (res.ok) setEdit(null);
    else setErr({ field: res.field, message: res.message });
  };
  const saveW = async () => {
    setWErr(null);
    const res = await post("/api/admin/quiz", { kind: "weights", weights: w }, { success: "Đã lưu trọng số — gợi ý dùng ngay trọng số mới." });
    if (res.ok) setEditingW(null);
    else setWErr({ field: res.field, message: res.message });
  };

  return (
    <>
      <Panel className="p-5 sm:p-6" aria-labelledby="qbank-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="qbank-h" className="text-lg font-bold text-slate-900">
            Ngân hàng câu hỏi trắc nghiệm
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-500">Định dạng trắc nghiệm 5 mức độ Likert</span>
            <Button size="sm" onClick={() => (setErr(null), setEdit({ text: "", type: filter || "" }))}>
              <LuPlus className="size-4" aria-hidden /> Thêm câu hỏi
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo nhóm">
          <button type="button" role="tab" aria-selected={!filter} onClick={() => (setFilter(""), setPage(1))} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", !filter ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
            Tất cả ({questions.length})
          </button>
          {RIASEC_ORDER.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={filter === t} onClick={() => (setFilter(t), setPage(1))} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", filter === t ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
              {tag(t)} ({counts[t]})
            </button>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>STT</th>
                <th className={th}>Câu hỏi</th>
                <th className={th}>Nhóm RIASEC</th>
                <th className={`${th} text-center`}>Mã câu</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.slice.map((q, i) => (
                <tr key={q.id} className={q.hidden ? "bg-slate-50/60" : undefined}>
                  <td className={`${td} text-slate-500 tabular-nums`}>{pg.from + i}</td>
                  <td className={`${td} max-w-[460px] text-slate-900`}>
                    <span className="line-clamp-2" title={q.text}>
                      {q.text}
                    </span>
                    {(q.edited || q.custom) && <span className="text-[11px] font-medium text-accent-700">{q.custom ? "Câu thêm mới" : "Đã chỉnh sửa"}</span>}
                  </td>
                  <td className={td}>
                    <Badge tone={RIASEC_TONE[q.type]}>{tag(q.type)}</Badge>
                  </td>
                  <td className={`${td} text-center tabular-nums`}>{q.id}</td>
                  <td className={td}>{q.hidden ? <Badge tone="primary">Tạm ẩn</Badge> : <Badge tone="success">Hoạt động</Badge>}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    <button type="button" onClick={() => (setErr(null), setEdit({ id: q.id, text: q.text, type: q.type }))} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label={`Sửa câu ${q.id}`}>
                      <LuPencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={busy || (!q.hidden && active[q.type] <= minPerType)}
                      title={!q.hidden && active[q.type] <= minPerType ? `Nhóm ${q.type} cần ít nhất ${minPerType} câu đang dùng` : q.hidden ? "Dùng lại" : "Tạm ẩn"}
                      onClick={() => post("/api/admin/quiz", { kind: "question", action: q.hidden ? "show" : "hide", id: q.id }, { success: q.hidden ? "Đã dùng lại câu hỏi." : "Đã tạm ẩn câu hỏi." })}
                      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label={q.hidden ? `Dùng lại câu ${q.id}` : `Tạm ẩn câu ${q.id}`}
                    >
                      {q.hidden ? <LuEye className="size-4" aria-hidden /> : <LuEyeOff className="size-4" aria-hidden />}
                    </button>
                    {q.edited && !q.custom && (
                      <button type="button" disabled={busy} onClick={() => post("/api/admin/quiz", { kind: "question", action: "reset", id: q.id }, { success: "Đã khôi phục câu gốc." })} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label={`Khôi phục câu ${q.id}`} title="Khôi phục bản gốc">
                        <LuUndo2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={list.length} from={pg.from} to={pg.to} unit="câu hỏi" />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6" aria-labelledby="matrix-h">
        <h2 id="matrix-h" className="text-lg font-bold text-slate-900">
          Ma trận ánh xạ RIASEC — Ngành đào tạo
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">Liên kết mã Holland chính của ngành → nhóm. Trọng số quyết định mức độ ưu tiên khi gợi ý (áp dụng khi quy tắc “Ưu tiên ngành phù hợp RIASEC” đang chạy).</p>
        {wErr && <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{wErr.message}</p>}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Mã nhóm</th>
                <th className={th}>Tên nhóm</th>
                <th className={th}>Ngành liên kết</th>
                <th className={`${th} text-center`}>Trọng số</th>
                <th className={`${th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RIASEC_ORDER.map((t) => {
                const majors = linked[t] ?? [];
                return (
                  <tr key={t}>
                    <td className={td}>
                      <Badge tone={RIASEC_TONE[t]}>{tag(t)}</Badge>
                    </td>
                    <td className={`${td} font-semibold text-slate-900`}>{RIASEC_INFO[t].name}</td>
                    <td className={td}>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {majors.slice(0, 3).map((m) => (
                          <span key={m} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            {m}
                          </span>
                        ))}
                        {majors.length > 3 && <span className="text-xs font-semibold text-primary-600">+ {majors.length - 3} ngành khác</span>}
                        {majors.length === 0 && <span className="text-xs text-slate-400">Chưa có ngành</span>}
                      </span>
                    </td>
                    <td className={`${td} text-center`}>
                      <input
                        aria-label={`Trọng số nhóm ${t}`}
                        inputMode="decimal"
                        readOnly={editingW !== t}
                        value={w[t]}
                        onChange={(e) => setW({ ...w, [t]: e.target.value })}
                        className={cn("h-9 w-16 rounded-md border text-center text-sm font-semibold tabular-nums", editingW === t ? "border-primary-500 ring-2 ring-primary-100" : "border-slate-200 bg-white", wErr?.field === t && "!border-danger-500")}
                      />
                    </td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setEditingW(editingW === t ? null : t)} className="text-sm font-semibold text-primary-600 underline-offset-2 hover:underline">
                        {editingW === t ? "Xong" : "Chỉnh sửa"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 px-4 py-3 text-[13px] text-primary-800">
          <span className="flex items-center gap-2">
            <LuInfo className="size-4 shrink-0" aria-hidden /> Trọng số cao = ưu tiên gợi ý nhiều hơn khi tính điểm tương thích RIASEC cá nhân. Cho phép 0,5–2,0; mặc định 1.0.
          </span>
          <Button size="sm" disabled={!wChanged || busy} onClick={saveW}>
            Lưu trọng số
          </Button>
        </div>
      </Panel>

      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Sửa câu hỏi #${edit.id}` : "Thêm câu hỏi"}
        subtitle="Câu hỏi dạng “Tôi thích…” — học sinh trả lời theo 5 mức"
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Hủy
            </Button>
            <Button disabled={busy} onClick={saveQ}>
              Lưu câu hỏi
            </Button>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            {err && !err.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
            <div>
              <label htmlFor="q-text" className="text-sm font-semibold text-slate-800">
                Nội dung <span className="text-danger-600">*</span>
              </label>
              <textarea id="q-text" data-autofocus rows={3} maxLength={160} className={cn(inputCls, "mt-1.5 h-auto py-2", err?.field === "text" && "!border-danger-500")} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
              <p className="mt-1 flex justify-between text-xs">
                <span className="text-danger-700">{err?.field === "text" ? err.message : ""}</span>
                <span className="text-slate-400">{edit.text.length}/160</span>
              </p>
            </div>
            <div>
              <label htmlFor="q-type" className="text-sm font-semibold text-slate-800">
                Nhóm RIASEC <span className="text-danger-600">*</span>
              </label>
              <select id="q-type" className={cn(selectCls, "mt-1.5 w-full", err?.field === "type" && "!border-danger-500")} value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as RiasecType })}>
                <option value="">Chọn nhóm…</option>
                {RIASEC_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {tag(t)}
                  </option>
                ))}
              </select>
              {err?.field === "type" && <p className="mt-1 text-xs text-danger-700">{err.message}</p>}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
