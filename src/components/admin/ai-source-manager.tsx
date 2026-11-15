"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";
import type { AiSource } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox, FieldError, Input, Label } from "@/components/ui/field";
import { useAdminPost } from "./use-admin-post";

const KIND_LABEL: Record<AiSource["kind"], string> = { faq: "Hỏi đáp", note: "Ghi chú", link: "Đường dẫn" };
const textarea = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none";

type Draft = { id?: string; title: string; kind: AiSource["kind"]; keywords: string; content: string; url: string; enabled: boolean };
const blank: Draft = { title: "", kind: "faq", keywords: "", content: "", url: "", enabled: true };

/** Quản lý nguồn thông tin bổ sung: trợ lý dùng khi chưa có dữ liệu có cấu trúc để trả lời. */
export function AiSourceManager({ sources }: { sources: AiSource[] }) {
  const { post, busy } = useAdminPost();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [toDelete, setToDelete] = useState<AiSource | null>(null);
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  const save = async () => {
    if (!draft) return;
    setError(null);
    const res = await post("/api/admin/ai-sources", { action: "save", ...draft }, { success: "Đã lưu nguồn thông tin." });
    if (res.ok) setDraft(null);
    else setError({ field: res.field, message: res.message ?? "Không lưu được." });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="ai-sources-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ai-sources-title" className="text-base font-bold">Nguồn thông tin cho trợ lý AI</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Khi dữ liệu có cấu trúc (điểm chuẩn, học phí…) chưa trả lời được, trợ lý đối chiếu câu hỏi với từ khoá ở đây và trả lời đúng nội dung bạn biên soạn. Chỉ dùng thông tin đã kiểm chứng.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => { setDraft(blank); setError(null); }}><LuPlus className="size-4" aria-hidden /> Thêm nguồn</Button>
      </div>

      {draft && (
        <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ais-title">Tiêu đề</Label>
              <Input id="ais-title" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} invalid={!!err("title")} />
              <FieldError>{err("title")}</FieldError>
            </div>
            <div>
              <Label htmlFor="ais-kind">Loại</Label>
              <select id="ais-kind" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}>
                {(Object.keys(KIND_LABEL) as AiSource["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ais-keywords">Từ khoá nhận diện câu hỏi (cách nhau bằng dấu phẩy)</Label>
              <Input id="ais-keywords" value={draft.keywords} placeholder="VD: ký túc xá, nội trú, chỗ ở" onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} invalid={!!err("keywords")} />
              <FieldError>{err("keywords")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ais-content">Nội dung trợ lý sẽ trả lời</Label>
              <textarea id="ais-content" rows={4} maxLength={1500} className={textarea} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              <FieldError>{err("content")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ais-url">Đường dẫn nguồn (https, không bắt buộc trừ loại “Đường dẫn”)</Label>
              <Input id="ais-url" inputMode="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} invalid={!!err("url")} />
              <FieldError>{err("url")}</FieldError>
            </div>
            <Checkbox label="Đang bật (trợ lý được dùng nguồn này)" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          </div>
          <FieldError>{err("kind") ?? err("id") ?? (error && !error.field ? error.message : undefined)}</FieldError>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={save} disabled={busy}><LuSave className="size-4" aria-hidden /> Lưu</Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>Huỷ</Button>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">Chưa có nguồn bổ sung nào. Câu hỏi chưa có dữ liệu sẽ được trợ lý trả lời “chưa có thông tin”.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Tiêu đề</th>
                <th scope="col" className="py-2 pr-3 font-medium">Loại</th>
                <th scope="col" className="py-2 pr-3 font-medium">Từ khoá</th>
                <th scope="col" className="py-2 pr-3 font-medium">Đã dùng</th>
                <th scope="col" className="py-2 pr-3 font-medium">Trạng thái</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{s.title}</td>
                  <td className="py-2.5 pr-3"><Badge tone="primary">{KIND_LABEL[s.kind]}</Badge></td>
                  <td className="max-w-56 truncate py-2.5 pr-3 text-slate-700" title={s.keywords}>{s.keywords}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-700">{s.hits} lần</td>
                  <td className="py-2.5 pr-3">{s.enabled ? <Badge tone="success">Đang bật</Badge> : <Badge tone="slate">Đã tắt</Badge>}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Sửa ${s.title}`} className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        onClick={() => { setDraft({ id: s.id, title: s.title, kind: s.kind, keywords: s.keywords, content: s.content, url: s.url ?? "", enabled: s.enabled }); setError(null); }}>
                        <LuPencil className="size-4" aria-hidden />
                      </button>
                      <button type="button" aria-label={`Xoá ${s.title}`} className="inline-flex size-10 items-center justify-center rounded-lg text-danger-700 hover:bg-danger-50" onClick={() => setToDelete(s)}>
                        <LuTrash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!toDelete} title="Xoá nguồn thông tin?" confirmLabel="Xoá" onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await post("/api/admin/ai-sources", { action: "delete", id: toDelete.id }, { success: "Đã xoá." }); setToDelete(null); }}>
        Trợ lý sẽ không còn dùng “{toDelete?.title}” để trả lời.
      </ConfirmDialog>
    </section>
  );
}
