"use client";

import Link from "next/link";
import { useState } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuRotateCcw, LuSave } from "react-icons/lu";
import type { MajorGroup, Subject } from "@/domain/types";
import type { MajorRecommendation } from "@/models/dtos";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { InterestPicker, useInterests } from "./interest-picker";

const STEPS = [
  { title: "Bạn thích làm gì?", hint: "Chọn những hoạt động, sở thích bạn thấy hứng thú." },
  { title: "Lĩnh vực nghề nghiệp quan tâm", hint: "Chọn các lĩnh vực bạn muốn gắn bó hoặc tò mò muốn tìm hiểu." },
  { title: "Môn học thế mạnh", hint: "Chọn các môn bạn tự tin nhất (nên 2–4 môn)." },
  { title: "Khối ngành muốn tìm hiểu", hint: "Không bắt buộc. Chọn nếu bạn đã có hướng." },
] as const;

const chip = (active: boolean) =>
  cn(
    "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
    active ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
  );

/** Khảo sát định hướng nghề nghiệp: sở thích → lĩnh vực → môn thế mạnh → khối ngành, rồi gợi ý ngành dựa trên các liên kết dữ liệu. */
export function CareerSurvey({ groups, subjects }: { groups: MajorGroup[]; subjects: Subject[] }) {
  const store = useTrovio();
  const toast = useToast();
  const { items: interests, loaded } = useInterests();
  const [step, setStep] = useState(0);
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [fieldIds, setFieldIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [results, setResults] = useState<MajorRecommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (set: (fn: (cur: string[]) => string[]) => void) => (id: string) => set((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, 20)));
  const hasKind = (kind: "interest" | "field") => interests.some((i) => i.kind === kind);
  const total = interestIds.length + fieldIds.length + subjectIds.length + groupIds.length;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/major-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestIds: [...interestIds, ...fieldIds], strongSubjectIds: subjectIds, groupIds, limit: 8 }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { items?: MajorRecommendation[] };
      setResults(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Chưa lấy được gợi ý, bạn kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      setLoading(false);
    }
  };

  const saveToProfile = () => {
    store.setRecommendationPreferences({
      groupIds,
      interestMajorIds: store.preferences?.interestMajorIds ?? [],
      strongSubjectIds: subjectIds,
      ...([...interestIds, ...fieldIds].length ? { interestIds: [...interestIds, ...fieldIds] } : {}),
      useSavedBehavior: store.preferences?.useSavedBehavior ?? false,
      academicPerformance: store.preferences?.academicPerformance ?? null,
      estimatedScore: store.preferences?.estimatedScore ?? null,
      estimatedCombo: store.preferences?.estimatedCombo ?? null,
      targetRegions: store.preferences?.targetRegions ?? [],
      budgetMax: store.preferences?.budgetMax ?? null,
      updatedAt: new Date().toISOString(),
    });
    toast("Đã lưu lựa chọn vào hồ sơ. Gợi ý ngành ở các trang khác sẽ dùng thông tin này.", "success");
  };

  const restart = () => { setResults(null); setStep(0); setInterestIds([]); setFieldIds([]); setSubjectIds([]); setGroupIds([]); };

  if (results) {
    return (
      <div className="mt-6 space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Ngành gợi ý cho bạn</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveToProfile}><LuSave className="size-4" aria-hidden /> Lưu vào hồ sơ</Button>
            <Button type="button" size="sm" variant="secondary" onClick={restart}><LuRotateCcw className="size-4" aria-hidden /> Làm lại</Button>
          </div>
        </div>
        {results.length === 0 ? (
          <Card className="p-6 text-sm text-slate-700">
            Chưa tìm được ngành khớp với các lựa chọn này. Hãy thử chọn thêm sở thích hoặc môn thế mạnh, hoặc <Link href="/nganh" className="font-semibold text-primary-700 underline underline-offset-4">xem toàn bộ danh sách ngành</Link>.
          </Card>
        ) : (
          <ol className="space-y-3">
            {results.map((r, i) => (
              <li key={r.major.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-600">#{i + 1} · {r.group.name}</p>
                      <h3 className="text-lg font-bold text-slate-900"><Link href={`/nganh/${r.major.slug}`} className="hover:text-primary-700 hover:underline">{r.major.name}</Link></h3>
                    </div>
                    <span className="rounded-full bg-accent-50 px-3 py-1 text-sm font-semibold text-accent-800">{r.score}% khớp</span>
                  </div>
                  {r.reasons.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{r.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                  {r.careers.length > 0 && <p className="mt-2 text-sm text-slate-700"><strong>Nghề nghiệp tiêu biểu:</strong> {r.careers.join(", ")}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-600">{r.programCount} chương trình · {r.schoolCount} trường</span>
                    <ButtonLink href={`/chuong-trinh?majors=${encodeURIComponent(r.major.id)}`} size="sm" variant="secondary">Xem chương trình</ButtonLink>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-slate-600">Gợi ý dựa trên lựa chọn của bạn và các liên kết do Trovio biên soạn, chỉ để tham khảo; không phải kết quả đánh giá năng lực hay tính cách.</p>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  return (
    <div className="mt-6">
      <ol className="flex gap-2" aria-label="Các bước khảo sát">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex-1">
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-primary-600" : "bg-slate-200")} aria-hidden />
            <span className="sr-only">Bước {i + 1}{i === step ? " (đang làm)" : i < step ? " (đã xong)" : ""}</span>
          </li>
        ))}
      </ol>
      <Card className="mt-4 p-5 sm:p-6">
        <p className="text-xs font-semibold text-slate-600">Bước {step + 1} / {STEPS.length}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{STEPS[step].title}</h2>
        <p className="mt-1 text-sm text-slate-600">{STEPS[step].hint}</p>

        <div className="mt-5">
          {step === 0 && (loaded && !hasKind("interest")
            ? <p className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-700">Chưa có danh mục sở thích. Bạn có thể bỏ qua bước này.</p>
            : <InterestPicker only="interest" selected={interestIds} onToggle={toggle(setInterestIds)} onClear={() => setInterestIds([])} idPrefix="survey-interest" />)}
          {step === 1 && (loaded && !hasKind("field")
            ? <p className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-700">Chưa có danh mục lĩnh vực nghề nghiệp. Bạn có thể bỏ qua bước này.</p>
            : <InterestPicker only="field" selected={fieldIds} onToggle={toggle(setFieldIds)} onClear={() => setFieldIds([])} idPrefix="survey-field" />)}
          {step === 2 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Môn học thế mạnh">
              {subjects.map((s) => { const on = subjectIds.includes(s.id); return <button key={s.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggle(setSubjectIds)(s.id)}>{on && <LuCheck className="size-3.5" aria-hidden />}{s.name}</button>; })}
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Khối ngành">
              {groups.map((g) => { const on = groupIds.includes(g.id); return <button key={g.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggle(setGroupIds)(g.id)}>{on && <LuCheck className="size-3.5" aria-hidden />}{g.name}</button>; })}
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-medium text-danger-700">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><LuArrowLeft className="size-4" aria-hidden /> Quay lại</Button>
          {last ? (
            <Button type="button" onClick={submit} disabled={loading || total === 0}>{loading ? "Đang phân tích…" : "Xem ngành gợi ý"}<LuArrowRight className="size-4" aria-hidden /></Button>
          ) : (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>Tiếp tục <LuArrowRight className="size-4" aria-hidden /></Button>
          )}
        </div>
        {last && total === 0 && <p className="mt-3 text-sm text-slate-600">Hãy chọn ít nhất một mục ở các bước trước để nhận gợi ý.</p>}
      </Card>
    </div>
  );
}
