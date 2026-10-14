"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { LuPencil, LuPlus, LuRotateCcw, LuSave, LuX } from "react-icons/lu";
import type { OutcomeMetric, SourceKind, TrustLevel } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { TrustBadge } from "@/components/outcomes/source-chip";
import { useModal } from "@/components/ui/use-modal";

type Field = "employmentRate" | "startingSalary" | "experiencedSalary";
const FIELDS: { key: Field; label: string; unit: string }[] = [
  { key: "employmentRate", label: "Tỷ lệ có việc làm trong 12 tháng", unit: "%" },
  { key: "startingSalary", label: "Lương khởi điểm (trung vị)", unit: "triệu/tháng" },
  { key: "experiencedSalary", label: "Thu nhập sau 3–5 năm", unit: "triệu/tháng" },
];
const KINDS: { key: Exclude<SourceKind, "minh-hoa">; label: string }[] = [
  { key: "van-ban", label: "Văn bản pháp luật" },
  { key: "thong-ke", label: "Thống kê nhà nước" },
  { key: "khao-sat-truong", label: "Khảo sát việc làm của trường" },
  { key: "bao-chi", label: "Báo chí dẫn khảo sát" },
  { key: "khao-sat-doanh-nghiep", label: "Khảo sát doanh nghiệp / tuyển dụng" },
];

interface MajorRow {
  id: string;
  name: string;
  employmentRate: OutcomeMetric | null;
  startingSalary: OutcomeMetric | null;
  experiencedSalary: OutcomeMetric | null;
  demoOnly: boolean;
  updatedAt: string | null;
}
interface SourceOpt {
  id: string;
  label: string;
  trust: TrustLevel;
}
type Draft = Record<Field, { value: string; low: string; high: string; year: string; sourceId: string; sampleSize: string; note: string }>;

const s = (n: number | undefined | null) => (n == null ? "" : String(n));
const toDraft = (m: MajorRow): Draft =>
  Object.fromEntries(
    FIELDS.map(({ key }) => {
      const x = m[key];
      return [key, { value: s(x?.value), low: s(x?.low), high: s(x?.high), year: s(x?.year ?? new Date().getFullYear() - 1), sourceId: x?.sourceId ?? "", sampleSize: s(x?.sampleSize), note: x?.note ?? "" }];
    }),
  ) as Draft;

const selectCls = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none";

