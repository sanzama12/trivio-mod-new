"use client";

import { useMemo, useState } from "react";
import { LuPencil, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";
import type { Interest, MajorCareerInfo, SubjectMajorLink } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox, FieldError, Input, Label } from "@/components/ui/field";
import { Panel } from "./ui";
import { useAdminPost } from "./use-admin-post";

type Option = { id: string; name: string };
type Props = {
  interests: Interest[];
  majors: Option[];
  subjects: Option[];
  subjectLinks: SubjectMajorLink[];
  careers: MajorCareerInfo[];
};

const textarea =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none";

/** Danh sách ngành có ô tìm kiếm để chọn nhiều ngành liên quan. */
function MajorChecklist({ majors, value, onChange, label }: { majors: Option[]; value: string[]; onChange: (ids: string[]) => void; label: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? majors.filter((m) => m.name.toLowerCase().includes(needle)) : majors;
  }, [majors, q]);
  const selected = new Set(value);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">{label} ({value.length} đã chọn)</legend>
      <Input aria-label="Tìm ngành" placeholder="Tìm ngành…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {shown.length === 0 && <p className="px-2 py-3 text-sm text-slate-600">Không có ngành nào khớp.</p>}
        {shown.map((m) => (
          <Checkbox
            key={m.id}
            label={m.name}
            checked={selected.has(m.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, m.id] : value.filter((id) => id !== m.id))}
            className="rounded px-2 py-1 hover:bg-slate-50"
          />
        ))}
      </div>
    </fieldset>
  );
}

