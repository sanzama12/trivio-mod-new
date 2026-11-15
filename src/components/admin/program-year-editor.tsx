"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuCopy, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";
import { ADMISSION_STATUSES, ADMISSION_STATUS_LABELS, type AdmissionStatus, type ProgramYearData } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type Row = { year: string; tuitionMin: string; tuitionMax: string; quota: string; status: AdmissionStatus; note: string };
const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const toRow = (r: ProgramYearData): Row => ({ year: String(r.year), tuitionMin: str(r.tuitionMin), tuitionMax: str(r.tuitionMax), quota: str(r.quota), status: r.status, note: r.note });
const cell = "h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 focus:outline-none";

/**
 * Dữ liệu tuyển sinh theo từng năm: trạng thái, chỉ tiêu, học phí. Mỗi năm có một dòng riêng và được
 * lưu cả khi không đổi so với năm trước, để lịch sử các năm luôn đầy đủ.
 */
export function ProgramYearEditor({ programId, initial, fallback }: { programId: string; initial: ProgramYearData[]; fallback: { tuitionMin: number; tuitionMax: number; quota: number } }) {
  const router = useRouter();
  const toast = useToast();
  const thisYear = new Date().getFullYear();
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map(toRow)
      : [thisYear, thisYear - 1, thisYear - 2].map((y) => ({ year: String(y), tuitionMin: str(fallback.tuitionMin), tuitionMax: str(fallback.tuitionMax), quota: str(fallback.quota), status: "chua-cong-bo" as AdmissionStatus, note: "" })),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Row>) => setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const addYear = () => {
    const years = rows.map((r) => Number(r.year)).filter(Number.isFinite);
    const next = years.length ? Math.max(...years) + 1 : thisYear;
    setRows((cur) => [{ year: String(next), tuitionMin: "", tuitionMax: "", quota: "", status: "chua-cong-bo", note: "" }, ...cur]);
  };
  /** Giữ nguyên số liệu của năm liền trước (dòng bên dưới), dùng khi năm mới không thay đổi. */
  const copyFromPrevious = (i: number) => {
    const prev = rows[i + 1];
    if (!prev) return;
    patch(i, { tuitionMin: prev.tuitionMin, tuitionMax: prev.tuitionMax, quota: prev.quota, status: prev.status });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/programs/${encodeURIComponent(programId)}/years`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((r) => ({ ...r, year: Number(r.year) })) }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; saved?: number; changed?: number };
      if (!res.ok || !d.ok) return setError(d.message ?? "Không lưu được, vui lòng thử lại.");
      toast(`Đã lưu ${d.saved} năm${d.changed ? `, ${d.changed} năm có thay đổi` : ", không có thay đổi"}`, "success");
      router.refresh();
    } catch {
      setError("Không thể kết nối, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Dữ liệu tuyển sinh theo năm</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-600">
            Mỗi năm giữ một dòng riêng: trạng thái tuyển sinh, chỉ tiêu và học phí. Năm không thay đổi vẫn được lưu để có đủ lịch sử; dùng “Giữ như năm trước” để sao chép nhanh.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addYear}>
          <LuPlus className="size-4" aria-hidden /> Thêm năm
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th scope="col" className="w-20 py-2 pr-2 font-medium">Năm</th>
              <th scope="col" className="w-48 py-2 pr-2 font-medium">Trạng thái tuyển sinh</th>
              <th scope="col" className="w-24 py-2 pr-2 font-medium">Chỉ tiêu</th>
              <th scope="col" className="w-28 py-2 pr-2 font-medium">Học phí từ</th>
              <th scope="col" className="w-28 py-2 pr-2 font-medium">Học phí đến</th>
              <th scope="col" className="py-2 pr-2 font-medium">Ghi chú</th>
              <th scope="col" className="w-12 py-2 font-medium"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-2 pr-2"><input aria-label="Năm" inputMode="numeric" className={cell} value={r.year} onChange={(e) => patch(i, { year: e.target.value })} /></td>
                <td className="py-2 pr-2">
                  <select aria-label={`Trạng thái năm ${r.year}`} className={cell} value={r.status} onChange={(e) => patch(i, { status: e.target.value as AdmissionStatus })}>
                    {ADMISSION_STATUSES.map((s) => <option key={s} value={s}>{ADMISSION_STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-2"><input aria-label={`Chỉ tiêu năm ${r.year}`} inputMode="numeric" className={cell} value={r.quota} onChange={(e) => patch(i, { quota: e.target.value })} /></td>
                <td className="py-2 pr-2"><input aria-label={`Học phí từ năm ${r.year}`} inputMode="decimal" className={cell} value={r.tuitionMin} onChange={(e) => patch(i, { tuitionMin: e.target.value })} placeholder="triệu/năm" /></td>
                <td className="py-2 pr-2"><input aria-label={`Học phí đến năm ${r.year}`} inputMode="decimal" className={cell} value={r.tuitionMax} onChange={(e) => patch(i, { tuitionMax: e.target.value })} placeholder="triệu/năm" /></td>
                <td className="py-2 pr-2"><input aria-label={`Ghi chú năm ${r.year}`} maxLength={300} className={cell} value={r.note} onChange={(e) => patch(i, { note: e.target.value })} /></td>
                <td className="py-2">
                  <div className="flex gap-1">
                    {i < rows.length - 1 && (
                      <button type="button" onClick={() => copyFromPrevious(i)} title="Giữ như năm trước" aria-label={`Giữ năm ${r.year} như năm trước`} className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                        <LuCopy className="size-4" aria-hidden />
                      </button>
                    )}
                    <button type="button" onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))} title="Bỏ dòng này khỏi lần lưu" aria-label={`Bỏ dòng năm ${r.year}`} className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                      <LuTrash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600">Bỏ một dòng chỉ loại nó khỏi lần lưu này; năm đã lưu trước đó vẫn được giữ lại trong lịch sử.</p>
      <FieldError>{error ?? undefined}</FieldError>
      <div className="mt-4">
        <Button type="button" onClick={save} disabled={busy || rows.length === 0}>
          <LuSave className="size-4" aria-hidden /> {busy ? "Đang lưu…" : "Lưu dữ liệu các năm"}
        </Button>
      </div>
    </Card>
  );
}
