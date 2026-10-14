"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LuArrowRight, LuBotMessageSquare, LuCheck, LuCircleAlert, LuLightbulb, LuShieldCheck } from "react-icons/lu";
import type { AdmissionMethodKey, Combo, Goal, Region } from "@/domain/types";
import type { LiteMajor, LiteProgram } from "@/services/lite";
import { REGION_LABELS } from "@/services/program.filters";
import { ADMISSION_METHODS, FIT_LABELS, formatMethodScore } from "@/services/scoring.service";
import { matchMajor } from "@/services/riasec-match";
import { choicesForMajor, comboLabel, cutoffsOf, defaultRefProgram, hiddenCombos, previewCounts, sliderRange, targetVerdict } from "@/services/goal";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type Step = 1 | 2 | 3 | 4 | 5;
interface Draft {
  majorId: string | null;
  method: AdmissionMethodKey;
  combo: string | null;
  refProgramId: string | null;
  targetScore: number | null;
  regions: Region[];
  budgetMax: number | null;
}
const EMPTY: Draft = { majorId: null, method: "thpt", combo: null, refProgramId: null, targetScore: null, regions: [], budgetMax: null };
const BUDGETS = [20, 30, 50] as const;
const POPULAR = ["cong-nghe-thong-tin", "marketing", "duoc-hoc", "ke-toan"];

function Bot({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white" aria-hidden>
        <LuBotMessageSquare className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  );
}
const Bubble = ({ children }: { children: ReactNode }) => (
  <p className="inline-block max-w-[560px] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900">{children}</p>
);
const Me = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end">
    <p className="rounded-2xl rounded-tr-sm bg-primary-600 px-3.5 py-2 text-sm font-medium text-white">{children}</p>
  </div>
);

function Reply({ active, onClick, title, sub }: { active?: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border bg-white px-3 py-2 text-left transition-colors hover:bg-primary-50",
        active ? "border-2 border-primary-600 bg-primary-50" : "border-primary-200",
      )}
    >
      <span className="block text-[13px] font-semibold text-primary-700">{title}</span>
      {sub && <span className="block text-[11px] text-slate-600">{sub}</span>}
    </button>
  );
}

/** Thanh kéo điểm mục tiêu + vạch điểm chuẩn 3 năm của chương trình mốc. */
function ScoreSlider({ value, onChange, program: refProgram, method }: { value: number; onChange: (v: number) => void; program: LiteProgram; method: AdmissionMethodKey }) {
  const range = sliderRange(refProgram, method);
  const marks = cutoffsOf(refProgram, method);
  const pct = (v: number) => ((v - range.min) / (range.max - range.min)) * 100;
  const d = ADMISSION_METHODS[method].decimals;
  return (
    <div className="relative pt-9 pb-6">
      {marks.map((m, i) => (
        <div key={m.year} className="pointer-events-none absolute top-0 -translate-x-1/2 text-center" style={{ left: `${pct(m.score)}%`, top: i % 2 ? 0 : 16 }}>
          <span className="text-[11px] font-semibold whitespace-nowrap text-accent-700">
            {m.year} · {m.score.toFixed(d)}
          </span>
        </div>
      ))}
      {marks.map((m) => (
        <span key={`t${m.year}`} className="pointer-events-none absolute h-4 w-0.5 -translate-x-1/2 bg-accent-500" style={{ left: `${pct(m.score)}%`, top: 38 }} aria-hidden />
      ))}
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Điểm mục tiêu"
        aria-valuetext={`${value.toFixed(d)} điểm`}
        className="relative z-10 w-full accent-primary-600"
      />
      <div className="absolute right-0 bottom-0 left-0 flex justify-between text-[11px] text-slate-500" aria-hidden>
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
    </div>
  );
}

