"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuBadgeCheck, LuRotateCcw, LuSave } from "react-icons/lu";
import type { AltMethodKey, AuditEntry, CutoffScore, MethodCutoff } from "@/domain/types";
import { ADMISSION_METHODS } from "@/services/scoring.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { AuditLog } from "./audit-log";

const ALT: AltMethodKey[] = ["hocba"];
const YEARS = [2025, 2024, 2023];

interface Initial {
  cutoffs: CutoffScore[];
  altCutoffs: MethodCutoff[];
  tuitionMin: number;
  tuitionMax: number;
  quota: number;
  source: string;
  schoolVerifiedAt?: string | null;
  schoolVerifiedNote?: string | null;
}

const str = (n: number | null | undefined) => (n == null ? "" : String(n));

/** Form sửa dữ liệu chương trình. Ô điểm để trống = không xét / xoá năm đó. */
export function ProgramEditor({ id, initial, edited, history }: { id: string; initial: Initial; edited: boolean; history: AuditEntry[] }) {
  const router = useRouter();
  const toast = useToast();
  const years = Array.from(new Set([...YEARS, ...initial.cutoffs.map((c) => c.year)])).sort((a, b) => b - a).slice(0, 5);
  const [cut, setCut] = useState<Record<number, string>>(Object.fromEntries(years.map((y) => [y, str(initial.cutoffs.find((c) => c.year === y)?.score)])));
  const [alt, setAlt] = useState<Record<AltMethodKey, { year: string; score: string }>>(
    Object.fromEntries(
      ALT.map((k) => {
        const c = initial.altCutoffs.find((a) => a.method === k);
        return [k, { year: str(c?.year ?? 2025), score: str(c?.score) }];
      }),
    ) as Record<AltMethodKey, { year: string; score: string }>,
  );
  const [tMin, setTMin] = useState(str(initial.tuitionMin));
  const [tMax, setTMax] = useState(str(initial.tuitionMax));
  const [quota, setQuota] = useState(str(initial.quota));
  const [source, setSource] = useState(initial.source);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [vNote, setVNote] = useState(initial.schoolVerifiedNote ?? "");
  const [vError, setVError] = useState<string | null>(null);

  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/admin/programs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cutoffs: years.map((y) => ({ year: y, score: n(cut[y] ?? "") })),
        altCutoffs: ALT.map((k) => ({ method: k, year: n(alt[k].year), score: n(alt[k].score) })),
        tuitionMin: n(tMin),
        tuitionMax: n(tMax),
        quota: n(quota),
        source,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) return setError({ field: d.field ?? "", message: d.message ?? "Không lưu được, vui lòng thử lại." });
    setError(null);
    toast(d.changes ? `Đã lưu ${d.changes} thay đổi` : "Không có gì thay đổi", d.changes ? "success" : "info");
    router.refresh();
  };

  const action = async (method: "POST" | "DELETE") => {
    setBusy(true);
    const res = await fetch(`/api/admin/programs/${encodeURIComponent(id)}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify({ action: "verify" }) : undefined,
    });
    setBusy(false);
    setConfirmReset(false);
    if (!res.ok) return toast("Thao tác không thành công", "warning");
    toast(method === "POST" ? "Đã đánh dấu kiểm tra với nguồn" : "Đã khôi phục dữ liệu gốc", "success");
    router.refresh();
  };

  const schoolVerify = async (verified: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/admin/programs/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "school-verify", verified, note: vNote }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) return setVError(d.message ?? "Thao tác không thành công");
    setVError(null);
    toast(verified ? "Đã gắn huy hiệu “Trường đã xác nhận”" : "Đã gỡ huy hiệu xác nhận", "success");
    router.refresh();
  };

  const errFor = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="space-y-6" noValidate>
        <Card className="p-6">
          <h2 className="font-bold">Điểm chuẩn điểm thi THPT (thang 30)</h2>
          <p className="mt-1 text-[13px] text-slate-500">Để trống năm nào = xoá năm đó. Để trống tất cả = chương trình không xét điểm thi.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {years.map((y) => (
              <div key={y}>
                <Label htmlFor={`cut-${y}`}>Năm {y}</Label>
                <Input id={`cut-${y}`} inputMode="decimal" value={cut[y] ?? ""} onChange={(e) => setCut((c) => ({ ...c, [y]: e.target.value }))} invalid={!!errFor("cutoffs")} />
              </div>
            ))}
          </div>
          <FieldError>{errFor("cutoffs")}</FieldError>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Phương thức khác</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Chỉ nhập điểm chuẩn đã được trường công bố và ghi rõ nguồn ở phần bên dưới. Để trống nếu chưa có dữ liệu đối chiếu.
          </p>
          <div className="mt-4 space-y-3">
            {ALT.map((k) => (
              <div key={k} className="grid items-end gap-3 sm:grid-cols-[1fr_110px_140px]">
                <p className="text-sm font-semibold text-slate-700 sm:pb-3">
                  {ADMISSION_METHODS[k].label} <span className="font-normal text-slate-500">(thang {ADMISSION_METHODS[k].max})</span>
                </p>
                <div>
                  <Label htmlFor={`alt-${k}-y`}>Năm</Label>
                  <Input id={`alt-${k}-y`} inputMode="numeric" value={alt[k].year} onChange={(e) => setAlt((a) => ({ ...a, [k]: { ...a[k], year: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor={`alt-${k}-s`}>Điểm chuẩn</Label>
                  <Input id={`alt-${k}-s`} inputMode="decimal" value={alt[k].score} onChange={(e) => setAlt((a) => ({ ...a, [k]: { ...a[k], score: e.target.value } }))} />
                </div>
              </div>
            ))}
          </div>
          <FieldError>{errFor("altCutoffs")}</FieldError>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Học phí, chỉ tiêu & nguồn</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="t-min">Học phí từ (triệu/năm)</Label>
              <Input id="t-min" inputMode="decimal" value={tMin} onChange={(e) => setTMin(e.target.value)} invalid={!!errFor("tuitionMin")} />
            </div>
            <div>
              <Label htmlFor="t-max">Đến (triệu/năm)</Label>
              <Input id="t-max" inputMode="decimal" value={tMax} onChange={(e) => setTMax(e.target.value)} invalid={!!errFor("tuitionMax")} />
            </div>
            <div>
              <Label htmlFor="quota">Chỉ tiêu</Label>
              <Input id="quota" inputMode="numeric" value={quota} onChange={(e) => setQuota(e.target.value)} invalid={!!errFor("quota")} />
            </div>
          </div>
          <FieldError>{errFor("tuitionMin") ?? errFor("tuitionMax") ?? errFor("quota")}</FieldError>
          <div className="mt-4">
            <Label htmlFor="source">Nguồn dữ liệu</Label>
            <Input id="source" maxLength={200} value={source} onChange={(e) => setSource(e.target.value)} invalid={!!errFor("source")} placeholder="VD: Đề án tuyển sinh 2026 – Trường ĐH…" />
            <FieldError>{errFor("source")}</FieldError>
          </div>
        </Card>

        {error && !["cutoffs", "altCutoffs", "tuitionMin", "tuitionMax", "quota", "source"].includes(error.field) && <FieldError>{error.message}</FieldError>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            <LuSave className="size-4" aria-hidden /> {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="font-bold">Kiểm tra với nguồn</h2>
          <p className="mt-1 text-[13px] text-slate-500">Số liệu đã đúng với đề án/thông báo mới nhất? Đánh dấu để cập nhật “ngày kiểm tra” hiển thị cho học sinh.</p>
          <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => action("POST")}>
            <LuBadgeCheck className="size-4" aria-hidden /> Đánh dấu đã kiểm tra
          </Button>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Trường xác nhận dữ liệu</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Khi trường gửi email/văn bản xác nhận số liệu, gắn huy hiệu “Trường đã xác nhận” (hiệu lực 12 tháng).
          </p>
          {initial.schoolVerifiedAt && (
            <p className="mt-2 text-[13px] font-semibold text-success-700">
              Đang có huy hiệu từ {initial.schoolVerifiedAt}
              {initial.schoolVerifiedNote ? ` · ${initial.schoolVerifiedNote}` : ""}
            </p>
          )}
          <Label htmlFor="v-note" className="mt-3">
            Căn cứ xác nhận
          </Label>
          <Input id="v-note" value={vNote} maxLength={120} onChange={(e) => setVNote(e.target.value)} placeholder="VD: Email phòng tuyển sinh 12/9/2026" invalid={!!vError} />
          <FieldError>{vError}</FieldError>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => schoolVerify(true)}>
              <LuBadgeCheck className="size-4" aria-hidden /> {initial.schoolVerifiedAt ? "Xác nhận lại hôm nay" : "Gắn huy hiệu"}
            </Button>
            {initial.schoolVerifiedAt && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => schoolVerify(false)}>
                Gỡ huy hiệu
              </Button>
            )}
          </div>
        </Card>
        {edited && (
          <Card className="border-danger-100 p-5">
            <h2 className="font-bold text-danger-700">Khôi phục dữ liệu gốc</h2>
            <p className="mt-1 text-[13px] text-slate-500">Bỏ toàn bộ chỉnh sửa, quay về dữ liệu ban đầu. Nhật ký vẫn được giữ.</p>
            {confirmReset ? (
              <div className="mt-3 flex gap-2">
                <Button variant="danger" size="sm" disabled={busy} onClick={() => action("DELETE")}>
                  Xác nhận khôi phục
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                  Huỷ
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="mt-3 text-danger-700" onClick={() => setConfirmReset(true)}>
                <LuRotateCcw className="size-4" aria-hidden /> Khôi phục
              </Button>
            )}
          </Card>
        )}
        <AuditLog entries={history} title="Lịch sử của chương trình" />
      </aside>
    </div>
  );
}
