"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LuArrowLeft, LuArrowRight, LuBookOpen, LuCalculator, LuCheck, LuClipboardList, LuMapPin, LuShieldCheck, LuTarget } from "react-icons/lu";
import type { AdmissionMethodKey, Combo, MajorGroup, PriorityGroup, PriorityRegion, Region, SchoolType, Subject } from "@/domain/types";
import { REGION_LABELS, SCHOOL_TYPE_LABELS, serializeProgramFilters, TUITION_RANGES, type TuitionRange } from "@/services/program.filters";
import {
  ADMISSION_METHODS,
  computeAdmissionScore,
  computeComboTotal,
  formatMethodScore,
  METHOD_KEYS,
  PRIORITY_GROUP_LABELS,
  PRIORITY_REDUCTION_THRESHOLD,
  PRIORITY_REGION_LABELS,
  profileMethod,
} from "@/services/scoring.service";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { Checkbox } from "@/components/ui/field";

const STEPS = ["Phương thức & điểm", "Khu vực & ngân sách", "Nhóm ngành quan tâm"];

function Pill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
        active ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary-300",
      )}
    >
      {children}
    </button>
  );
}

function StepHeader({ n, icon, title, desc }: { n: number; icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 [&>svg]:size-5">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {n}. {title}
        </h2>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

export function ScoreWizard({ combos, subjects, groups }: { combos: Combo[]; subjects: Subject[]; groups: MajorGroup[] }) {
  const router = useRouter();
  const { profile, setProfile, hydrated } = useTrovio();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<AdmissionMethodKey>("thpt");
  const [examScore, setExamScore] = useState("");
  const [combo, setCombo] = useState("A00");
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [region, setRegion] = useState<PriorityRegion>("KV3");
  const [group, setGroup] = useState<PriorityGroup>("none");
  const [regions, setRegions] = useState<Region[]>([]);
  const [budget, setBudget] = useState<TuitionRange | "">("");
  const [types, setTypes] = useState<SchoolType[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hydrated || !profile) return;
    const m = profileMethod(profile);
    setMethod(m);
    if (!ADMISSION_METHODS[m].needsCombo) setExamScore(String(profile.admission.rawTotal));
    if (profile.combo) setCombo(profile.combo);
    setRaw(Object.fromEntries(Object.entries(profile.scores).map(([k, v]) => [k, String(v)])));
    setRegion(profile.priorityRegion);
    setGroup(profile.priorityGroup);
    setRegions(profile.regions);
    setTypes(profile.schoolTypes);
    setGroupIds(profile.groupIds);
    const b = (Object.keys(TUITION_RANGES) as TuitionRange[]).find((k) => TUITION_RANGES[k].max === profile.budgetMax);
    setBudget(b ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const cfg = ADMISSION_METHODS[method];
  const comboObj = combos.find((c) => c.code === combo) ?? combos[0];
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const subjectShort = (id: string) => subjects.find((s) => s.id === id)?.short ?? id;
  const scores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of comboObj.subjects) {
      const v = Number((raw[s] ?? "").replace(",", "."));
      if (raw[s] !== undefined && raw[s] !== "" && Number.isFinite(v)) out[s] = v;
    }
    return out;
  }, [raw, comboObj]);
  const invalid = (s: string) => raw[s] !== undefined && raw[s] !== "" && !(scores[s] >= 0 && scores[s] <= 10);
  const examNum = Number(examScore.replace(",", "."));
  const examInvalid = examScore !== "" && !(Number.isFinite(examNum) && examNum > 0 && examNum <= cfg.max);
  const total = cfg.needsCombo ? computeComboTotal(scores, comboObj) : examScore !== "" && !examInvalid ? examNum : null;
  const admission = total != null ? computeAdmissionScore(total, region, group, method) : null;

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const finish = () => {
    if (!admission) return;
    setProfile({
      method,
      combo: cfg.needsCombo ? combo : "",
      scores: cfg.needsCombo ? scores : {},
      priorityRegion: region,
      priorityGroup: group,
      regions,
      budgetMax: budget ? TUITION_RANGES[budget].max : null,
      schoolTypes: types,
      groupIds,
      admission,
      updatedAt: new Date().toISOString(),
    });
    track("score_saved");
    const qs = serializeProgramFilters({
      method,
      score: admission.total,
      combos: cfg.needsCombo ? [combo] : [],
      tuition: budget || undefined,
      regions,
      types,
      groups: groupIds,
    });
    router.push(`/chuong-trinh${qs}`);
  };

  const canNext = step === 0 ? admission != null : true;

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-card" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                i < step ? "bg-success-700 text-white" : i === step ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <LuCheck className="size-4" aria-label="Đã xong" /> : i + 1}
            </span>
            <span className={cn("hidden text-[13px] sm:block", i === step ? "font-bold text-slate-900" : "text-slate-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px flex-1 bg-slate-200 sm:block" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        {step === 0 && (
          <div className="space-y-8">
            <section>
              <StepHeader n={1} icon={<LuClipboardList />} title="Phương thức xét tuyển" desc="Chọn loại điểm bạn đang có. Có thể đổi và nhập lại bất cứ lúc nào." />
              <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Phương thức xét tuyển">
                {METHOD_KEYS.map((k) => (
                  <Pill key={k} active={method === k} onClick={() => setMethod(k)}>
                    {ADMISSION_METHODS[k].short}
                  </Pill>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{cfg.label} · thang {cfg.max}</p>
            </section>

            {cfg.needsCombo ? (
              <>
            <section className="border-t border-slate-100 pt-8">
              <StepHeader n={2} icon={<LuBookOpen />} title="Chọn tổ hợp môn xét tuyển" desc="Hệ thống tính tổng điểm theo tổ hợp bạn chọn." />
              <div className="mt-4 flex flex-wrap gap-2">
                {combos.map((c) => (
                  <Pill key={c.code} active={combo === c.code} onClick={() => setCombo(c.code)}>
                    {c.code} ({c.subjects.map(subjectShort).join(", ")})
                  </Pill>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 pt-8">
              <StepHeader n={3} icon={<LuCalculator />} title="Nhập điểm 3 môn" desc={`${cfg.inputHint}.`} />
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {comboObj.subjects.map((s) => (
                  <div key={s}>
                    <label htmlFor={`sc-${s}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {subjectName(s)}
                    </label>
                    <input
                      id={`sc-${s}`}
                      inputMode="decimal"
                      placeholder="0 – 10"
                      value={raw[s] ?? ""}
                      onChange={(e) => setRaw((r) => ({ ...r, [s]: e.target.value }))}
                      onBlur={() => setTouched((t) => ({ ...t, [s]: true }))}
                      aria-invalid={invalid(s) || undefined}
                      aria-describedby={invalid(s) ? `sc-${s}-err` : undefined}
                      className={cn(
                        "h-12 w-full rounded-lg border px-4 text-lg font-bold focus:ring-4 focus:outline-none",
                        invalid(s) ? "border-danger-500 focus:ring-danger-100" : "border-slate-300 focus:border-primary-600 focus:ring-primary-100",
                      )}
                    />
                    {invalid(s) && touched[s] !== false && (
                      <p id={`sc-${s}-err`} className="mt-1 text-xs font-medium text-danger-700">
                        Điểm phải từ 0 đến 10.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
              </>
            ) : (
              <section className="border-t border-slate-100 pt-8">
                <StepHeader n={2} icon={<LuCalculator />} title="Nhập điểm bài thi" desc={`${cfg.inputHint}. Điểm dự kiến cũng được.`} />
                <div className="mt-4 max-w-xs">
                  <label htmlFor="sc-exam" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Điểm {cfg.short}
                  </label>
                  <input
                    id="sc-exam"
                    inputMode="decimal"
                    placeholder={`0 – ${cfg.max}`}
                    value={examScore}
                    onChange={(e) => setExamScore(e.target.value)}
                    aria-invalid={examInvalid || undefined}
                    aria-describedby={examInvalid ? "sc-exam-err" : undefined}
                    className={cn(
                      "h-12 w-full rounded-lg border px-4 text-lg font-bold focus:ring-4 focus:outline-none",
                      examInvalid ? "border-danger-500 focus:ring-danger-100" : "border-slate-300 focus:border-primary-600 focus:ring-primary-100",
                    )}
                  />
                  {examInvalid && (
                    <p id="sc-exam-err" className="mt-1 text-xs font-medium text-danger-700">
                      Điểm phải lớn hơn 0 và không quá {cfg.max}.
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="border-t border-slate-100 pt-8">
              <StepHeader
                n={cfg.needsCombo ? 4 : 3}
                icon={<LuShieldCheck />}
                title="Khu vực & đối tượng ưu tiên"
                desc={cfg.max === 30 ? "Điểm ưu tiên theo quy chế tuyển sinh của Bộ GD&ĐT." : `Điểm ưu tiên được quy đổi sang thang ${cfg.max} (×${cfg.factor}).`}
              />
              <p className="mt-4 mb-2 text-sm font-semibold text-slate-700">Khu vực</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRIORITY_REGION_LABELS) as PriorityRegion[]).map((k) => (
                  <Pill key={k} active={region === k} onClick={() => setRegion(k)}>
                    {PRIORITY_REGION_LABELS[k]}
                  </Pill>
                ))}
              </div>
              <p className="mt-4 mb-2 text-sm font-semibold text-slate-700">Đối tượng</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRIORITY_GROUP_LABELS) as PriorityGroup[]).map((k) => (
                  <Pill key={k} active={group === k} onClick={() => setGroup(k)}>
                    {PRIORITY_GROUP_LABELS[k]}
                  </Pill>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-5" aria-live="polite">
                {admission ? (
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <dl className="space-y-1 text-sm text-slate-700">
                      <div className="flex gap-2">
                        <dt>{cfg.needsCombo ? `Tổng 3 môn (${combo}):` : `Điểm ${cfg.short}:`}</dt>
                        <dd className="font-bold">{formatMethodScore(admission.rawTotal, method)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt>Điểm ưu tiên:</dt>
                        <dd className="font-bold">
                          +{admission.priorityApplied.toFixed(2)}
                          {admission.reduced && admission.priorityPoints > 0 && (
                            <span className="ml-1 font-normal text-slate-500">
                              (giảm từ {admission.priorityPoints} vì điểm ≥ {PRIORITY_REDUCTION_THRESHOLD * cfg.factor})
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary-800 uppercase">Điểm xét tuyển · {cfg.short}</p>
                      <p className="text-4xl font-extrabold text-primary-700">{formatMethodScore(admission.total, method)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-primary-900">{cfg.needsCombo ? "Nhập đủ điểm 3 môn để xem điểm xét tuyển." : "Nhập điểm bài thi để xem điểm xét tuyển."}</p>
                )}
              </div>
              {admission?.reduced && admission.priorityPoints > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Công thức: [({cfg.max} − {formatMethodScore(admission.rawTotal, method)}) ÷ {7.5 * cfg.factor}] × {admission.priorityPoints} = {admission.priorityApplied.toFixed(2)}
                </p>
              )}
            </section>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <section>
              <StepHeader n={cfg.needsCombo ? 5 : 4} icon={<LuMapPin />} title="Khu vực học mong muốn" desc="Bỏ trống nếu bạn học được ở mọi nơi." />
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
                  <Pill key={r} active={regions.includes(r)} onClick={() => setRegions((x) => toggle(x, r))}>
                    {REGION_LABELS[r]}
                  </Pill>
                ))}
              </div>
            </section>
            <section className="border-t border-slate-100 pt-8">
              <p className="mb-3 text-sm font-semibold text-slate-700">Ngân sách học phí tối đa / năm</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={budget === ""} onClick={() => setBudget("")}>
                  Không giới hạn
                </Pill>
                {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((k) => (
                  <Pill key={k} active={budget === k} onClick={() => setBudget(k)}>
                    {TUITION_RANGES[k].label}
                  </Pill>
                ))}
              </div>
            </section>
            <section className="border-t border-slate-100 pt-8">
              <p className="mb-3 text-sm font-semibold text-slate-700">Loại hình trường</p>
              <div className="flex flex-wrap gap-5">
                {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => (
                  <Checkbox key={t} label={SCHOOL_TYPE_LABELS[t]} checked={types.includes(t)} onChange={() => setTypes((x) => toggle(x, t))} />
                ))}
              </div>
            </section>
          </div>
        )}

        {step === 2 && (
          <section>
            <StepHeader n={cfg.needsCombo ? 6 : 5} icon={<LuTarget />} title="Nhóm ngành bạn quan tâm" desc="Không bắt buộc. Chưa rõ? Hãy làm trắc nghiệm sở thích." />
            <div className="mt-4 flex flex-wrap gap-2">
              {groups.map((g) => (
                <Pill key={g.id} active={groupIds.includes(g.id)} onClick={() => setGroupIds((x) => toggle(x, g.id))}>
                  {g.name}
                </Pill>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Chưa có định hướng?{" "}
              <Link href="/trac-nghiem" className="font-semibold text-primary-600 hover:underline">
                Làm trắc nghiệm RIASEC
              </Link>
            </p>
          </section>
        )}

        <p className="mt-8 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <LuShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Điểm được lưu trên trình duyệt (và đồng bộ vào tài khoản khi bạn đăng nhập) chỉ để gợi ý chương trình phù hợp, không chia sẻ với bên thứ ba.
        </p>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <span className="text-sm text-slate-500">Bước {step + 1} / {STEPS.length}</span>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <LuArrowLeft className="size-4" aria-hidden /> Quay lại
              </Button>
            ) : (
              <Link href="/chuong-trinh" className="px-3 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Bỏ qua
              </Link>
            )}
            {step < STEPS.length - 1 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Tiếp tục <LuArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!admission}>
                Xem chương trình phù hợp <LuArrowRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
