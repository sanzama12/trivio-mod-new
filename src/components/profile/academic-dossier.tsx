"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LuArrowUpRight,
  LuBookOpen,
  LuCalculator,
  LuCheck,
  LuCompass,
  LuGraduationCap,
  LuInfo,
  LuMapPin,
  LuPencil,
  LuSchool,
  LuSparkles,
  LuStar,
  LuWallet,
  LuX,
} from "react-icons/lu";
import type {
  AcademicPerformance,
  AdmissionMethodKey,
  Combo,
  MajorGroup,
  PriorityGroup,
  PriorityRegion,
  Region,
  SchoolType,
  Subject,
} from "@/domain/types";
import { ACADEMIC_PERFORMANCE_LABELS } from "@/domain/types";
import { REGION_LABELS, SCHOOL_TYPE_LABELS, TUITION_RANGES, type TuitionRange } from "@/services/program.filters";
import {
  ADMISSION_METHODS,
  computeAdmissionScore,
  formatMethodScore,
  PRIORITY_GROUP_LABELS,
  PRIORITY_REGION_LABELS,
  profileMethod,
  profileScore,
} from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

export interface AcademicDossierProps {
  combos: Combo[];
  subjects: Subject[];
  groups: MajorGroup[];
  majors: { id: string; name: string; groupId: string }[];
  userProvince: string | null;
}

const POPULAR_COMBOS = ["A00", "A01", "B00", "C00", "D01", "D07"];