export function OutcomeEditor({ majors, sources }: { majors: MajorRow[]; sources: SourceOpt[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useModal(formRef, !!editing, () => setEditing(null));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [src, setSrc] = useState({ title: "", publisher: "", year: String(new Date().getFullYear()), url: "", kind: "khao-sat-truong", note: "" });
  const [srcError, setSrcError] = useState<string | null>(null);
  const trustOf = (id: string) => sources.find((x) => x.id === id)?.trust;

  const open = (m: MajorRow) => {
    setEditing(m.id);
    setDraft(toDraft(m));
    setError(null);
  };
  const setF = (f: Field, k: keyof Draft[Field], v: string) => setDraft((d) => (d ? { ...d, [f]: { ...d[f], [k]: v } } : d));
  const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !draft) return;
    setBusy(true);
    const body = Object.fromEntries(
      FIELDS.map(({ key }) => {
        const d = draft[key];
        return [key, n(d.value) === null ? null : { value: n(d.value), low: n(d.low), high: n(d.high), year: n(d.year), sourceId: d.sourceId, sampleSize: n(d.sampleSize), note: d.note }];
      }),
    );
    const res = await fetch(`/api/admin/outcomes/${encodeURIComponent(editing)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) return setError(data.message ?? "Không lưu được.");
    toast(data.changes ? `Đã lưu ${data.changes} thay đổi` : "Không có gì thay đổi", data.changes ? "success" : "info");
    setEditing(null);
    router.refresh();
  };

  const reset = async (id: string) => {
    const res = await fetch(`/api/admin/outcomes/${encodeURIComponent(id)}`, { method: "DELETE" });
    toast(res.ok ? "Đã khôi phục số liệu gốc" : "Ngành này chưa có chỉnh sửa", res.ok ? "success" : "info");
    router.refresh();
  };

  const addSource = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...src, year: Number(src.year) }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) return setSrcError(data.message ?? "Không thêm được nguồn.");
    setSrcError(null);
    setShowSource(false);
    setSrc({ title: "", publisher: "", year: String(new Date().getFullYear()), url: "", kind: "khao-sat-truong", note: "" });
    toast("Đã thêm nguồn dữ liệu", "success");
    router.refresh();
  };

  const fmt = (m: OutcomeMetric | null, unit: string) => (m ? `${m.value}${unit === "%" ? "%" : ""}${m.low !== undefined && m.high !== undefined ? ` (${m.low}–${m.high})` : ""}` : "—");

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Nguồn dữ liệu ({sources.length})</h2>
            <p className="text-[13px] text-slate-500">Thêm báo cáo khảo sát việc làm của trường, văn bản, thống kê… trước khi nhập số liệu.</p>
          </div>
          <Button size="sm" variant={showSource ? "ghost" : "outline"} onClick={() => setShowSource((v) => !v)}>
            {showSource ? <LuX className="size-4" aria-hidden /> : <LuPlus className="size-4" aria-hidden />} {showSource ? "Đóng" : "Thêm nguồn"}
          </Button>
        </div>
        {showSource && (
          <form onSubmit={addSource} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
            <div className="md:col-span-2">
              <Label htmlFor="src-title">Tên văn bản / báo cáo</Label>
              <Input id="src-title" value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} placeholder="VD: Báo cáo khảo sát việc làm sinh viên tốt nghiệp 2025" />
            </div>
            <div>
              <Label htmlFor="src-pub">Đơn vị công bố</Label>
              <Input id="src-pub" value={src.publisher} onChange={(e) => setSrc({ ...src, publisher: e.target.value })} placeholder="VD: Trường ĐH Kinh tế Quốc dân" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="src-year">Năm</Label>
                <Input id="src-year" inputMode="numeric" value={src.year} onChange={(e) => setSrc({ ...src, year: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="src-kind">Loại nguồn</Label>
                <select id="src-kind" className={selectCls} value={src.kind} onChange={(e) => setSrc({ ...src, kind: e.target.value })}>
                  {KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="src-url">Đường dẫn (https://)</Label>
              <Input id="src-url" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="src-note">Phạm vi / phương pháp / cỡ mẫu</Label>
              <Input id="src-note" value={src.note} onChange={(e) => setSrc({ ...src, note: e.target.value })} placeholder="VD: Khảo sát 1.200/1.500 SV tốt nghiệp 2025, sau 12 tháng" />
            </div>
            <div className="md:col-span-2">
              <FieldError>{srcError}</FieldError>
              <Button type="submit" size="sm" disabled={busy}>
                <LuSave className="size-4" aria-hidden /> Lưu nguồn
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="relative overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Ngành</th>
              {FIELDS.map((f) => (
                <th key={f.key} scope="col" className="px-4 py-3">
                  {f.label}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {majors.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{m.name}</p>
                  {m.demoOnly && <span className="text-xs font-semibold text-accent-700">Chỉ có số liệu minh hoạ</span>}
                </td>
                {FIELDS.map((f) => (
                  <td key={f.key} className="px-4 py-3 text-slate-700">
                    {fmt(m[f.key], f.unit)}
                    {m[f.key] && (
                      <span className="block text-xs text-slate-500">
                        {m[f.key]!.year} · {trustOf(m[f.key]!.sourceId) && <TrustBadge trust={trustOf(m[f.key]!.sourceId)!} />}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => open(m)} className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
                      <LuPencil className="size-3.5" aria-hidden /> Sửa
                    </button>
                    <button type="button" onClick={() => reset(m.id)} className="relative -my-1.5 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Khôi phục số liệu gốc">
                      <LuRotateCcw className="size-3.5" aria-hidden />
                      <span className="sr-only">Khôi phục số liệu gốc của {m.name}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && draft && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <form
            ref={formRef}
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="oe-title"
            className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-elevated sm:rounded-2xl"
            noValidate
          >
            <div className="flex items-center justify-between">
              <h2 id="oe-title" className="text-lg font-bold">
                Số liệu: {majors.find((m) => m.id === editing)?.name}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <LuX className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">Để trống “Giá trị” để xoá chỉ số. Mỗi chỉ số bắt buộc chọn nguồn.</p>
            <div className="mt-4 space-y-5">
              {FIELDS.map(({ key, label, unit }) => (
                <fieldset key={key} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-800">
                    {label} ({unit})
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {(["value", "low", "high", "year"] as const).map((k) => (
                      <div key={k}>
                        <Label htmlFor={`${key}-${k}`}>{{ value: "Giá trị", low: "Thấp", high: "Cao", year: "Năm" }[k]}</Label>
                        <Input id={`${key}-${k}`} inputMode="decimal" value={draft[key][k]} onChange={(e) => setF(key, k, e.target.value)} />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Label htmlFor={`${key}-src`}>Nguồn</Label>
                      <select id={`${key}-src`} className={cn(selectCls)} value={draft[key].sourceId} onChange={(e) => setF(key, "sourceId", e.target.value)}>
                        <option value="">— Chọn nguồn —</option>
                        {sources.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`${key}-n`}>Cỡ mẫu</Label>
                      <Input id={`${key}-n`} inputMode="numeric" value={draft[key].sampleSize} onChange={(e) => setF(key, "sampleSize", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor={`${key}-note`}>Ghi chú</Label>
                      <Input id={`${key}-note`} value={draft[key].note} onChange={(e) => setF(key, "note", e.target.value)} />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
            <FieldError>{error}</FieldError>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy}>
                <LuSave className="size-4" aria-hidden /> {busy ? "Đang lưu…" : "Lưu số liệu"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
