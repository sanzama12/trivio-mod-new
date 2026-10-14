"use client";

/**
 * C5 — Cổng trường cho cán bộ tuyển sinh: xác nhận từng nhóm số liệu Trovio đang hiển thị,
 * hoặc gửi bản sửa kèm minh chứng (quản trị viên duyệt trước khi áp dụng). Không sửa được cảm nhận hay thứ tự gợi ý.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LuBadgeCheck, LuCheck, LuClock, LuShieldCheck } from "react-icons/lu";
import type { VerifyField } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useModal } from "@/components/ui/use-modal";
import { cn } from "@/lib/cn";

type Field = { field: VerifyField; label: string; value: string; confirmedAt: string | null; pending: { proposed: string; createdAt: string } | null };
type Item = { id: string; slug: string; name: string; admissionCode: string; schoolVerifiedAt: string | null; fields: Field[] };

const dmy = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
const inputCls = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none";
const HINT: Record<VerifyField, string> = { combos: "VD: A00, A01, D01", tuition: "Triệu/năm, VD: 28-35", cutoff: "Thang 30, VD: 26.5", quota: "Số nguyên, VD: 300" };

async function call(body: unknown) {
  const res = await fetch("/api/school-portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json().catch(() => ({ ok: false, message: "Phản hồi không hợp lệ." }))) as { ok: boolean; message?: string; field?: string; complete?: boolean };
}

export function SchoolPortal({ email, school, done, total, items, history }: { email: string; school: { name: string; shortName: string; code: string }; done: number; total: number; items: Item[]; history: { id: string; programId: string; field: VerifyField; proposed: string; status: string; adminNote: string | null; resolvedAt: string | null }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [fix, setFix] = useState<{ item: Item; field: Field } | null>(null);
  const [form, setForm] = useState({ proposed: "", evidenceUrl: "", note: "" });
  const [err, setErr] = useState<{ field?: string; message?: string } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog, !!fix, () => setFix(null));
  const pct = total ? Math.round((done / total) * 100) : 0;

  const confirm = async (programId: string, field: VerifyField | "all") => {
    setBusy(`${programId}:${field}`);
    const res = await call({ action: "confirm", programId, field });
    setBusy(null);
    if (!res.ok) return toast(res.message ?? "Không xác nhận được.", "warning");
    toast(res.complete ? "Đã xác nhận đủ 4 nhóm — chương trình hiện huy hiệu “Trường đã xác nhận”." : "Đã xác nhận số liệu.", "success");
    router.refresh();
  };
  const submit = async () => {
    if (!fix) return;
    setBusy("submit");
    const res = await call({ action: "submit", programId: fix.item.id, field: fix.field.field, ...form });
    setBusy(null);
    if (!res.ok) return setErr({ field: res.field, message: res.message });
    setFix(null);
    toast("Đã gửi bản sửa — Trovio sẽ duyệt và báo lại cho bạn.", "success");
    router.refresh();
  };

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cổng trường · {school.name}</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                {email} · {items.length} chương trình · {done}/{total} số liệu đã xác nhận
              </p>
            </div>
            <div className="w-40" role="img" aria-label={`Đã xác nhận ${pct}%`}>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-success-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-right text-xs font-semibold text-success-700">{pct}%</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {items.map((it) => {
              const left = it.fields.filter((f) => !f.confirmedAt).length;
              return (
                <section key={it.id} aria-labelledby={`p-${it.id}`} className="rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <h2 id={`p-${it.id}`} className="font-bold text-slate-900">
                      {it.name} <span className="text-sm font-normal text-slate-500">· Mã {it.admissionCode}</span>
                    </h2>
                    {it.schoolVerifiedAt && (
                      <Badge tone="success">
                        <LuShieldCheck className="size-3.5" aria-hidden /> Trường đã xác nhận · {dmy(it.schoolVerifiedAt)}
                      </Badge>
                    )}
                    <span className="ml-auto flex items-center gap-3">
                      <Link href={`/chuong-trinh/${it.slug}`} className="text-[13px] font-semibold text-primary-600 hover:underline">
                        Xem trang
                      </Link>
                      {left > 1 && (
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => confirm(it.id, "all")}>
                          Xác nhận cả {left} nhóm
                        </Button>
                      )}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {it.fields.map((f) => (
                      <li key={f.field} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                        <div className="min-w-[200px] flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {it.name} · {f.label}
                          </p>
                          <p className="text-[13px] text-slate-600">Trovio đang hiển thị: {f.value}</p>
                          {f.pending && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-accent-700">
                              <LuClock className="size-3.5" aria-hidden /> Bản sửa “{f.pending.proposed}” đang chờ Trovio duyệt
                            </p>
                          )}
                        </div>
                        {f.confirmedAt ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-[13px] font-semibold text-success-700">
                            <LuCheck className="size-4" aria-hidden /> Đã xác nhận {dmy(f.confirmedAt).slice(0, 5)}
                          </span>
                        ) : null}
                        <div className="flex gap-2">
                          {!f.confirmedAt && (
                            <Button size="sm" disabled={!!busy} onClick={() => confirm(it.id, f.field)}>
                              {busy === `${it.id}:${f.field}` ? "Đang lưu…" : "Xác nhận"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!f.pending}
                            onClick={() => {
                              setErr(null);
                              setForm({ proposed: "", evidenceUrl: "", note: "" });
                              setFix({ item: it, field: f });
                            }}
                          >
                            Gửi bản sửa
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <p className="mt-5 text-[13px] text-slate-500">Bản sửa cần đính kèm đề án/thông báo; quản trị Trovio duyệt trước khi hiển thị. Trường không sửa được cảm nhận sinh viên hay thứ tự gợi ý.</p>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <LuBadgeCheck className="size-5 text-success-700" aria-hidden /> Huy hiệu tin cậy
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] text-slate-600">
              <li>Xác nhận đủ 4 nhóm số liệu (tổ hợp, học phí, điểm chuẩn, chỉ tiêu) của một chương trình.</li>
              <li>Trang chương trình hiện “Trường đã xác nhận · ngày”.</li>
              <li>Quá 12 tháng huy hiệu tự hết hạn — xác nhận lại mỗi mùa tuyển sinh.</li>
            </ol>
          </Card>
          {history.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Bản sửa đã xử lý</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {history.map((h) => (
                  <li key={h.id} className="text-slate-600">
                    <Badge tone={h.status === "approved" ? "success" : "danger"}>{h.status === "approved" ? "Đã áp dụng" : "Không chấp nhận"}</Badge> {h.proposed}
                    {h.adminNote && <span className="block text-xs text-slate-500">Ghi chú: {h.adminNote}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {fix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" tabIndex={-1} aria-label="Đóng" className="absolute inset-0 bg-slate-900/50" onClick={() => setFix(null)} />
          <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="fix-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
            <h2 id="fix-title" className="text-lg font-bold text-slate-900">
              Gửi bản sửa · {fix.field.label}
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              {fix.item.name} — Trovio đang hiển thị: <b>{fix.field.value}</b>
            </p>
            {err && !err.field && <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
            <label htmlFor="fx-v" className="mt-4 block text-sm font-semibold text-slate-800">
              Số liệu đúng
            </label>
            <input id="fx-v" data-autofocus className={cn(inputCls, "mt-1.5", err?.field === "proposed" && "!border-danger-500")} placeholder={HINT[fix.field.field]} value={form.proposed} onChange={(e) => setForm({ ...form, proposed: e.target.value })} maxLength={80} />
            {err?.field === "proposed" && <p className="mt-1 text-xs text-danger-700">{err.message}</p>}
            <label htmlFor="fx-u" className="mt-3 block text-sm font-semibold text-slate-800">
              Link minh chứng (đề án / thông báo)
            </label>
            <input id="fx-u" className={cn(inputCls, "mt-1.5", err?.field === "evidenceUrl" && "!border-danger-500")} placeholder="https://tuyensinh.truong.edu.vn/…" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} maxLength={300} />
            {err?.field === "evidenceUrl" && <p className="mt-1 text-xs text-danger-700">{err.message}</p>}
            <label htmlFor="fx-n" className="mt-3 block text-sm font-semibold text-slate-800">
              Ghi chú <span className="font-normal text-slate-500">(tuỳ chọn)</span>
            </label>
            <textarea id="fx-n" rows={2} className={cn(inputCls, "mt-1.5 h-auto py-2")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFix(null)}>
                Hủy
              </Button>
              <Button disabled={busy === "submit"} onClick={submit}>
                Gửi bản sửa
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Chưa là cán bộ tuyển sinh: đăng ký bằng email tên miền trường. */
export function SchoolPortalJoin({ verified, email, status, schools }: { verified: boolean; email: string; status: "pending" | "approved" | "rejected" | null; schools: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const request = async (schoolId: string) => {
    setBusy(true);
    const res = await call({ action: "request", schoolId });
    setBusy(false);
    if (!res.ok) return toast(res.message ?? "Không gửi được yêu cầu.", "warning");
    toast("Đã gửi yêu cầu — Trovio sẽ duyệt thủ công và báo cho bạn.", "success");
    router.refresh();
  };
  return (
    <Card className="mx-auto mt-6 max-w-2xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Cổng trường</h1>
      <p className="mt-2 text-sm text-slate-600">
        Dành cho cán bộ tuyển sinh: xem các số Trovio đang hiển thị về chương trình của trường, bấm “Xác nhận” hoặc gửi bản sửa kèm văn bản. Số đã xác nhận có huy hiệu và ngày xác nhận — không phải quảng cáo, không ảnh hưởng xếp hạng.
      </p>
      {status === "pending" ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
          <LuClock className="size-4" aria-hidden /> Yêu cầu của bạn đang chờ Trovio duyệt. Bạn sẽ nhận thông báo khi có kết quả.
        </p>
      ) : !verified ? (
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Hãy xác thực email trước khi đăng ký. <ButtonLink href="/ho-so" size="sm" variant="outline" className="ml-2">Mở hồ sơ</ButtonLink>
        </div>
      ) : schools.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Email <b>{email}</b> không thuộc tên miền website của trường nào trong Trovio. Hãy đăng nhập bằng email công vụ của trường (VD: tuyensinh@<i>tên-trường</i>.edu.vn).
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {status === "rejected" && <p className="text-sm text-danger-700">Yêu cầu trước chưa được duyệt. Bạn có thể gửi lại kèm liên hệ chính thức của phòng tuyển sinh.</p>}
          <p className="text-sm font-semibold text-slate-800">Trường khớp với email {email}:</p>
          {schools.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">
                {s.code} · {s.name}
              </span>
              <Button size="sm" disabled={busy} onClick={() => request(s.id)}>
                Đăng ký cán bộ tuyển sinh
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