export function AcademicDossier({ combos, subjects, groups, majors, userProvince }: AcademicDossierProps) {
  const toast = useToast();
  const { profile, preferences, setProfile, setRecommendationPreferences, hydrated } = useTrovio();

  const [editing, setEditing] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [majorSearch, setMajorSearch] = useState("");

  // Form states
  const [strongSubjects, setStrongSubjects] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [interestMajors, setInterestMajors] = useState<string[]>([]);
  const [academicPerf, setAcademicPerf] = useState<AcademicPerformance | "">("");
  const [estimatedScoreStr, setEstimatedScoreStr] = useState<string>("");
  const [estimatedCombo, setEstimatedCombo] = useState<string>("A00");
  const [method, setMethod] = useState<AdmissionMethodKey>("thpt");
  const [targetRegions, setTargetRegions] = useState<Region[]>([]);
  const [priorityRegion, setPriorityRegion] = useState<PriorityRegion>("KV3");
  const [priorityGroup, setPriorityGroup] = useState<PriorityGroup>("none");
  const [budget, setBudget] = useState<TuitionRange | "">("");
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);

  // Load existing data into form
  useEffect(() => {
    if (!hydrated) return;

    const prefs = preferences;
    const prof = profile;

    const loadedSubjects = prefs?.strongSubjectIds ?? [];
    setStrongSubjects(loadedSubjects);

    const loadedGroups = prefs?.groupIds?.length ? prefs.groupIds : prof?.groupIds?.length ? prof.groupIds : [];
    setSelectedGroups(loadedGroups);

    const loadedMajors = prefs?.interestMajorIds?.length ? prefs.interestMajorIds : prof?.interestMajorIds?.length ? prof.interestMajorIds : [];
    setInterestMajors(loadedMajors);

    const perf = prefs?.academicPerformance ?? prof?.academicPerformance ?? "";
    setAcademicPerf(perf);

    const estScore = prefs?.estimatedScore ?? prof?.estimatedScore;
    if (estScore != null) {
      setEstimatedScoreStr(String(estScore));
    } else if (prof?.admission?.rawTotal != null) {
      setEstimatedScoreStr(String(prof.admission.rawTotal));
    } else {
      setEstimatedScoreStr("");
    }

    const estCmb = prefs?.estimatedCombo ?? prof?.combo ?? "A00";
    setEstimatedCombo(estCmb);

    const m = prof ? profileMethod(prof) : "thpt";
    setMethod(m);

    const regions = prefs?.targetRegions?.length ? prefs.targetRegions : prof?.regions?.length ? prof.regions : [];
    setTargetRegions(regions);

    setPriorityRegion(prof?.priorityRegion ?? "KV3");
    setPriorityGroup(prof?.priorityGroup ?? "none");

    const maxBudget = prefs?.budgetMax ?? prof?.budgetMax;
    const matchedRange = (Object.keys(TUITION_RANGES) as TuitionRange[]).find((k) => TUITION_RANGES[k].max === maxBudget);
    setBudget(matchedRange ?? "");

    setSchoolTypes(prof?.schoolTypes ?? []);
  }, [hydrated, preferences, profile]);

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const handleSave = () => {
    const parsedScore = parseFloat(estimatedScoreStr.replace(",", "."));
    const validEstimatedScore = !isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 30 ? Math.round(parsedScore * 100) / 100 : null;

    const maxBudget = budget ? TUITION_RANGES[budget].max : null;

    // 1. Update RecommendationPreferences
    setRecommendationPreferences({
      groupIds: selectedGroups,
      interestMajorIds: interestMajors,
      strongSubjectIds: strongSubjects,
      useSavedBehavior: true,
      academicPerformance: academicPerf || null,
      estimatedScore: validEstimatedScore,
      estimatedCombo,
      targetRegions,
      budgetMax: maxBudget,
      updatedAt: new Date().toISOString(),
    });

    // 2. Synchronize / update ScoreProfile
    const activeScore = validEstimatedScore ?? (profile?.admission?.rawTotal ?? null);
    if (activeScore != null) {
      const computedAdmission = computeAdmissionScore(activeScore, priorityRegion, priorityGroup, method);
      setProfile({
        method,
        combo: estimatedCombo,
        scores: profile?.scores ?? {},
        priorityRegion,
        priorityGroup,
        regions: targetRegions,
        budgetMax: maxBudget,
        schoolTypes,
        groupIds: selectedGroups,
        interestMajorIds: interestMajors,
        academicPerformance: academicPerf || null,
        estimatedScore: validEstimatedScore,
        admission: computedAdmission,
        updatedAt: new Date().toISOString(),
      });
    } else if (profile) {
      setProfile({
        ...profile,
        regions: targetRegions,
        budgetMax: maxBudget,
        schoolTypes,
        groupIds: selectedGroups,
        interestMajorIds: interestMajors,
        academicPerformance: academicPerf || null,
        updatedAt: new Date().toISOString(),
      });
    }

    setEditing(false);
    toast("Đã cập nhật hồ sơ học tập và định hướng", "success");
  };

  // Autocomplete matching for major interest
  const majorSuggestions = useMemo(() => {
    const q = majorSearch.trim().toLowerCase();
    if (!q) return [];
    return majors
      .filter((m) => !interestMajors.includes(m.id) && (m.name.toLowerCase().includes(q) || m.id.includes(q)))
      .slice(0, 8);
  }, [majors, majorSearch, interestMajors]);

  // View summary helpers
  const strongSubjectObjects = useMemo(
    () => subjects.filter((s) => (preferences?.strongSubjectIds ?? []).includes(s.id)),
    [subjects, preferences?.strongSubjectIds],
  );

  const selectedGroupObjects = useMemo(() => {
    const gIds = preferences?.groupIds?.length ? preferences.groupIds : profile?.groupIds ?? [];
    return groups.filter((g) => gIds.includes(g.id));
  }, [groups, preferences?.groupIds, profile?.groupIds]);

  const selectedMajorObjects = useMemo(() => {
    const mIds = preferences?.interestMajorIds?.length ? preferences.interestMajorIds : profile?.interestMajorIds ?? [];
    return majors.filter((m) => mIds.includes(m.id));
  }, [majors, preferences?.interestMajorIds, profile?.interestMajorIds]);

  const currentAcademicPerf = preferences?.academicPerformance ?? profile?.academicPerformance;
  const currentEstScore = preferences?.estimatedScore ?? profile?.estimatedScore;
  const currentRegions = preferences?.targetRegions?.length ? preferences.targetRegions : profile?.regions ?? [];
  const currentBudgetMax = preferences?.budgetMax ?? profile?.budgetMax;

  const budgetLabel = (max: number | null | undefined) => {
    if (max == null) return "Không giới hạn";
    const found = Object.values(TUITION_RANGES).find((r) => r.max === max);
    return found ? found.label : `${max} triệu/năm`;
  };

  const hasAnyData =
    strongSubjectObjects.length > 0 ||
    selectedGroupObjects.length > 0 ||
    selectedMajorObjects.length > 0 ||
    currentAcademicPerf != null ||
    currentEstScore != null ||
    profile != null ||
    currentRegions.length > 0 ||
    currentBudgetMax != null;

  return (
    <Card id="dieu-kien" className="scroll-mt-24 overflow-hidden border-slate-300 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary-100 text-xs font-bold text-primary-800">
              02
            </span>
            <p className="text-xs font-black tracking-[0.14em] text-primary-700 uppercase">
              Hồ sơ định hướng & Học tập
            </p>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Học lực, thế mạnh & Nguyện vọng
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <LuPencil className="size-4" aria-hidden /> Chỉnh sửa hồ sơ
              </Button>
              <Link href="/diem-cua-toi" className={buttonClass({ size: "sm", variant: "ghost" })}>
                <LuCalculator className="size-4" aria-hidden /> Tính điểm 9 môn
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAskDiscard(true)}>
                Hủy
              </Button>
              <Button size="sm" onClick={handleSave}>
                <LuCheck className="size-4" aria-hidden /> Lưu hồ sơ
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {editing ? (
          /* ======================= CHẾ ĐỘ CHỈNH SỬA ======================= */
          <div className="space-y-7">
            {/* 1. Môn học thế mạnh */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <LuStar className="size-4 text-accent-500 fill-accent-500" aria-hidden />
                    Môn học thế mạnh của bạn
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn các môn bạn tự tin nhất hoặc có điểm số cao nhất (khuyên chọn 2 – 4 môn).
                  </p>
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700">
                  {strongSubjects.length} môn đã chọn
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => {
                  const active = strongSubjects.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setStrongSubjects((cur) => toggleArrayItem(cur, sub.id))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                        active
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary-400 hover:bg-slate-50",
                      )}
                    >
                      {active ? <LuCheck className="size-3.5" aria-hidden /> : null}
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Lĩnh vực yêu thích */}
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <LuCompass className="size-4 text-primary-600" aria-hidden />
                    Lĩnh vực & Nhóm ngành yêu thích
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn các khối ngành bạn có hứng thú hoặc muốn gắn bó nghề nghiệp tương lai.
                  </p>
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700">
                  {selectedGroups.length} nhóm ngành
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {groups.map((grp) => {
                  const active = selectedGroups.includes(grp.id);
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedGroups((cur) => toggleArrayItem(cur, grp.id))}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-bold transition-all",
                        active
                          ? "border-accent-500 bg-accent-50 text-slate-950 ring-2 ring-accent-400/50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-lg text-xs",
                          active ? "bg-accent-500 text-slate-950 font-black" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {active ? "✓" : "•"}
                      </span>
                      <span className="truncate">{grp.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Ngành học cụ thể quan tâm */}
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LuBookOpen className="size-4 text-primary-600" aria-hidden />
                Ngành học cụ thể quan tâm (tùy chọn)
              </h3>
              <p className="text-xs text-slate-500">
                Gõ tên ngành bạn đang cân nhắc để nhận thông tin tuyển sinh sát nhất.
              </p>
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Tìm ngành (ví dụ: Khoa học máy tính, Logistics, Y khoa...)"
                  value={majorSearch}
                  onChange={(e) => setMajorSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                {majorSuggestions.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    {majorSuggestions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setInterestMajors((cur) => [...cur, m.id]);
                          setMajorSearch("");
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-primary-50 hover:text-primary-800"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {interestMajors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {interestMajors.map((mId) => {
                    const mObj = majors.find((m) => m.id === mId);
                    return (
                      <span
                        key={mId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-800 ring-1 ring-primary-200"
                      >
                        {mObj?.name ?? mId}
                        <button
                          type="button"
                          onClick={() => setInterestMajors((cur) => cur.filter((x) => x !== mId))}
                          className="hover:text-danger-600"
                          aria-label={`Xoá ${mObj?.name}`}
                        >
                          <LuX className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 4. Học lực tự đánh giá & Điểm xét tuyển dự kiến */}
            <section className="space-y-4 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LuGraduationCap className="size-4 text-primary-600" aria-hidden />
                  Học lực & Điểm xét tuyển dự kiến (không bắt buộc)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giúp hệ thống chia nhóm trường An toàn, Vừa sức và Thử sức sát thực tế nhất.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mức học lực tự đánh giá
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(ACADEMIC_PERFORMANCE_LABELS) as AcademicPerformance[]).map((perfKey) => {
                    const active = academicPerf === perfKey;
                    const item = ACADEMIC_PERFORMANCE_LABELS[perfKey];
                    return (
                      <button
                        key={perfKey}
                        type="button"
                        onClick={() => setAcademicPerf(active ? "" : perfKey)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-400/50"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        <p className="text-xs font-black">{item.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="pf-est-score" className="block text-xs font-bold text-slate-700 mb-1">
                    Tổng điểm xét tuyển dự kiến
                  </label>
                  <input
                    id="pf-est-score"
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    placeholder="VD: 24.50"
                    value={estimatedScoreStr}
                    onChange={(e) => setEstimatedScoreStr(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Thang 30 (điểm thi THPT hoặc học bạ).</p>
                </div>

                <div>
                  <label htmlFor="pf-est-combo" className="block text-xs font-bold text-slate-700 mb-1">
                    Tổ hợp môn dự kiến
                  </label>
                  <select
                    id="pf-est-combo"
                    value={estimatedCombo}
                    onChange={(e) => setEstimatedCombo(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    {POPULAR_COMBOS.map((c) => (
                      <option key={c} value={c}>
                        {c} {combos.find((cb) => cb.code === c)?.subjects ? `(${combos.find((cb) => cb.code === c)?.subjects.join(", ")})` : ""}
                      </option>
                    ))}
                    {combos
                      .filter((cb) => !POPULAR_COMBOS.includes(cb.code))
                      .map((cb) => (
                        <option key={cb.code} value={cb.code}>
                          {cb.code}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pf-priority-reg" className="block text-xs font-bold text-slate-700 mb-1">
                    Khu vực ưu tiên
                  </label>
                  <select
                    id="pf-priority-reg"
                    value={priorityRegion}
                    onChange={(e) => setPriorityRegion(e.target.value as PriorityRegion)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    {(Object.keys(PRIORITY_REGION_LABELS) as PriorityRegion[]).map((r) => (
                      <option key={r} value={r}>
                        {PRIORITY_REGION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* 5. Khu vực sinh sống & Địa điểm mong muốn học tập */}
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LuMapPin className="size-4 text-primary-600" aria-hidden />
                  Địa điểm mong muốn học tập
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn các miền bạn sẵn sàng học đại học (nơi sinh sống hiện tại:{" "}
                  <strong>{userProvince || "Chưa khai báo"}</strong>).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(Object.keys(REGION_LABELS) as Region[]).map((r) => {
                  const active = targetRegions.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRegions((cur) => toggleArrayItem(cur, r))}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-400/50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                    >
                      <span className="text-xs font-bold">{REGION_LABELS[r]}</span>
                      {active && <LuCheck className="size-4 text-primary-600" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 6. Điều kiện tài chính & Mức học phí mong muốn */}
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LuWallet className="size-4 text-primary-600" aria-hidden />
                  Điều kiện tài chính & Mức học phí mong muốn
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mức trần học phí gia đình dự kiến chi trả mỗi năm.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                <button
                  type="button"
                  onClick={() => setBudget("")}
                  className={cn(
                    "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                    budget === ""
                      ? "border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-400/50"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  Không giới hạn
                </button>
                {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((tr) => {
                  const active = budget === tr;
                  return (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => setBudget(tr)}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                        active
                          ? "border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-400/50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                    >
                      {TUITION_RANGES[tr].label}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại hình trường mong muốn
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((st) => {
                    const active = schoolTypes.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSchoolTypes((cur) => toggleArrayItem(cur, st))}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                          active
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        <LuSchool className="size-3.5" aria-hidden />
                        {SCHOOL_TYPE_LABELS[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <Button variant="ghost" size="sm" onClick={() => setAskDiscard(true)}>
                Hủy thay đổi
              </Button>
              <Button size="sm" onClick={handleSave}>
                <LuCheck className="size-4" aria-hidden /> Lưu hồ sơ học tập
              </Button>
            </div>

            <ConfirmDialog
              open={askDiscard}
              tone="warning"
              title="Hủy các thay đổi?"
              confirmLabel="Hủy và thoát"
              cancelLabel="Tiếp tục sửa"
              onCancel={() => setAskDiscard(false)}
              onConfirm={() => {
                setAskDiscard(false);
                setEditing(false);
              }}
            >
              Các thay đổi bạn vừa nhập cho hồ sơ học tập & nguyện vọng sẽ không được lưu lại.
            </ConfirmDialog>
          </div>
        ) : (
          /* ======================= CHẾ ĐỘ HIỂN THỊ ======================= */
          <div className="space-y-6">
            {!hasAnyData ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-8 text-center">
                <LuCompass className="mx-auto size-10 text-primary-600" aria-hidden />
                <h3 className="mt-3 font-bold text-slate-900">Chưa khai báo hồ sơ học tập & nguyện vọng</h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                  Khai báo môn học thế mạnh, sở thích nhóm ngành, học lực hoặc điểm dự kiến và ngân sách học phí để Trovio tự động lọc và gợi ý các ngành, trường phù hợp nhất cho bạn.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setEditing(true)}>
                  <LuSparkles className="size-4" aria-hidden /> Bắt đầu khai báo ngay
                </Button>
              </div>
            ) : (
              <>
                {/* Dashboard Highlights Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Card 1: Học lực & Điểm số */}
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-accent-100 text-accent-800">
                        <LuGraduationCap className="size-4" aria-hidden />
                      </span>
                      {currentAcademicPerf && (
                        <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-black text-slate-950">
                          {ACADEMIC_PERFORMANCE_LABELS[currentAcademicPerf].label}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Điểm & Xét tuyển
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {profile?.admission?.total != null
                        ? formatMethodScore(profile.admission.total, profileMethod(profile))
                        : currentEstScore != null
                          ? `${currentEstScore} đ`
                          : "Chưa nhập điểm"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Tổ hợp: <strong>{profile?.combo ?? preferences?.estimatedCombo ?? "Chưa chọn"}</strong>
                      {profile?.priorityRegion ? ` · ${PRIORITY_REGION_LABELS[profile.priorityRegion]}` : ""}
                    </p>
                  </div>

                  {/* Card 2: Môn học thế mạnh */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                        <LuStar className="size-4" aria-hidden />
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {strongSubjectObjects.length} môn
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Môn học thế mạnh
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {strongSubjectObjects.length > 0 ? (
                        strongSubjectObjects.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-lg bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700"
                          >
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa chọn môn thế mạnh</p>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Địa điểm & Tài chính */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        <LuWallet className="size-4" aria-hidden />
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {budgetLabel(currentBudgetMax)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Địa điểm học tập
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {currentRegions.length > 0
                        ? currentRegions.map((r) => REGION_LABELS[r]).join(", ")
                        : "Toàn quốc (mọi khu vực)"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Khu vực sống: <strong>{userProvince || "Chưa cập nhật"}</strong>
                    </p>
                  </div>
                </div>

                {/* Groups & Specific Majors */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black tracking-wider text-slate-500 uppercase">
                      Lĩnh vực & Ngành học yêu thích ({selectedGroupObjects.length + selectedMajorObjects.length})
                    </h4>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedGroupObjects.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-accent-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs"
                      >
                        <span className="size-2 rounded-full bg-accent-500" />
                        {g.name}
                      </span>
                    ))}
                    {selectedMajorObjects.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800"
                      >
                        <LuBookOpen className="size-3 text-primary-600" />
                        {m.name}
                      </span>
                    ))}
                    {selectedGroupObjects.length === 0 && selectedMajorObjects.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Chưa chọn nhóm ngành hay ngành yêu thích.</p>
                    )}
                  </div>
                </div>

                {/* Quick Navigation actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    Hồ sơ được cập nhật tự động khi bạn thay đổi và đồng bộ trên mọi thiết bị.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/nganh"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:underline"
                    >
                      Khám phá ngành phù hợp <LuArrowUpRight className="size-3.5" />
                    </Link>
                    <span className="text-slate-300">·</span>
                    <Link
                      href="/chuong-trinh"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:underline"
                    >
                      Xem chương trình đào tạo <LuArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
