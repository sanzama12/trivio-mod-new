"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LuBookOpen, LuCalculator, LuClipboardList, LuMapPin, LuShieldCheck, LuTarget, LuWallet } from "react-icons/lu";
import type { AdmissionMethodKey, Combo, MajorGroup, PriorityGroup, PriorityRegion, Region, SchoolType, Subject } from "@/domain/types";
import { REGION_LABELS, SCHOOL_TYPE_LABELS, TUITION_RANGES, type TuitionRange } from "@/services/program.filters";
import {
  ADMISSION_METHODS,
  computeAdmissionScore,
  formatMethodScore,
  METHOD_KEYS,
  PRIORITY_GROUP_LABELS,
  PRIORITY_REDUCTION_THRESHOLD,
  PRIORITY_REGION_LABELS,
  profileMethod,
  rankCombos,
  scoresForMethod,
  transcriptScores,
  assess2026EntrySource,
  isValidSubjectScore,
} from "@/services/scoring.service";
import { OFFICIAL_POLICY_2026 } from "@/services/admission-policy.service";
import { THPT_2026_SUBJECTS } from "@/domain/admission-2026";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { Checkbox } from "@/components/ui/field";

type MajorOpt = { id: string; name: string; groupId: string };

function Pill({ active, children, onClick, disabled }: { active: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-full border px-4 py-2 text-[13px] font-semibold break-words transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary-600 bg-primary-600 text-white shadow-[inset_0_-3px_0_var(--color-accent-500)]"
          : "border-slate-300 bg-white text-slate-700 hover:border-primary-600 hover:text-primary-700",
      )}
    >
      {children}
    </button>
  );
}