export function SuggestionDataManager({ interests, majors, subjects, subjectLinks, careers }: Props) {
  const { post, busy } = useAdminPost();

  /* ───── 1. Sở thích & lĩnh vực ───── */
  type Draft = { id?: string; name: string; kind: "interest" | "field"; description: string; hidden: boolean; position: string; majorIds: string[] };
  const blank: Draft = { name: "", kind: "interest", description: "", hidden: false, position: "0", majorIds: [] };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<{ field?: string; message: string } | null>(null);
  const [toDelete, setToDelete] = useState<Interest | null>(null);

  const saveInterest = async () => {
    if (!draft) return;
    setDraftError(null);
    const res = await post("/api/admin/suggestions", { action: "interest-save", ...draft, position: Number(draft.position) || 0 }, { success: "Đã lưu." });
    if (res.ok) setDraft(null);
    else if (res.field) setDraftError({ field: res.field, message: res.message ?? "Không lưu được." });
  };
  const deleteInterest = async () => {
    if (!toDelete) return;
    await post("/api/admin/suggestions", { action: "interest-delete", id: toDelete.id }, { success: "Đã xoá." });
    setToDelete(null);
  };

  /* ───── 2. Môn thế mạnh ↔ ngành ───── */
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const linkMap = useMemo(() => new Map(subjectLinks.map((l) => [l.subjectId, l.majorIds])), [subjectLinks]);
  const [subjectMajors, setSubjectMajors] = useState<Record<string, string[]>>({});
  const currentSubjectMajors = subjectMajors[subjectId] ?? linkMap.get(subjectId) ?? [];

  /* ───── 3. Thông tin nghề nghiệp của ngành ───── */
  const careerMap = useMemo(() => new Map(careers.map((c) => [c.majorId, c])), [careers]);
  const [majorId, setMajorId] = useState(majors[0]?.id ?? "");
  const [careerDrafts, setCareerDrafts] = useState<Record<string, { knowledge: string; careerOrientation: string; careers: string }>>({});
  const stored = careerMap.get(majorId);
  const career = careerDrafts[majorId] ?? { knowledge: stored?.knowledge ?? "", careerOrientation: stored?.careerOrientation ?? "", careers: (stored?.careers ?? []).join("\n") };
  const [careerError, setCareerError] = useState<string | null>(null);
  const saveCareer = async () => {
    setCareerError(null);
    const res = await post("/api/admin/suggestions", { action: "career-save", majorId, ...career, careers: career.careers.split("\n") }, { success: "Đã lưu thông tin nghề nghiệp." });
    if (!res.ok && res.field) setCareerError(res.message ?? "Không lưu được.");
  };

  const majorName = (id: string) => majors.find((m) => m.id === id)?.name ?? id;
  const err = (f: string) => (draftError?.field === f ? draftError.message : undefined);

  return (
    <div className="space-y-6">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Sở thích và lĩnh vực nghề nghiệp</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Danh mục học sinh được chọn khi cần gợi ý ngành. Mỗi mục liên kết với các ngành liên quan, không có công thức chấm điểm trọng số riêng.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => { setDraft(blank); setDraftError(null); }}>
            <LuPlus className="size-4" aria-hidden /> Thêm mục
          </Button>
        </div>

        {draft && (
          <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
            <h3 className="font-semibold text-slate-900">{draft.id ? "Sửa mục" : "Thêm mục mới"}</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="int-name">Tên</Label>
                <Input id="int-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} invalid={!!err("name")} />
                <FieldError>{err("name")}</FieldError>
              </div>
              <div>
                <Label htmlFor="int-kind">Loại</Label>
                <select id="int-kind" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })}>
                  <option value="interest">Sở thích</option>
                  <option value="field">Lĩnh vực nghề nghiệp</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="int-desc">Mô tả ngắn (không bắt buộc)</Label>
                <Input id="int-desc" value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="int-pos">Thứ tự hiển thị</Label>
                <Input id="int-pos" inputMode="numeric" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
              </div>
              <div className="flex items-end pb-2">
                <Checkbox label="Tạm ẩn (học sinh không thấy)" checked={draft.hidden} onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })} />
              </div>
              <div className="sm:col-span-2">
                <MajorChecklist majors={majors} value={draft.majorIds} onChange={(majorIds) => setDraft({ ...draft, majorIds })} label="Ngành liên quan" />
              </div>
            </div>
            <FieldError>{err("kind") ?? err("id") ?? (draftError && !draftError.field ? draftError.message : undefined)}</FieldError>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={saveInterest} disabled={busy}><LuSave className="size-4" aria-hidden /> Lưu</Button>
              <Button type="button" variant="secondary" onClick={() => setDraft(null)}>Huỷ</Button>
            </div>
          </div>
        )}

        {interests.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Chưa có sở thích hay lĩnh vực nào. Thêm mục đầu tiên để học sinh có thể chọn khi gợi ý ngành.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Tên</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Loại</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Ngành liên quan</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Hiển thị</th>
                  <th scope="col" className="py-2 font-medium"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interests.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">{it.name}</td>
                    <td className="py-2.5 pr-3"><Badge tone={it.kind === "field" ? "primary" : "accent"}>{it.kind === "field" ? "Lĩnh vực" : "Sở thích"}</Badge></td>
                    <td className="py-2.5 pr-3 text-slate-700" title={it.majorIds.map(majorName).join(", ")}>{it.majorIds.length} ngành</td>
                    <td className="py-2.5 pr-3">{it.hidden ? <Badge tone="slate">Đang ẩn</Badge> : <Badge tone="success">Hiện</Badge>}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button type="button" aria-label={`Sửa ${it.name}`} className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                          onClick={() => { setDraft({ id: it.id, name: it.name, kind: it.kind, description: it.description, hidden: it.hidden, position: String(it.position), majorIds: it.majorIds }); setDraftError(null); }}>
                          <LuPencil className="size-4" aria-hidden />
                        </button>
                        <button type="button" aria-label={`Xoá ${it.name}`} className="inline-flex size-10 items-center justify-center rounded-lg text-danger-700 hover:bg-danger-50" onClick={() => setToDelete(it)}>
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
      </Panel>

      <Panel className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Môn học thế mạnh và ngành liên quan</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Chọn môn rồi đánh dấu các ngành thường cần môn đó. Khi học sinh khai báo môn thế mạnh, các ngành này được ưu tiên trong gợi ý.</p>
        <div className="mt-4 max-w-md">
          <Label htmlFor="sub-select">Môn học</Label>
          <select id="sub-select" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="mt-4 max-w-2xl">
          <MajorChecklist majors={majors} value={currentSubjectMajors} onChange={(ids) => setSubjectMajors((cur) => ({ ...cur, [subjectId]: ids }))} label="Ngành liên quan" />
        </div>
        <Button type="button" className="mt-4" disabled={busy || !subjectId} onClick={() => post("/api/admin/suggestions", { action: "subject-links", subjectId, majorIds: currentSubjectMajors }, { success: "Đã lưu liên kết môn học." })}>
          <LuSave className="size-4" aria-hidden /> Lưu liên kết
        </Button>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Thông tin học thuật và nghề nghiệp của ngành</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Hiển thị ở trang ngành và trong kết quả gợi ý. Để trống thì web dùng phần mô tả chung của ngành.</p>
        <div className="mt-4 max-w-md">
          <Label htmlFor="car-major">Ngành</Label>
          <select id="car-major" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={majorId} onChange={(e) => { setMajorId(e.target.value); setCareerError(null); }}>
            {majors.map((m) => <option key={m.id} value={m.id}>{m.name}{careerMap.has(m.id) ? " ✓" : ""}</option>)}
          </select>
        </div>
        <div className="mt-4 grid max-w-3xl gap-4">
          <div>
            <Label htmlFor="car-knowledge">Kiến thức đào tạo</Label>
            <textarea id="car-knowledge" rows={4} maxLength={2000} className={textarea} value={career.knowledge} onChange={(e) => setCareerDrafts((c) => ({ ...c, [majorId]: { ...career, knowledge: e.target.value } }))} />
          </div>
          <div>
            <Label htmlFor="car-orient">Định hướng nghề nghiệp</Label>
            <textarea id="car-orient" rows={3} maxLength={1000} className={textarea} value={career.careerOrientation} onChange={(e) => setCareerDrafts((c) => ({ ...c, [majorId]: { ...career, careerOrientation: e.target.value } }))} />
          </div>
          <div>
            <Label htmlFor="car-list">Vị trí nghề nghiệp tiêu biểu (mỗi dòng một vị trí, tối đa 12)</Label>
            <textarea id="car-list" rows={4} className={textarea} value={career.careers} onChange={(e) => setCareerDrafts((c) => ({ ...c, [majorId]: { ...career, careers: e.target.value } }))} />
          </div>
        </div>
        <FieldError>{careerError ?? undefined}</FieldError>
        <Button type="button" className="mt-4" disabled={busy || !majorId} onClick={saveCareer}>
          <LuSave className="size-4" aria-hidden /> Lưu thông tin ngành
        </Button>
      </Panel>

      <ConfirmDialog open={!!toDelete} title="Xoá sở thích này?" confirmLabel="Xoá" onConfirm={deleteInterest} onCancel={() => setToDelete(null)}>
        Mục “{toDelete?.name}” sẽ bị xoá cùng các liên kết ngành. Lựa chọn đã lưu trong hồ sơ học sinh vẫn còn nhưng sẽ không còn ảnh hưởng gợi ý.
      </ConfirmDialog>
    </div>
  );
}