export function GoalChat({ majors, programs, combos }: { majors: LiteMajor[]; programs: LiteProgram[]; combos: Combo[] }) {
  const { goal, setGoal, quiz, profile, hydrated } = useTrovio();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [q, setQ] = useState("");

  // Lần đầu có dữ liệu trên máy: nạp mục tiêu cũ (nếu có) để sửa.
  useEffect(() => {
    if (!hydrated || draft !== null) return;
    if (goal) {
      setDraft({ majorId: goal.majorId, method: goal.method, combo: goal.combo, refProgramId: goal.refProgramId, targetScore: goal.targetScore, regions: goal.regions, budgetMax: goal.budgetMax });
      setStep(goal.majorId ? 5 : 1);
    } else setDraft({ ...EMPTY, budgetMax: profile?.budgetMax ?? null, regions: profile?.regions ?? [] });
  }, [hydrated, draft, goal, profile]);
  const d = draft ?? EMPTY;
  const set = (patch: Partial<Draft>, next?: Step) => {
    setDraft({ ...d, ...patch });
    if (next) setStep(next);
  };

  const major = majors.find((m) => m.id === d.majorId) ?? null;
  const choices = useMemo(() => (d.majorId ? choicesForMajor(programs, d.majorId) : []), [programs, d.majorId]);
  const hidden = useMemo(() => hiddenCombos(combos, choices), [combos, choices]);
  const ofMajor = useMemo(
    () => programs.filter((p) => p.majorId === d.majorId && cutoffsOf(p, d.method).length > 0 && (!ADMISSION_METHODS[d.method].needsCombo || !d.combo || p.combos.includes(d.combo))),
    [programs, d.majorId, d.method, d.combo],
  );
  const refProgram = programs.find((p) => p.id === d.refProgramId) ?? null;
  const counts = previewCounts(programs, d);
  const verdict = refProgram && d.targetScore != null ? targetVerdict(d.targetScore, refProgram, d.method) : null;
  const unit = ADMISSION_METHODS[d.method];

  const suggestions = useMemo(() => {
    const filter = q.trim().toLowerCase();
    if (filter) return majors.filter((m) => m.name.toLowerCase().includes(filter)).slice(0, 8);
    if (quiz) return [...majors].sort((a, b) => matchMajor(quiz.result, b) - matchMajor(quiz.result, a)).slice(0, 4);
    return POPULAR.map((id) => majors.find((m) => m.id === id)).filter((m): m is LiteMajor => !!m);
  }, [q, quiz, majors]);

  const pickMajor = (m: LiteMajor) => {
    setQ("");
    set({ majorId: m.id, combo: null, refProgramId: null, targetScore: null }, 2);
  };
  const pickChoice = (method: AdmissionMethodKey, combo: string | null) => {
    const ref = d.majorId ? defaultRefProgram(programs, d.majorId, method, combo) : null;
    const start = ref ? cutoffsOf(ref, method)[0].score : null;
    set({ method, combo, refProgramId: ref?.id ?? null, targetScore: start }, 3);
  };
  const finish = () => {
    const g: Goal = { ...d, updatedAt: new Date().toISOString() };
    setGoal(g);
    setStep(5);
    toast("Đã lưu mục tiêu — gợi ý sẽ ưu tiên ngành bạn nhắm", "success");
  };

  if (!hydrated) return <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100" />;

  const choiceText = d.method === "thpt" ? `${d.combo} · ${comboLabel(combos.find((c) => c.code === d.combo) ?? { subjects: [] })}` : unit.label;
  const fitHint = (level: keyof typeof FIT_LABELS) => FIT_LABELS[level];

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">Đặt mục tiêu cùng trợ lý</h1>
            <p className="text-xs text-slate-500">4 câu ngắn · sửa được bất cứ lúc nào</p>
          </div>
          <div className="flex items-center gap-1" aria-label={`Câu ${Math.min(step, 4)} trên 4`}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5 w-7 rounded-full", i < step ? "bg-primary-600" : i === step ? "bg-primary-300" : "bg-slate-200")} />
            ))}
            <span className="ml-1 text-xs font-semibold text-primary-600">{step >= 5 ? "Xong" : `Câu ${step}/4`}</span>
          </div>
        </div>

        <div className="flex-1 space-y-4 bg-slate-50 p-4 sm:p-5" aria-live="polite">
          <Bot>
            <Bubble>
              Chào bạn! Mình giúp bạn đặt mục tiêu trong 4 câu. Bạn đang nghĩ tới ngành nào?
            </Bubble>
            {step === 1 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((m) => (
                  <Reply
                    key={m.id}
                    title={m.name}
                    sub={quiz && !q ? `Hợp sở thích ${matchMajor(quiz.result, m)}%` : undefined}
                    active={d.majorId === m.id}
                    onClick={() => pickMajor(m)}
                  />
                ))}
                {suggestions.length === 0 && <p className="text-[13px] text-slate-500">Không tìm thấy ngành “{q}”.</p>}
                <Link href="/trac-nghiem" className="self-center px-2 text-[13px] font-semibold text-primary-600 hover:underline">
                  Chưa biết – làm trắc nghiệm
                </Link>
              </div>
            )}
          </Bot>

          {major && step > 1 && (
            <>
              <Me>{major.name}</Me>
              {quiz && matchMajor(quiz.result, major) < 50 && (
                <Bot>
                  <p className="flex max-w-[560px] gap-2 rounded-xl border border-accent-200 bg-accent-50 px-3.5 py-2.5 text-[13px] text-accent-700">
                    <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    Nói thẳng nhé: kết quả trắc nghiệm của bạn ({quiz.result.code.join("-")}) khá xa ngành này (cần {major.riasec.join("-")}, khớp {matchMajor(quiz.result, major)}%). Bạn vẫn có thể chọn —
                    hãy xem kỹ chương trình học và hỏi sinh viên đang học trước khi quyết.
                  </p>
                </Bot>
              )}
              <Bot>
                <Bubble>Bạn xét tuyển bằng tổ hợp nào? Mình chỉ hiện các cách mà trường dạy {major.name} đang dùng.</Bubble>
                {step === 2 ? (
                  <div className="flex flex-wrap gap-2">
                    {choices.map((c) => (
                      <Reply
                        key={`${c.method}-${c.combo}`}
                        title={c.combo ?? ADMISSION_METHODS[c.method].short}
                        sub={c.combo ? `${comboLabel(combos.find((x) => x.code === c.combo)!)} · ${c.count} chương trình` : `${c.count} chương trình`}
                        active={d.method === c.method && d.combo === c.combo}
                        onClick={() => pickChoice(c.method, c.combo)}
                      />
                    ))}
                    {choices.length === 0 && <p className="text-[13px] text-slate-500">Chưa có chương trình nào của ngành này có điểm chuẩn để so.</p>}
                  </div>
                ) : null}
                {hidden.length > 0 && step === 2 && (
                  <p className="text-xs text-slate-500">Đã ẩn {hidden.join(", ")} — không chương trình nào của ngành này xét các tổ hợp đó.</p>
                )}
              </Bot>
            </>
          )}

          {major && step > 2 && (
            <>
              <Me>{choiceText}</Me>
              <Bot>
                <Bubble>
                  Bạn kỳ vọng khoảng bao nhiêu điểm? Các vạch trên thanh là điểm chuẩn 3 năm của {refProgram ? `${refProgram.name} – ${refProgram.schoolName}` : "chương trình mốc"} để bạn so.
                </Bubble>
                {refProgram && d.targetScore != null && (
                  <div className="max-w-[640px] rounded-xl border border-primary-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="ref-program" className="text-[13px] font-semibold text-slate-700">
                        So với chương trình
                      </label>
                      <span className="rounded-md bg-primary-600 px-2.5 py-1 text-base font-bold text-white">{formatMethodScore(d.targetScore, d.method)}</span>
                    </div>
                    <select
                      id="ref-program"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={refProgram.id}
                      onChange={(e) => set({ refProgramId: e.target.value })}
                      disabled={step !== 3}
                    >
                      {ofMajor.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} – {p.schoolName} (chuẩn {cutoffsOf(p, d.method)[0].score})
                        </option>
                      ))}
                    </select>
                    {step === 3 ? (
                      <ScoreSlider value={d.targetScore} onChange={(v) => set({ targetScore: v })} program={refProgram} method={d.method} />
                    ) : null}
                    {verdict && (
                      <p className="mt-1 flex gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-800">
                        <LuLightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {formatMethodScore(d.targetScore, d.method)} {verdict.diff >= 0 ? "cao" : "thấp"} hơn chuẩn {verdict.year} {Math.abs(verdict.diff).toFixed(unit.decimals)} điểm → mức{" "}
                        {fitHint(verdict.level)}.{verdict.level !== "an-toan" ? ` Muốn An toàn cần từ ${formatMethodScore(verdict.safeFrom, d.method)}.` : ""}
                      </p>
                    )}
                  </div>
                )}
                {step === 3 && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setStep(4)} disabled={d.targetScore == null}>
                      Chốt {d.targetScore != null ? formatMethodScore(d.targetScore, d.method) : ""}
                    </Button>
                    {profile && (profile.method ?? "thpt") === d.method && (!d.combo || profile.combo === d.combo) && (
                      <Button size="sm" variant="ghost" onClick={() => set({ targetScore: profile.admission.total }, 4)}>
                        Dùng điểm đã nhập ({formatMethodScore(profile.admission.total, profile.method ?? "thpt")})
                      </Button>
                    )}
                  </div>
                )}
              </Bot>
            </>
          )}

          {major && step > 3 && (
            <>
              <Me>{d.targetScore != null ? `${formatMethodScore(d.targetScore, d.method)} điểm` : "Chưa có điểm"}</Me>
              <Bot>
                <Bubble>Câu cuối: bạn muốn học ở khu vực nào, ngân sách học phí tối đa bao nhiêu?</Bubble>
                {step === 4 && (
                  <>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Khu vực">
                      {(["bac", "trung", "nam"] as Region[]).map((r) => (
                        <Reply
                          key={r}
                          title={REGION_LABELS[r]}
                          active={d.regions.includes(r)}
                          onClick={() => set({ regions: d.regions.includes(r) ? d.regions.filter((x) => x !== r) : [...d.regions, r] })}
                        />
                      ))}
                      <Reply title="Không giới hạn" active={d.regions.length === 0} onClick={() => set({ regions: [] })} />
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Ngân sách">
                      {BUDGETS.map((b) => (
                        <Reply key={b} title={`≤ ${b} triệu/năm`} active={d.budgetMax === b} onClick={() => set({ budgetMax: b })} />
                      ))}
                      <Reply title="Không giới hạn" active={d.budgetMax == null} onClick={() => set({ budgetMax: null })} />
                    </div>
                    <Button size="sm" onClick={finish}>
                      <LuCheck className="size-4" aria-hidden /> Lưu mục tiêu
                    </Button>
                  </>
                )}
              </Bot>
            </>
          )}

          {step === 5 && major && (
            <>
              <Me>
                {d.regions.length ? d.regions.map((r) => REGION_LABELS[r]).join(", ") : "Mọi khu vực"} · {d.budgetMax ? `≤ ${d.budgetMax} triệu/năm` : "không giới hạn học phí"}
              </Me>
              <Bot>
                <Bubble>
                  Xong! Mục tiêu: {major.name}, {choiceText}
                  {d.targetScore != null ? `, ${formatMethodScore(d.targetScore, d.method)} điểm` : ""}. Trovio sẽ ưu tiên ngành này và báo khi gợi ý lệch mục tiêu.
                </Bubble>
                <div className="flex flex-wrap gap-2">
                  <Link href="/goi-y" className={buttonClass({ size: "sm" })}>
                    Xem gợi ý theo mục tiêu <LuArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
                    Đặt lại từ đầu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setGoal(null);
                      setDraft({ ...EMPTY });
                      setStep(1);
                      toast("Đã xoá mục tiêu", "info");
                    }}
                  >
                    Xoá mục tiêu
                  </Button>
                </div>
              </Bot>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
          <label htmlFor="goal-input" className="sr-only">
            Gõ tên ngành
          </label>
          <input
            id="goal-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (step !== 1) setStep(1);
            }}
            maxLength={60}
            placeholder={step === 1 ? "Hoặc gõ tên ngành, VD: Luật, Dược…" : "Gõ để đổi ngành"}
            className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:border-primary-600 focus:outline-none"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Mục tiêu đang hình thành</h2>
          <ul className="mt-3 space-y-3">
            {(
              [
                ["Ngành", major?.name ?? "Câu 1", 1],
                ["Tổ hợp / phương thức", step > 2 ? choiceText : "Câu 2", 2],
                ["Điểm mục tiêu", step > 2 && d.targetScore != null ? `${formatMethodScore(d.targetScore, d.method)}${step === 3 ? " (đang chọn)" : ""}` : "Câu 3", 3],
                ["Khu vực & ngân sách", step > 4 ? `${d.regions.length ? d.regions.map((r) => REGION_LABELS[r]).join(", ") : "Mọi khu vực"} · ${d.budgetMax ? `≤ ${d.budgetMax} tr` : "không giới hạn"}` : "Câu 4", 4],
              ] as const
            ).map(([k, v, s]) => {
              const state = step > s ? "done" : step === s ? "now" : "todo";
              return (
                <li key={k} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      state === "done" ? "bg-success-500 text-white" : state === "now" ? "bg-primary-600" : "bg-slate-200",
                    )}
                    aria-hidden
                  >
                    {state === "done" && <LuCheck className="size-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className={cn("truncate text-sm", state === "todo" ? "text-slate-400" : "font-semibold text-slate-900")}>{v}</p>
                  </div>
                  {state === "done" && (
                    <button type="button" className="text-xs font-semibold text-primary-600 hover:underline" onClick={() => setStep(s as Step)}>
                      Sửa
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
        {major && (
          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">Xem trước: {counts.total} chương trình khớp</h2>
            {d.targetScore != null ? (
              <ul className="mt-3 space-y-2.5">
                {(
                  [
                    ["an-toan", "bg-success-50 text-success-700", "bg-success-500"],
                    ["vua-suc", "bg-primary-50 text-primary-700", "bg-primary-600"],
                    ["thu-suc", "bg-accent-50 text-accent-700", "bg-accent-500"],
                  ] as const
                ).map(([lv, tag, bar]) => (
                  <li key={lv} className="flex items-center gap-3">
                    <span className={cn("w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold", tag)}>{FIT_LABELS[lv]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className={cn("block h-full rounded-full", bar)} style={{ width: `${counts.total ? (counts[lv] / counts.total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-5 text-right text-sm font-bold">{counts[lv]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Chọn điểm mục tiêu để xem mức An toàn / Vừa sức / Thử sức.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">Tính theo điểm mục tiêu (chưa phải điểm thật) và điểm chuẩn năm gần nhất.</p>
          </Card>
        )}
        <p className="flex gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
          <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-700" aria-hidden />
          Trợ lý chỉ dùng câu trả lời để lọc chương trình — không hỏi tên trường bạn đang học, số điện thoại hay ngày sinh.
        </p>
      </div>
    </div>
  );
}