function LedgerStep({ no, icon, title, desc }: { no: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-none border-b-4 border-accent-500 bg-primary-600 font-black text-white [&>svg]:size-4">
        {no}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex min-w-0 items-center gap-2 text-left text-lg font-black text-slate-900">
          <span aria-hidden className="text-primary-600 [&>svg]:size-5">{icon}</span>
          <span className="break-words">{title}</span>
        </h2>
        <p className="mt-0.5 text-sm break-words text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

const parseNum = (s: string) => {
  const normalized = s.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
};

export function ScoreWizard({
  combos,
  subjects: catalogSubjects,
  groups,
  majors = [],
}: {
  combos: Combo[];
  subjects: Subject[];
  groups: MajorGroup[];
  majors?: MajorOpt[];
}) {
  const router = useRouter();
  const subjects = THPT_2026_SUBJECTS;
  const { profile, setProfile, hydrated } = useTrovio();
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [chosenCombos, setChosenCombos] = useState<Partial<Record<AdmissionMethodKey, string>>>({});
  const [annualRaw, setAnnualRaw] = useState<Record<string, [string, string, string]>>({});
  const [graduationYearRaw, setGraduationYearRaw] = useState("2026");
  const [exemptionClaimed, setExemptionClaimed] = useState(false);
  const [methods, setMethods] = useState<AdmissionMethodKey[]>(["thpt"]);
  const [region, setRegion] = useState<PriorityRegion>("KV3");
  const [group, setGroup] = useState<PriorityGroup>("none");
  const [regions, setRegions] = useState<Region[]>([]);
  const [budget, setBudget] = useState<TuitionRange | "">("");
  const [types, setTypes] = useState<SchoolType[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [interest, setInterest] = useState<string[]>([]);
  const [majorQ, setMajorQ] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hydrated || !profile) return;
    const m = profileMethod(profile);
    setMethods(profile.methods?.length ? profile.methods : [m]);
    setChosenCombos(profile.combosByMethod ?? { [m]: profile.combo });
    setRaw(Object.fromEntries(Object.entries(scoresForMethod(profile, "thpt")).map(([k, v]) => [k, String(v)])));
    setAnnualRaw(Object.fromEntries(Object.entries(profile.transcriptAnnualScores ?? {}).map(([id, values]) => [id, values.map(String) as [string, string, string]])));
    setGraduationYearRaw(profile.graduationYear ? String(profile.graduationYear) : "2026");
    setRegion(profile.priorityRegion);
    setGroup(profile.priorityGroup);
    setRegions(profile.regions);
    setTypes(profile.schoolTypes);
    setGroupIds(profile.groupIds);
    setInterest(profile.interestMajorIds ?? []);
    const b = (Object.keys(TUITION_RANGES) as TuitionRange[]).find((k) => TUITION_RANGES[k].max === profile.budgetMax);
    setBudget(b ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const subjectShort = (id: string) => subjects.find((s) => s.id === id)?.short ?? catalogSubjects.find(s => s.id === id)?.short ?? id;

  const scores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of subjects) {
      const n = parseNum(raw[s.id] ?? "");
      if (n != null && n >= 0 && n <= 10) out[s.id] = n;
    }
    return out;
  }, [raw, subjects]);

  const invalid = (id: string) => {
    const n = parseNum(raw[id] ?? "");
    return raw[id] != null && raw[id] !== "" && !(n != null && n >= 0 && n <= 10);
  };

  const selected = methods.length ? methods : (["thpt"] as AdmissionMethodKey[]);
  const annualScores = useMemo(() => Object.fromEntries(Object.entries(annualRaw).flatMap(([id, values]) => {
    const parsed = values.map(parseNum);
    return parsed.every(isValidSubjectScore) ? [[id, parsed as [number, number, number]]] : [];
  })), [annualRaw]);
  const methodSubjects = { thpt: scores, hocba: transcriptScores(annualScores) };
  const graduationYear = Number(graduationYearRaw);
  const validYear = /^\d{4}$/.test(graduationYearRaw) && Number.isInteger(graduationYear) && graduationYear >= 1900 && graduationYear <= 2026;
  const rankedByMethod = { thpt: rankCombos(methodSubjects.thpt, combos), hocba: rankCombos(methodSubjects.hocba, combos) };
  const entrySource = assess2026EntrySource(scores, combos, validYear ? graduationYear : undefined, exemptionClaimed);
  const methodTotals = selected.map((m) => {
    const ranked = rankedByMethod[m];
    const pinned = ranked.find(row => row.code === chosenCombos[m]) ?? ranked[0];
    if (!pinned) return { method: m, admission: null as ReturnType<typeof computeAdmissionScore> | null, combo: "" };
    return { method: m, admission: validYear ? computeAdmissionScore(pinned.raw, region, group, m, { admissionSeason: 2026, graduationYear }) : null, combo: pinned.code };
  });
  const invalidThpt = subjects.some(subject => invalid(subject.id));
  const invalidAnnual = selected.includes("hocba") && Object.values(annualRaw).some(values => values.some(value => value.trim() !== "" && !isValidSubjectScore(parseNum(value))));
  const canSave = validYear && !invalidThpt && !invalidAnnual && methodTotals.every(row => row.admission != null);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleMethod = (k: AdmissionMethodKey) => {
    setMethods((cur) => {
      if (cur.includes(k)) return cur.length === 1 ? cur : cur.filter((x) => x !== k);
      return [...cur, k];
    });
  };

  const majorHits = useMemo(() => {
    const q = majorQ.trim().toLowerCase();
    let list = majors;
    if (groupIds.length) list = list.filter((m) => groupIds.includes(m.groupId));
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    else if (!groupIds.length) list = [];
    return list.slice(0, 24);
  }, [majors, groupIds, majorQ]);

  const selectedMajors = majors.filter((m) => interest.includes(m.id));
  const filledSubjects = subjects.filter((s) => scores[s.id] != null && !invalid(s.id)).length;

  const finish = () => {
    if (!canSave) return;
    const usable = methodTotals.filter((row) => row.admission != null);
    const primary = usable[0];
    if (!primary?.admission) return;
    setProfile({
      method: primary.method,
      combo: primary.combo,
      scores: methodSubjects[primary.method],
      scoresByMethod: { thpt: scores, ...(selected.includes("hocba") ? { hocba: methodSubjects.hocba } : {}) },
      combosByMethod: Object.fromEntries(usable.map(row => [row.method, row.combo])),
      transcriptAnnualScores: selected.includes("hocba") ? annualScores : undefined,
      admissionSeason: 2026,
      graduationYear,
      methods: selected,
      interestMajorIds: interest.length ? interest : undefined,
      priorityRegion: region,
      priorityGroup: group,
      regions,
      budgetMax: budget ? TUITION_RANGES[budget].max : null,
      schoolTypes: types,
      groupIds,
      admission: primary.admission,
      updatedAt: new Date().toISOString(),
    });
    track("score_saved");
    router.push("/chuong-trinh");
  };

  return (
    <div className="mx-auto max-w-3xl min-w-0">
      <div className="rounded-none border border-slate-200 border-t-4 border-t-primary-600 border-l-4 border-l-accent-500 bg-white p-4 shadow-card sm:p-6 md:p-8">
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Mùa tuyển sinh <strong>2026</strong> · <a href={OFFICIAL_POLICY_2026.officialSourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary-700 underline">Thông tư 06/2026/TT-BGDĐT</a>. Đối chiếu ngày 16/11/2026. Bản tính tham khảo cho tổ hợp 3 môn đồng trọng số, thang 30; chưa gồm điểm cộng, hệ số môn và quy đổi riêng của từng trường.
        </p>
        <div className="divide-y divide-dashed divide-slate-200 [&>section]:py-6 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
          <section>
            <LedgerStep no="1" icon={<LuCalculator />} title="Điểm theo phương thức" desc="THPT và học bạ được nhập, tính và lưu riêng. Chỉ nhập môn có điểm, tối đa 2 chữ số thập phân." />
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Phương thức xét tuyển">
              {METHOD_KEYS.map(k => <Pill key={k} active={selected.includes(k)} onClick={() => toggleMethod(k)}>{ADMISSION_METHODS[k].short}</Pill>)}
            </div>
            <h3 className="mt-5 font-bold text-slate-800">Điểm thi tốt nghiệp THPT</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Điểm thi thực tế hoặc dự kiến, thang 10. Không điền 0 cho môn không thi. Khi xét học bạ, dữ liệu này chỉ dùng kiểm tra ngưỡng nguồn tuyển chung; không dùng thay điểm học bạ. Điểm năng khiếu và điểm quy đổi chứng chỉ cần xét theo trường.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {subjects.map((s) => (
                <div key={s.id}>
                  <label htmlFor={`sc-${s.id}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {s.name}
                  </label>
                  <input
                    id={`sc-${s.id}`}
                    inputMode="decimal"
                    placeholder="0 – 10"
                    value={raw[s.id] ?? ""}
                    onChange={(e) => setRaw((r) => ({ ...r, [s.id]: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, [s.id]: true }))}
                    aria-invalid={invalid(s.id) || undefined}
                    aria-describedby={invalid(s.id) ? `sc-${s.id}-err` : undefined}
                    className={cn(
                      "h-12 w-full rounded-lg border px-4 text-lg font-bold focus:ring-4 focus:outline-none",
                      invalid(s.id) ? "border-danger-500 focus:ring-danger-100" : "border-slate-300 focus:border-primary-600 focus:ring-primary-100",
                    )}
                  />
                  {invalid(s.id) && touched[s.id] && (
                    <p id={`sc-${s.id}-err`} className="mt-1 text-xs font-medium text-danger-700">
                      Nhập số từ 0 đến 10, tối đa 2 chữ số thập phân.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Đã nhập {filledSubjects}/{subjects.length} môn.</p>
            {selected.includes("hocba") && (
              <div className="mt-6">
                <h3 className="font-bold text-slate-800">Học bạ · Điểm trung bình cả năm lớp 10, 11, 12</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Nhập đúng điểm cả năm ghi trên học bạ, bao quát 6 học kỳ. Không dùng riêng lớp 12 hoặc trung bình đơn giản 6 học kỳ. Mỗi môn cần đủ 3 năm; trường hợp đổi môn phải đối chiếu quy định môn thay thế của trường.</p>
                {profile && profileMethod(profile) === "hocba" && !profile.transcriptAnnualScores && <p className="mt-2 text-sm text-amber-800">Hồ sơ cũ chưa có điểm cả năm từng lớp. Vui lòng nhập lại để tính theo quy chế 2026.</p>}
                <div className="mt-4 space-y-4">
                  {subjects.map(subject => (
                    <fieldset key={subject.id} className="rounded-lg border border-slate-200 p-3">
                      <legend className="px-1 text-sm font-semibold text-slate-700">{subject.name}</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map(index => {
                          const value = annualRaw[subject.id]?.[index] ?? "";
                          const error = value.trim() !== "" && !isValidSubjectScore(parseNum(value));
                          return <div key={index}>
                            <label htmlFor={`hb-${subject.id}-${index}`} className="mb-1 block text-xs text-slate-600">Cả năm lớp {index + 10}</label>
                            <input id={`hb-${subject.id}-${index}`} inputMode="decimal" value={value} placeholder="0 – 10" aria-invalid={error || undefined} aria-describedby={error ? `hb-${subject.id}-${index}-err` : undefined}
                              onChange={event => setAnnualRaw(current => {
                                const values: [string, string, string] = [...(current[subject.id] ?? ["", "", ""])];
                                values[index] = event.target.value;
                                return { ...current, [subject.id]: values };
                              })}
                              className={cn("h-11 w-full min-w-0 rounded-lg border px-2 font-semibold", error ? "border-danger-500" : "border-slate-300")} />
                            {error && <p id={`hb-${subject.id}-${index}-err`} className="mt-1 text-xs text-danger-700">Từ 0 đến 10, tối đa 2 chữ số thập phân.</p>}
                          </div>;
                        })}
                      </div>
                      {methodSubjects.hocba[subject.id] != null && <p className="mt-2 text-xs text-slate-500">Trung bình 3 năm: {methodSubjects.hocba[subject.id].toFixed(2)} (hiển thị làm tròn; phép tính giữ độ chính xác).</p>}
                    </fieldset>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <LedgerStep no="2" icon={<LuBookOpen />} title="Tổ hợp theo từng phương thức" desc="Mỗi tổ hợp có 3 môn, gồm Toán hoặc Ngữ văn chiếm 1/3 trọng số. Chỉ hiện tổ hợp đã có trong danh mục; trường quyết định tổ hợp thực tế được xét." />
            {selected.map(method => <div key={method} className="mt-4">
              <h3 className="text-sm font-bold text-slate-700">{ADMISSION_METHODS[method].short}</h3>
              {rankedByMethod[method].length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {rankedByMethod[method].map((row, i) => {
                  const c = combos.find((x) => x.code === row.code);
                  const active = methodTotals.find(total => total.method === method)?.combo === row.code;
                  return (
                    <Pill key={row.code} active={active} onClick={() => setChosenCombos(current => ({ ...current, [method]: row.code }))}>
                      {row.code} · {row.raw.toFixed(2)}
                      {c ? ` (${c.subjects.map(subjectShort).join(", ")})` : ""}
                      {i === 0 ? " · mạnh nhất" : ""}
                    </Pill>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nhập đủ điểm của 3 môn trong tổ hợp, có Toán hoặc Ngữ văn.</p>
            )}</div>)}
          </section>

          <section>
            <LedgerStep no="3" icon={<LuClipboardList />} title="Năm tốt nghiệp & ngưỡng nguồn tuyển" desc="Ngưỡng 15/30 tính từ điểm thi THPT, chưa cộng ưu tiên và điểm cộng; không dùng tổng học bạ để thay thế." />
            <label htmlFor="graduation-year" className="mt-4 block text-sm font-semibold text-slate-700">Năm tốt nghiệp THPT</label>
            <input id="graduation-year" inputMode="numeric" value={graduationYearRaw} onChange={event => setGraduationYearRaw(event.target.value)} aria-invalid={!validYear || undefined} aria-describedby="graduation-year-hint" className="mt-2 h-11 w-36 rounded-lg border border-slate-300 px-3" />
            <p id="graduation-year-hint" className="mt-2 text-xs text-slate-500">{validYear ? "Ưu tiên khu vực chỉ áp dụng trong năm tốt nghiệp và một năm kế tiếp." : "Nhập năm tốt nghiệp hợp lệ, không sau mùa tuyển sinh 2026."}</p>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={exemptionClaimed} onChange={event => setExemptionClaimed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary-700" />
              <span>Tôi cần đối chiếu diện ngoại lệ theo khoản 3 Điều 6 (đặc cách tốt nghiệp hoặc các diện được dẫn chiếu tại Điều 8). Trường sẽ kiểm tra hồ sơ minh chứng.</span>
            </label>
            <p className="mt-4 text-sm leading-relaxed text-slate-600" aria-live="polite">
              {entrySource.status === "met" && `Các môn thi đã nhập đạt ${entrySource.rawTotal!.toFixed(2)}/30, đáp ứng ngưỡng nguồn tuyển chung 15 điểm. Chưa kết luận đủ điều kiện từng trường/ngành.`}
              {entrySource.status === "below" && `Tổng cao nhất kiểm tra được là ${entrySource.rawTotal!.toFixed(2)}/30, chưa đạt ngưỡng nguồn tuyển 15 điểm. Kiểm tra đủ điểm thi trước khi đăng ký; điểm ưu tiên không bù cho ngưỡng này.`}
              {entrySource.status === "unknown" && "Chưa đủ dữ liệu kiểm tra ngưỡng nguồn tuyển. Cần điểm 3 môn thi theo tổ hợp xét tuyển hoặc Toán + Ngữ văn + một môn thi khác. Bạn vẫn có thể lưu điểm để tham khảo."}
              {entrySource.status === "not-applicable" && "Ngưỡng nguồn tuyển chung 15 điểm tại khoản 3 Điều 6 áp dụng cho thí sinh thi tốt nghiệp từ năm 2026; vẫn cần đáp ứng điều kiện của trường/ngành."}
              {entrySource.status === "exemption-review" && "Chưa xác nhận diện ngoại lệ. Cần trường kiểm tra đúng đối tượng và minh chứng; lựa chọn này không xác nhận đủ điều kiện dự tuyển."}
            </p>
          </section>

          <section>
            <LedgerStep
              no="4"
              icon={<LuShieldCheck />}
              title="Khu vực & đối tượng ưu tiên"
              desc="Mức ưu tiên thang 30 theo Điều 7; từ 22,50 điểm áp dụng công thức giảm dần, làm tròn điểm ưu tiên đến hàng phần trăm."
            />
            {validYear && graduationYear < 2025 && <p className="mt-3 text-sm text-amber-800">Đã hết thời hạn ưu tiên khu vực trong mùa 2026. Hệ thống không cộng điểm khu vực; ưu tiên đối tượng vẫn được tính nếu đúng diện.</p>}
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Khu vực xác định theo nơi học THPT lâu nhất, không phải nơi muốn học đại học; nếu thời gian bằng nhau, dùng nơi học sau cùng. Chỉ chọn một nhóm đối tượng được hưởng mức cao nhất.</p>
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
            <div className="mt-6 space-y-3 border border-primary-600 border-l-4 border-l-accent-500 bg-primary-50 p-4 sm:p-5" aria-live="polite">
              {methodTotals.some((row) => row.admission) ? (
                methodTotals.map((row) => {
                  if (!row.admission) {
                    return (
                      <p key={row.method} className="text-sm text-primary-900">
                        {ADMISSION_METHODS[row.method].short}: "chưa đủ 3 môn tổ hợp."
                      </p>
                    );
                  }
                  const cfg = ADMISSION_METHODS[row.method];
                  return (
                    <div key={row.method} className="flex flex-wrap items-end justify-between gap-3">
                      <dl className="space-y-0.5 text-sm text-slate-700">
                        <div className="flex gap-2">
                          <dt className="font-semibold">{cfg.short}{row.combo ? ` · ${row.combo}` : ""}:</dt>
                          <dd>{formatMethodScore(row.admission.rawTotal, row.method)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt>Ưu tiên:</dt>
                          <dd>
                            +{row.admission.priorityApplied.toFixed(2)}
                            {row.admission.reduced && row.admission.priorityPoints > 0 && (
                              <span className="ml-1 text-slate-500">(giảm vì điểm ≥ {PRIORITY_REDUCTION_THRESHOLD * cfg.factor})</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                      <p className="text-2xl font-extrabold text-primary-700">{formatMethodScore(row.admission.total, row.method)}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-primary-900">Nhập năm tốt nghiệp hợp lệ và đủ 3 môn của từng phương thức để xem điểm tham khảo.</p>
              )}
            </div>
          </section>

          <section>
            <LedgerStep no="5" icon={<LuMapPin />} title="Khu vực muốn học" desc="Bỏ trống nếu học được ở mọi miền." />
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
                <Pill key={r} active={regions.includes(r)} onClick={() => setRegions((x) => toggle(x, r))}>
                  {REGION_LABELS[r]}
                </Pill>
              ))}
            </div>
          </section>

          <section>
            <LedgerStep no="6" icon={<LuWallet />} title="Mức học phí có thể đáp ứng" desc="Trovio lọc chương trình vượt ngân sách. Không bắt buộc." />
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill active={budget === ""} onClick={() => setBudget("")}>
                Không giới hạn
              </Pill>
              {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((k) => (
                <Pill key={k} active={budget === k} onClick={() => setBudget(k)}>
                  {TUITION_RANGES[k].label}
                </Pill>
              ))}
            </div>
            <p className="mt-6 mb-3 text-sm font-semibold text-slate-700">Loại hình trường</p>
            <div className="flex flex-wrap gap-5">
              {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => (
                <Checkbox key={t} label={SCHOOL_TYPE_LABELS[t]} checked={types.includes(t)} onChange={() => setTypes((x) => toggle(x, t))} />
              ))}
            </div>
          </section>

          <section>
            <LedgerStep no="7" icon={<LuTarget />} title="Ngành / nghề quan tâm" desc="Chọn nhóm ngành. Nếu danh mục đã có ngành, có thể đánh dấu ngành cụ thể (tối đa 20)." />
            <div className="mt-4 flex flex-wrap gap-2">
              {groups.map((g) => (
                <Pill key={g.id} active={groupIds.includes(g.id)} onClick={() => setGroupIds((x) => toggle(x, g.id))}>
                  {g.name}
                </Pill>
              ))}
            </div>
            {majors.length > 0 && (
              <div className="mt-4">
                {selectedMajors.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedMajors.map((m) => (
                      <Pill key={m.id} active onClick={() => setInterest((x) => x.filter((id) => id !== m.id))}>
                        {m.name} ×
                      </Pill>
                    ))}
                  </div>
                )}
                <label htmlFor="major-q" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tìm ngành cụ thể
                </label>
                <input
                  id="major-q"
                  value={majorQ}
                  onChange={(e) => setMajorQ(e.target.value)}
                  placeholder={groupIds.length ? "Lọc ngành trong nhóm đã chọn" : "Gõ tên ngành để tìm"}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
                />
                {majorHits.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {majorHits.map((m) => (
                      <Pill
                        key={m.id}
                        active={interest.includes(m.id)}
                        disabled={!interest.includes(m.id) && interest.length >= 20}
                        onClick={() =>
                          setInterest((x) => (x.includes(m.id) ? x.filter((id) => id !== m.id) : x.length >= 20 ? x : [...x, m.id]))
                        }
                      >
                        {m.name}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <LedgerStep no="8" icon={<LuBookOpen />} title="Khám phá ngành" desc="Xem danh mục ngành và chương trình đang xét tuyển." />
            <p className="mt-4 text-sm text-slate-600">
              <Link href="/nganh" className="font-semibold text-primary-600 hover:underline">Xem danh mục ngành</Link> hoặc <Link href="/chuong-trinh" className="font-semibold text-primary-600 hover:underline">tìm chương trình</Link> phù hợp với tổ hợp đã nhập.
            </p>
          </section>
        </div>

        <p className="mt-8 flex items-start gap-2 border-l-4 border-l-accent-500 bg-slate-50 px-4 py-3 text-xs break-words text-slate-500">
          <LuShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Kết quả là điểm tham khảo, chưa xác nhận đủ điều kiện dự tuyển hoặc trúng tuyển. Các ngành sư phạm, sức khỏe, pháp luật có ngưỡng và điều kiện riêng. Chứng chỉ ngoại ngữ chỉ quy đổi hoặc dùng cộng khuyến khích theo công bố của trường; không tự cộng đồng thời cả hai. Hồ sơ lưu trên trình duyệt và đồng bộ vào tài khoản khi đăng nhập.
        </p>

        <div className="mt-6 flex flex-col gap-3 border-t-2 border-dashed border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{canSave ? "Có thể lưu điểm tham khảo. Điều kiện tuyển sinh cần đối chiếu theo trường." : "Cần năm tốt nghiệp hợp lệ, đủ 3 môn cho mỗi phương thức đã chọn và sửa các điểm chưa hợp lệ."}</p>
          <Button onClick={finish} disabled={!canSave}>
            Lưu và xem gợi ý
          </Button>
        </div>
      </div>
    </div>
  );
}
