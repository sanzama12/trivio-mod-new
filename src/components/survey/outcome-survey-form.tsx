"use client";

import Link from "next/link";
import { useState } from "react";
import { LuBell, LuCircleCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type YN = "yes" | "no" | "unsure";
const SAT = [
  { v: 1, label: "Rất không hài lòng" },
  { v: 2, label: "Không hài lòng" },
  { v: 3, label: "Bình thường" },
  { v: 4, label: "Hài lòng" },
  { v: 5, label: "Rất hài lòng" },
];
const YN_OPTS: { v: YN; label: string }[] = [
  { v: "yes", label: "Có" },
  { v: "no", label: "Không" },
  { v: "unsure", label: "Chưa chắc" },
];

export function OutcomeSurveyForm({ options, initialProgramId, cohorts }: { options: { id: string; slug: string; label: string }[]; initialProgramId: string; cohorts: number[] }) {
  const [programId, setProgramId] = useState(initialProgramId);
  const [sat, setSat] = useState<number | null>(null);
  const [again, setAgain] = useState<YN | null>(null);
  const [right, setRight] = useState<YN | null>(null);
  const [school, setSchool] = useState<YN | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [cohort, setCohort] = useState(cohorts[0]);
  const [wish, setWish] = useState("");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) return setError({ field: "programId", message: "Chọn chương trình bạn đang học." });
    if (!sat) return setError({ field: "satisfaction", message: "Chọn mức hài lòng." });
    if (!again) return setError({ field: "chooseAgain", message: "Cho biết nếu được chọn lại bạn có chọn ngành này không." });
    setBusy(true);
    const res = await fetch("/api/outcome-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, satisfaction: sat, chooseAgain: again, chooseSchoolAgain: school ?? undefined, trovioRight: right ?? "unsure", cohort, wish, optIn }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError({ field: json?.field, message: json?.message ?? "Không gửi được, thử lại sau nhé." });
    setError(null);
    setDone(options.find((o) => o.id === programId)?.slug ?? null);
  }

  if (done !== null) {
    return (
      <Card className="p-8 text-center">
        <LuCircleCheck className="mx-auto size-12 text-success-500" aria-hidden />
        <h2 className="mt-3 text-lg font-bold">Cảm ơn bạn đã chia sẻ!</h2>
        <p className="mt-1 text-sm text-slate-600">Phản hồi sẽ được cộng vào thống kê “Người đi trước nói gì” khi chương trình đủ 20 phản hồi.</p>
        {done && (
          <Link href={`/chuong-trinh/${done}#phan-hoi`} className="mt-4 inline-block text-sm font-semibold text-primary-700 hover:underline">
            Xem trang chương trình →
          </Link>
        )}
      </Card>
    );
  }

  const err = (f: string) => (error?.field === f ? error.message : undefined);
  const chosen = options.find((o) => o.id === programId)?.label;

  return (
    <Card className="p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-600">
        <LuBell className="size-4" aria-hidden /> Một năm trước bạn đã chọn…
      </p>
      <h2 className="mt-2 text-lg font-bold text-slate-900">
        {chosen ? `Sau 1 năm học ${chosen}, bạn thấy lựa chọn này thế nào?` : "Sau 1 năm học, bạn thấy lựa chọn ngành của mình thế nào?"}
      </h2>
      <form onSubmit={submit} className="mt-5 space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <Label htmlFor="os-program">Chương trình bạn đang học</Label>
            <select
              id="os-program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            >
              <option value="">— Chọn chương trình —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldError>{err("programId")}</FieldError>
          </div>
          <div>
            <Label htmlFor="os-cohort">Năm nhập học</Label>
            <select
              id="os-cohort"
              value={cohort}
              onChange={(e) => setCohort(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            >
              {cohorts.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Mức hài lòng với ngành đang học</legend>
          <div className="grid grid-cols-5 gap-2">
            {SAT.map((s) => (
              <button
                key={s.v}
                type="button"
                aria-pressed={sat === s.v}
                aria-label={`${s.v} – ${s.label}`}
                onClick={() => setSat(s.v)}
                className={cn(
                  "h-11 rounded-lg border text-base font-semibold transition",
                  sat === s.v ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-300 text-slate-700 hover:border-primary-300",
                )}
              >
                {s.v}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-slate-500" aria-hidden>
            <span>Rất không hài lòng</span>
            <span>Rất hài lòng</span>
          </div>
          <FieldError>{err("satisfaction")}</FieldError>
        </fieldset>

        <Choice legend="Nếu được chọn lại, bạn có chọn ngành này không?" value={again} onChange={setAgain} error={err("chooseAgain")} />
        <Choice legend="Nếu được chọn lại, bạn có chọn trường này không?" value={school} onChange={setSchool} />
        <Choice legend="Gợi ý của Trovio (nếu bạn từng dùng) có đúng với bạn không?" value={right} onChange={setRight} />

        <div>
          <Label htmlFor="os-wish">Điều bạn ước biết sớm hơn trước khi chọn ngành (không bắt buộc)</Label>
          <textarea
            id="os-wish"
            value={wish}
            maxLength={300}
            rows={3}
            onChange={(e) => setWish(e.target.value)}
            placeholder="VD: Năm nhất học nhiều toán hơn mình nghĩ."
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">{wish.length}/300 · Không ghi tên giảng viên hay thông tin liên hệ.</p>
        </div>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <span>
            <span className="block text-sm font-semibold text-slate-800">Năm sau bạn có muốn trả lời 3 câu không?</span>
            <span className="mt-0.5 block text-xs text-slate-500">Trovio gửi 1 lời mời sau 12 tháng (thông báo + email). Mặc định tắt, tắt lại bất cứ lúc nào trong Hồ sơ.</span>
          </span>
          <input type="checkbox" role="switch" className="peer sr-only" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          <span className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" aria-hidden />
        </label>

        {error && !error.field && (
          <p role="alert" className="text-[13px] font-medium text-danger-700">
            {error.message}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Đang gửi…" : "Gửi (ẩn danh)"}
        </Button>
      </form>
    </Card>
  );
}

function Choice({ legend, value, onChange, error }: { legend: string; value: YN | null; onChange: (v: YN) => void; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {YN_OPTS.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              value === o.v ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:border-primary-200",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </fieldset>
  );
}
