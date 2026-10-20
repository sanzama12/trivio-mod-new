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
} from "@/services/scoring.service";
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
  const v = Number(s.replace(",", "."));
  return s !== "" && Number.isFinite(v) ? v : null;
};

export function ScoreWizard({
  combos,
  subjects,
  groups,
  majors = [],
}: {
  combos: Combo[];
  subjects: Subject[];
  groups: MajorGroup[];
  majors?: MajorOpt[];
}) {
  const router = useRouter();
  const { profile, setProfile, hydrated } = useTrovio();
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [combo, setCombo] = useState("A00");
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
    if (profile.combo) setCombo(profile.combo);
    setRaw(Object.fromEntries(Object.entries(profile.scores ?? {}).map(([k, v]) => [k, String(v)])));
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

  const subjectShort = (id: string) => subjects.find((s) => s.id === id)?.short ?? id;

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

  const ranked = useMemo(() => rankCombos(scores, combos), [scores, combos]);
  const pinned = ranked.find((row) => row.code === combo) ?? ranked[0];

  const selected = methods.length ? methods : (["thpt"] as AdmissionMethodKey[]);
  const methodTotals = selected.map((m) => {
    if (!pinned) return { method: m, admission: null as ReturnType<typeof computeAdmissionScore> | null, combo: "" };
    return { method: m, admission: computeAdmissionScore(pinned.raw, region, group, m), combo: pinned.code };
  });
  const canSave = methodTotals.some((row) => row.admission != null);

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
    const usable = methodTotals.filter((row) => row.admission != null);
    const primary = usable[0];
    if (!primary?.admission) return;
    setProfile({
      method: primary.method,
      combo: pinned?.code ?? "",
      scores,
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
    router.push("/goi-y");
  };

  return (
    <div className="mx-auto max-w-3xl min-w-0">
      <div className="rounded-none border border-slate-200 border-t-4 border-t-primary-600 border-l-4 border-l-accent-500 bg-white p-4 shadow-card sm:p-6 md:p-8">
        <div className="divide-y divide-dashed divide-slate-200 [&>section]:py-6 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
          <section>
            <LedgerStep no="1" icon={<LuCalculator />} title="Điểm các môn" desc="Nhập điểm thi hoặc điểm dự kiến, thang 10. Tổ hợp mạnh được tính từ những môn đã đủ." />
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
                      Điểm phải từ 0 đến 10.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Đã nhập {filledSubjects}/{subjects.length} môn.</p>
          </section>

          <section>
            <LedgerStep no="2" icon={<LuBookOpen />} title="Tổ hợp mạnh" desc="Trovio cộng 3 môn của từng tổ hợp. Bấm để chọn tổ hợp dùng khi xét THPT hoặc học bạ." />
            {ranked.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {ranked.map((row, i) => {
                  const c = combos.find((x) => x.code === row.code);
                  const active = pinned?.code === row.code;
                  return (
                    <Pill key={row.code} active={active} onClick={() => setCombo(row.code)}>
                      {row.code} · {row.raw.toFixed(2)}
                      {c ? ` (${c.subjects.map(subjectShort).join(", ")})` : ""}
                      {i === 0 ? " · mạnh nhất" : ""}
                    </Pill>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nhập đủ 3 môn của một tổ hợp để xem tổ hợp mạnh.</p>
            )}
          </section>

          <section>
            <LedgerStep no="3" icon={<LuClipboardList />} title="Phương thức xét tuyển dự kiến" desc="Có thể chọn nhiều. Điểm tính từ tổ hợp 3 môn đã nhập ở trên." />
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Phương thức xét tuyển">
              {METHOD_KEYS.map((k) => (
                <Pill key={k} active={selected.includes(k)} onClick={() => toggleMethod(k)}>
                  {ADMISSION_METHODS[k].short}
                </Pill>
              ))}
            </div>
          </section>

          <section>
            <LedgerStep
              no="4"
              icon={<LuShieldCheck />}
              title="Khu vực & đối tượng ưu tiên"
              desc="Điểm ưu tiên theo quy chế tuyển sinh. Thang khác 30 được quy đổi tương ứng."
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
                <p className="text-sm text-primary-900">Nhập đủ 3 môn của một tổ hợp để xem điểm xét tuyển.</p>
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
          Hồ sơ lưu trên trình duyệt và đồng bộ vào tài khoản khi đăng nhập, chỉ để gợi ý chương trình — không chia sẻ với bên thứ ba.
        </p>

        <div className="mt-6 flex flex-col gap-3 border-t-2 border-dashed border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{canSave ? "Đủ dữ liệu để gợi ý." : "Cần ít nhất một tổ hợp đủ 3 môn."}</p>
          <Button onClick={finish} disabled={!canSave}>
            Lưu và xem gợi ý
          </Button>
        </div>
      </div>
    </div>
  );
}
