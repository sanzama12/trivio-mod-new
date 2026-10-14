"use client";

/**
 * A07 — tải tệp CSV/XLSX → kết quả kiểm tra từng dòng → sửa dòng ngay trên bảng (kiểm tra lại ở server)
 * → hộp thoại "Xác nhận công bố dữ liệu" → công bố các dòng hợp lệ (dòng lỗi bị bỏ qua).
 */
import { useRef, useState } from "react";
import { LuCheck, LuCloudUpload, LuFileSpreadsheet, LuTriangleAlert } from "react-icons/lu";
import type { ImportPreview, ImportRow, ImportRowData } from "@/services/import.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Dialog } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, td, th } from "./ui";

const MAX_BYTES = 2 * 1024 * 1024;
const EDIT_FIELDS: [keyof ImportRowData, string][] = [
  ["ma_xet_tuyen", "Mã XT"],
  ["ten_chuong_trinh", "Tên chương trình"],
  ["ma_truong", "Mã trường"],
  ["ma_nganh", "Mã ngành"],
  ["nam", "Năm"],
  ["diem_chuan", "Điểm"],
  ["hoc_phi_min", "Học phí min"],
  ["hoc_phi_max", "Học phí max"],
  ["chi_tieu", "Chỉ tiêu"],
  ["to_hop", "Tổ hợp"],
  ["nguon", "Nguồn"],
];

const fileSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function readFile(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read"));
    if (/\.xlsx$/i.test(f.name)) {
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.readAsDataURL(f);
    } else {
      r.onload = () => resolve(String(r.result));
      r.readAsText(f, "utf-8");
    }
  });
}

export function ImportManager({ userName }: { userName: string }) {
  const { post, busy, toast } = useAdminPost();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<ImportRowData | null>(null);
  const [confirm, setConfirm] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setEditing(null);
    setFileErr(null);
    if (input.current) input.current.value = "";
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFileErr(null);
    setPreview(null);
    if (!/\.(csv|xlsx)$/i.test(f.name)) return setFileErr("Chỉ hỗ trợ tệp .csv hoặc .xlsx.");
    if (f.size > MAX_BYTES) return setFileErr("Tệp lớn hơn 2 MB — hãy tách thành nhiều tệp nhỏ.");
    let content: string;
    try {
      content = await readFile(f);
    } catch {
      return setFileErr("Không đọc được tệp.");
    }
    const res = await post("/api/admin/import", { step: "preview", fileName: f.name, content }, { refresh: false });
    if (!res.ok) return setFileErr(res.message ?? "Tệp không hợp lệ.");
    setFile({ name: f.name, size: f.size });
    setPreview(res.preview as ImportPreview);
  };

  const revalidate = async (rows: ImportRowData[]) => {
    if (!preview) return;
    const res = await post("/api/admin/import", { step: "revalidate", fileName: preview.fileName, rows }, { refresh: false });
    if (res.ok) setPreview(res.preview as ImportPreview);
  };

  const saveRow = async (idx: number) => {
    if (!preview || !draft) return;
    const rows = preview.rows.map((r, i) => (i === idx ? draft : r.data));
    setEditing(null);
    await revalidate(rows);
  };
  const removeRow = async (idx: number) => {
    if (!preview) return;
    setEditing(null);
    const rows = preview.rows.filter((_, i) => i !== idx).map((r) => r.data);
    if (rows.length === 0) return reset();
    await revalidate(rows);
  };

  const publish = async () => {
    if (!preview) return;
    const res = await post("/api/admin/import", { step: "publish", fileName: preview.fileName, rows: preview.rows.map((r) => r.data) }, { refresh: true });
    setConfirm(false);
    if (res.ok) {
      toast(`Đã công bố: ${res.created} chương trình mới, ${res.updated} cập nhật.`, "success");
      reset();
    }
  };

  const shown = preview ? preview.rows.map((r, i) => ({ r, i })).filter(({ r }) => !onlyIssues || r.errors.length || r.warnings.length) : [];
  const s = preview?.summary;

  return (
    <>
      <Panel className="p-5 sm:p-6" aria-labelledby="up-h">
        <h2 id="up-h" className="text-lg font-bold text-slate-900">
          Tải lên tệp dữ liệu tuyển sinh
        </h2>
        <div
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={cn("mt-4 flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-primary-600 bg-primary-50" : "border-primary-400 bg-primary-50/40")}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-primary-600" aria-hidden>
            <LuCloudUpload className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-slate-900">Kéo thả tệp hoặc nhấn để chọn tệp</p>
          <p className="mt-1 text-[13px] text-slate-500">Hỗ trợ định dạng: .csv, .xlsx (kích thước tối đa: 2 MB, 2.000 dòng)</p>
          <input ref={input} id="import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" className="mt-4" disabled={busy} onClick={() => input.current?.click()}>
            {busy && !preview ? "Đang kiểm tra…" : "Chọn tệp"}
          </Button>
        </div>
        {fileErr && (
          <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            <LuTriangleAlert className="size-4" aria-hidden /> {fileErr}
          </p>
        )}
        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <LuFileSpreadsheet className="size-5 text-success-700" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">
                {fileSize(file.size)} • Tải lên thành công ✓
              </p>
            </div>
            <button type="button" onClick={reset} className="text-sm font-semibold text-danger-700 underline-offset-2 hover:underline">
              Xóa
            </button>
          </div>
        )}
      </Panel>

      {preview && s && (
        <>
          <Panel className="p-5 sm:p-6" aria-labelledby="res-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="res-h" className="text-lg font-bold text-slate-900">
                Kết quả kiểm tra dữ liệu trước khi nhập
              </h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                Chỉ hiện dòng có lỗi
                <input type="checkbox" role="switch" className="peer sr-only" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
                <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" aria-hidden />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-lg bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">{s.valid} dòng hợp lệ ✓</span>
              <span className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">{s.errors} dòng lỗi ✗</span>
              <span className="rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700">{s.warnings} cảnh báo ⚠</span>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {s.create} tạo mới · {s.update} cập nhật
              </span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Dòng</th>
                    <th className={th}>Mã XT</th>
                    <th className={th}>Tên chương trình</th>
                    <th className={th}>Trường</th>
                    <th className={th}>Năm · Điểm</th>
                    <th className={th}>Học phí</th>
                    <th className={th}>Nguồn</th>
                    <th className={th}>Lỗi & Cảnh báo</th>
                    <th className={`${th} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-success-700">
                        <LuCheck className="mr-1 inline size-4" aria-hidden /> Không còn dòng nào có lỗi hoặc cảnh báo.
                      </td>
                    </tr>
                  )}
                  {shown.map(({ r, i }) =>
                    editing === i && draft ? (
                      <tr key={`e-${i}`} className="bg-primary-50/40">
                        <td colSpan={9} className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-900">Sửa dòng {r.line}</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {EDIT_FIELDS.map(([k, l]) => (
                              <label key={k} className="text-xs font-medium text-slate-600">
                                {l}
                                <input className={cn(inputCls, "mt-1 h-9", r.errors.some((e) => e.field === k) && "!border-danger-500")} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} maxLength={300} />
                              </label>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" disabled={busy} onClick={() => saveRow(i)}>
                              Kiểm tra lại
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                              Hủy
                            </Button>
                            <button type="button" className="ml-auto text-sm font-semibold text-danger-700 hover:underline" onClick={() => removeRow(i)}>
                              Xoá dòng này
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <Row key={i} r={r} onEdit={() => (setEditing(i), setDraft({ ...r.data }))} />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <Button variant="outline" className="!border-danger-500 !text-danger-700" onClick={reset}>
              Hủy nhập
            </Button>
            <div className="min-w-[240px] flex-1 text-center">
              <p className="text-[15px] font-semibold text-slate-900">
                {s.valid} dòng hợp lệ sẽ được nhập hệ thống. {s.errors} dòng lỗi sẽ bị bỏ qua.
              </p>
              <p className="text-xs text-slate-500">* Dữ liệu điểm chuẩn và học phí sẽ hiển thị ngay lập tức cho học sinh sau khi bạn công bố.</p>
            </div>
            <Button disabled={busy || s.valid === 0} onClick={() => setConfirm(true)}>
              Duyệt và công bố lên hệ thống ✓
            </Button>
          </Panel>

          <Dialog
            open={confirm}
            onClose={() => setConfirm(false)}
            title="Xác nhận công bố dữ liệu"
            subtitle="Hệ thống đã hoàn tất kiểm tra và xác thực dữ liệu."
            icon={
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600" aria-hidden>
                <LuCheck className="size-6" />
              </span>
            }
            footer={
              <>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Quay lại kiểm tra
                </Button>
                <Button disabled={busy} onClick={publish}>
                  {busy ? "Đang công bố…" : "Công bố dữ liệu →"}
                </Button>
              </>
            }
          >
            <p className="text-[15px] text-slate-700">
              <b className="text-success-700">{s.valid} dòng hợp lệ</b> sẽ được công bố lên hệ thống. <b className="text-danger-700">{s.errors} dòng lỗi</b> sẽ bị bỏ qua không lưu.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Nguồn tệp tin:</dt>
                <dd className="truncate font-semibold text-slate-900">{preview.fileName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Người tải lên:</dt>
                <dd className="font-semibold text-slate-900">{userName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Ngày cập nhật:</dt>
                <dd className="font-semibold text-slate-900">{new Date().toLocaleDateString("vi-VN")}</dd>
              </div>
            </dl>
            <p className="mt-4 flex gap-2 rounded-xl bg-accent-50 px-4 py-3 text-[13px] text-accent-700">
              <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Dữ liệu điểm chuẩn và học phí sẽ hiển thị ngay lập tức cho học sinh sau khi công bố.
            </p>
          </Dialog>
        </>
      )}
    </>
  );
}

function Row({ r, onEdit }: { r: ImportRow; onEdit: () => void }) {
  const d = r.data;
  const hasErr = r.errors.length > 0;
  return (
    <tr className={hasErr ? "bg-danger-50/50" : r.warnings.length ? "bg-accent-50/50" : undefined}>
      <td className={`${td} text-slate-500 tabular-nums`}>{r.line}</td>
      <td className={`${td} font-semibold text-slate-900`}>{d.ma_xet_tuyen || "—"}</td>
      <td className={`${td} max-w-[200px] font-semibold text-slate-900`}>
        <span className="line-clamp-2">{r.label ?? (d.ten_chuong_trinh || "—")}</span>
      </td>
      <td className={`${td} text-slate-600`}>{d.ma_truong || "—"}</td>
      <td className={`${td} whitespace-nowrap tabular-nums`}>
        {d.nam || "—"} · {d.diem_chuan || "—"}
      </td>
      <td className={`${td} whitespace-nowrap`}>{d.hoc_phi_min ? `${d.hoc_phi_min}${d.hoc_phi_max && d.hoc_phi_max !== d.hoc_phi_min ? `–${d.hoc_phi_max}` : ""} tr/năm` : "—"}</td>
      <td className={`${td} max-w-[140px] truncate text-slate-500`} title={d.nguon}>
        {d.nguon || "—"}
      </td>
      <td className={`${td} max-w-[260px]`}>
        <span className="flex flex-wrap gap-1">
          {r.errors.map((e, i) => (
            <Badge key={`e${i}`} tone="danger" title={e.message}>
              {e.message}
            </Badge>
          ))}
          {r.warnings.map((w, i) => (
            <Badge key={`w${i}`} tone="accent" title={w.message}>
              {w.message}
            </Badge>
          ))}
          {!hasErr && !r.warnings.length && <Badge tone="success">Hợp lệ</Badge>}
        </span>
      </td>
      <td className={`${td} text-right whitespace-nowrap`}>
        {r.action === "update" && (
          <span className="mr-2 rounded-md bg-accent-500 px-2 py-0.5 text-xs font-bold text-slate-900" title="Dòng này cập nhật chương trình đã có">
            Ghi đè
          </span>
        )}
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-primary-600 underline underline-offset-2">
          Sửa dòng
        </button>
      </td>
    </tr>
  );
}
