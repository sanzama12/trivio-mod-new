"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuCheck, LuCircleAlert, LuCircleCheck, LuLightbulb, LuLock, LuSearch, LuShieldCheck, LuX } from "react-icons/lu";
import type { Combo } from "@/domain/types";
import type { LiteMajor, LiteProgram } from "@/services/lite";
import {
  bestSwap,
  CORE_SUBJECTS,
  comboStates,
  ELECTIVE_COUNT,
  ELECTIVE_SUBJECTS,
  majorStates,
  planForTargets,
  programStates,
  requiredFor,
  sanitizeElectives,
  subjectName,
} from "@/services/grade10";
import { comboLabel } from "@/services/goal";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type Direction = "subject-to-major" | "major-to-subject";
const STORE_KEY = "trovio:grade10";
const MAX_TARGETS = 3;

function SubjectChip({ name, state, onClick }: { name: string; state: "core" | "on" | "off" | "need"; onClick?: () => void }) {
  const cls = {
    core: "border-slate-200 bg-slate-100 text-slate-600",
    on: "border-2 border-primary-600 bg-primary-50 text-primary-700",
    need: "border-2 border-success-500 bg-success-50 text-success-700",
    off: "border-slate-300 bg-white text-slate-700 hover:border-primary-300",
  }[state];
  const Icon = state === "core" ? LuShieldCheck : state === "off" ? null : LuCheck;
  const content = (
    <>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {name}
    </>
  );
  if (!onClick) return <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold", cls)}>{content}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={state === "on" || state === "need"} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors", cls)}>
      {content}
    </button>
  );
}

/** Số ngành hiện trước trong mỗi danh sách (như thiết kế Figma B1a). */
const LIST_PREVIEW = 6;

export function Grade10Planner({ initialDirection, majors, programs, combos }: { initialDirection: Direction; majors: LiteMajor[]; programs: LiteProgram[]; combos: Combo[] }) {
  const toast = useToast();
  const [dir, setDir] = useState<Direction>(initialDirection);
  const [electives, setElectives] = useState<string[]>(["ly", "hoa", "tin", "ktpl"]);
  const [targets, setTargets] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [showAllLocked, setShowAllLocked] = useState(false);
  const majorName = (id: string) => majors.find((m) => m.id === id)?.name ?? id;

  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as { electives?: unknown; targets?: unknown } | null;
      if (raw) {
        const e = sanitizeElectives(raw.electives);
        if (e.length) setElectives(e);
        if (Array.isArray(raw.targets)) setTargets(raw.targets.filter((t): t is string => typeof t === "string" && majors.some((m) => m.id === t)).slice(0, MAX_TARGETS));
      }
    } catch {
      /* bỏ qua */
    }
    setLoaded(true);
  }, [majors]);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ electives, targets }));
    } catch {
      /* bỏ qua */
    }
  }, [electives, targets, loaded]);

  const states = useMemo(() => programStates(programs, combos, electives), [programs, combos, electives]);
  const cs = useMemo(() => comboStates(combos, electives), [combos, electives]);
  const ms = useMemo(() => majorStates(states), [states]);
  const openMajors = ms.filter((m) => m.open > 0).sort((a, b) => b.open - a.open);
  const lockedMajors = ms.filter((m) => m.open === 0);
  const openPrograms = states.filter((s) => s.status === "open").length;
  const lockedPrograms = states.filter((s) => s.status === "locked").length;
  const swap = useMemo(() => bestSwap(programs, combos, electives), [programs, combos, electives]);
  const plan = useMemo(() => (targets.length ? planForTargets(targets, programs, combos, electives) : null), [targets, programs, combos, electives]);
  const planMajors = useMemo(() => (plan ? majorStates(programStates(programs, combos, plan.electives)).filter((m) => m.open > 0) : []), [plan, programs, combos]);

  const toggle = (id: string) => {
    if (electives.includes(id)) setElectives(electives.filter((e) => e !== id));
    else if (electives.length >= ELECTIVE_COUNT) toast(`Chỉ chọn ${ELECTIVE_COUNT} môn — bỏ một môn trước khi chọn môn khác`, "info");
    else setElectives([...electives, id]);
  };
  const suggestions = useMemo(() => {
    const f = q.trim().toLowerCase();
    return majors.filter((m) => !targets.includes(m.id) && (!f || m.name.toLowerCase().includes(f))).slice(0, f ? 8 : 6);
  }, [q, majors, targets]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-accent-700 uppercase">Dành cho học sinh lớp 9–10</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-[28px]">
            {dir === "subject-to-major" ? "Chọn môn lớp 10 — mở được những ngành nào?" : "Muốn học ngành này — lớp 10 nên chọn môn gì?"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo chương trình GDPT 2018: học các môn bắt buộc và chọn {ELECTIVE_COUNT} môn lựa chọn. Môn bạn chọn quyết định tổ hợp xét tuyển sau này.
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Chiều tra cứu">
          {(
            [
              ["subject-to-major", "Từ môn → ngành"],
              ["major-to-subject", "Từ ngành → môn"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={dir === k}
              onClick={() => setDir(k)}
              className={cn("rounded-md px-3.5 py-2 text-sm font-semibold", dir === k ? "bg-white text-primary-700 shadow-sm" : "text-slate-600")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {dir === "subject-to-major" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-700">Môn bắt buộc (dùng được trong tổ hợp)</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {CORE_SUBJECTS.map((s) => (
                  <SubjectChip key={s.id} name={s.name} state="core" />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Chọn {ELECTIVE_COUNT} môn lựa chọn</h2>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", electives.length === ELECTIVE_COUNT ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600")}>
                  Đã chọn {electives.length}/{ELECTIVE_COUNT}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ELECTIVE_SUBJECTS.map((s) => (
                  <SubjectChip key={s.id} name={s.name} state={electives.includes(s.id) ? "on" : "off"} onClick={() => toggle(s.id)} />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Muốn đổi? Bỏ chọn một môn rồi chọn môn khác — danh sách bên phải cập nhật ngay.</p>
            </Card>
            {swap && (
              <div className="flex gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4">
                <LuLightbulb className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary-800">
                    Đổi {subjectName(swap.out)} → {subjectName(swap.in)}: mở thêm {swap.unlocked.length} ngành
                  </p>
                  <p className="text-xs text-slate-700">
                    Mở: {swap.unlocked.map(majorName).join(", ")}.{swap.lost.length ? ` Mất: ${swap.lost.map(majorName).join(", ")}.` : " Không mất ngành nào đang mở."}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setElectives(electives.map((e) => (e === swap.out ? swap.in : e)))}>
                    Thử đổi môn này
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  [cs.filter((c) => c.ok).length, "tổ hợp dùng được", "text-primary-700"],
                  [openPrograms, "chương trình mở", "text-success-700"],
                  [lockedPrograms, "chương trình bị khoá", "text-danger-700"],
                ] as const
              ).map(([v, l, c]) => (
                <Card key={l} className="p-4">
                  <p className={cn("text-2xl font-bold", c)}>{v}</p>
                  <p className="text-[13px] text-slate-600">{l}</p>
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-700">Tổ hợp bạn dùng được</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {cs.map((c) => (
                  <span key={c.code} className={cn("rounded-lg px-2.5 py-1.5", c.ok ? "bg-success-50" : "bg-slate-50 opacity-70")} title={c.ok ? undefined : `Thiếu ${c.missing.map(subjectName).join(", ")}`}>
                    <span className={cn("block text-[13px] font-bold", c.ok ? "text-success-700" : "text-slate-500 line-through")}>{c.code}</span>
                    <span className="block text-[11px] text-slate-600">{comboLabel(c)}</span>
                  </span>
                ))}
              </div>
              {cs.some((c) => c.ok && c.aptitude) && <p className="mt-2 text-xs text-slate-500">V00 cần thêm bài thi năng khiếu Vẽ do trường tổ chức.</p>}
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <LuCircleCheck className="size-4 text-success-700" aria-hidden /> Ngành mở ({openMajors.length})
                </h2>
                <ul className="mt-3 space-y-2">
                  {(showAllOpen ? openMajors : openMajors.slice(0, LIST_PREVIEW)).map((m) => (
                    <li key={m.majorId} className="flex items-baseline justify-between gap-2 text-[13px]">
                      <Link href={`/chuong-trinh?majors=${m.majorId}`} className="font-medium text-slate-800 hover:text-primary-700">
                        {majorName(m.majorId)}
                      </Link>
                      <span className="shrink-0 text-xs text-slate-500">{m.via.join(", ")}</span>
                    </li>
                  ))}
                </ul>
                {openMajors.length > LIST_PREVIEW && (
                  <button type="button" onClick={() => setShowAllOpen((v) => !v)} className="mt-3 text-[13px] font-semibold text-primary-700 hover:underline">
                    {showAllOpen ? "Thu gọn" : `Xem tất cả ${openMajors.length} ngành →`}
                  </button>
                )}
              </Card>
              <Card className="p-5">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <LuLock className="size-4 text-danger-700" aria-hidden /> Ngành bị khoá ({lockedMajors.length})
                </h2>
                {lockedMajors.length === 0 ? (
                  <p className="mt-3 text-[13px] text-slate-500">Không ngành nào bị khoá với bộ môn này.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {(showAllLocked ? lockedMajors : lockedMajors.slice(0, LIST_PREVIEW)).map((m) => (
                      <li key={m.majorId} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="text-slate-500">{majorName(m.majorId)}</span>
                        {m.need && (
                          <span className="shrink-0 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-semibold text-danger-700">
                            cần {m.need.missing.map(subjectName).join(" + ")} ({m.need.combo})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {lockedMajors.length > LIST_PREVIEW && (
                  <button type="button" onClick={() => setShowAllLocked((v) => !v)} className="mt-3 text-[13px] font-semibold text-primary-700 hover:underline">
                    {showAllLocked ? "Thu gọn" : `Xem tất cả ${lockedMajors.length} ngành →`}
                  </button>
                )}
              </Card>
            </div>
            <p className="text-xs text-slate-500">
              Dựa trên tổ hợp các trường dùng năm 2025 (dữ liệu minh hoạ). Tổ hợp có thể đổi theo đề án từng năm — kiểm tra lại khi lên lớp 12. Chương trình chỉ xét học bạ/ĐGNL không tính vào đây.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-700">Ngành bạn đang nhắm (tối đa {MAX_TARGETS})</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {targets.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-[13px] font-semibold text-primary-700">
                    {majorName(t)}
                    <button type="button" onClick={() => setTargets(targets.filter((x) => x !== t))} aria-label={`Bỏ ${majorName(t)}`} className="rounded-full hover:bg-primary-100">
                      <LuX className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
                {targets.length === 0 && <p className="text-[13px] text-slate-500">Chưa chọn ngành nào.</p>}
              </div>
              {targets.length < MAX_TARGETS && (
                <>
                  <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-primary-600">
                    <LuSearch className="size-4 text-slate-400" aria-hidden />
                    <span className="sr-only">Tìm ngành</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Thêm ngành… VD: Y khoa" maxLength={60} className="flex-1 text-sm outline-none" />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((m) => (
                      <button key={m.id} type="button" onClick={() => (setTargets([...targets, m.id]), setQ(""))} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700">
                        + {m.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>
            {plan && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-slate-700">Gợi ý {ELECTIVE_COUNT} môn lựa chọn</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.electives.map((e) => {
                    const req = plan.targets.some((t) => t.required.includes(e));
                    return <SubjectChip key={e} name={subjectName(e)} state={req ? "need" : "on"} />;
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Viền xanh = môn bắt buộc phải có cho ít nhất một ngành bạn nhắm. Các môn còn lại giúp mở thêm nhiều chương trình nhất ({plan.openCount} chương trình).
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setElectives(plan.electives);
                    setDir("subject-to-major");
                    toast("Đã áp dụng bộ môn gợi ý", "success");
                  }}
                >
                  Áp dụng bộ môn này
                </Button>
              </Card>
            )}
            {plan?.targets.some((t) => !t.open) && (
              <p className="flex gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3 text-[13px] text-accent-700">
                <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Không có bộ 4 môn nào mở được cùng lúc tất cả ngành bạn chọn: {plan.targets.filter((t) => !t.open).map((t) => majorName(t.majorId)).join(", ")}. Hãy ưu tiên ngành quan trọng nhất.
              </p>
            )}
            {plan?.targets.map((t) =>
              t.required.length ? (
                <p key={t.majorId} className="flex gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3 text-[13px] text-accent-700">
                  <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Không chọn {t.required.map(subjectName).join(" và ")} thì không xét được {majorName(t.majorId)} ở các trường trong dữ liệu.
                </p>
              ) : null,
            )}
          </div>
          <div className="space-y-4">
            {plan ? (
              <>
                <Card className="overflow-x-auto p-0">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <caption className="sr-only">Môn cần học cho từng ngành mục tiêu</caption>
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Ngành · tổ hợp mở được
                        </th>
                        {["toan", "van", "anh", "ly", "hoa", "sinh", "dia"].map((s) => (
                          <th key={s} scope="col" className="px-2 py-3 text-center">
                            {subjectName(s).replace("Tiếng ", "").replace("Ngữ ", "")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.targets.map((t) => {
                        const viaCombo = combos.find((c) => c.code === t.via[0]);
                        const need = new Set(viaCombo?.subjects ?? requiredFor(t.majorId, programs, combos));
                        return (
                          <tr key={t.majorId} className="border-t border-slate-100">
                            <th scope="row" className="px-4 py-3 font-normal">
                              <span className="block font-semibold text-slate-900">{majorName(t.majorId)}</span>
                              <span className="text-xs text-slate-500">{t.open ? t.via.join(" / ") : "Chưa mở được"}</span>
                            </th>
                            {["toan", "van", "anh", "ly", "hoa", "sinh", "dia"].map((s) => (
                              <td key={s} className="px-2 py-3 text-center">
                                {need.has(s) ? (
                                  <span
                                    className={cn(
                                      "inline-flex size-6 items-center justify-center rounded-full",
                                      CORE_SUBJECTS.some((c) => c.id === s) ? "bg-slate-100 text-slate-500" : "bg-success-50 text-success-700",
                                    )}
                                    aria-label="cần"
                                  >
                                    <LuCheck className="size-3.5" aria-hidden />
                                  </span>
                                ) : null}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">Xám = môn bắt buộc đã có · Xanh = môn lựa chọn cần học (theo tổ hợp đầu tiên mở được)</p>
                </Card>
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-700">Với {ELECTIVE_COUNT} môn gợi ý, bạn vẫn mở được</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {planMajors.slice(0, 12).map((m) => (
                      <span key={m.majorId} className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
                        {majorName(m.majorId)}
                      </span>
                    ))}
                    {planMajors.length > 12 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">+ {planMajors.length - 12} ngành khác</span>}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6 text-sm text-slate-600">Chọn 1–3 ngành bạn đang nhắm, Trovio sẽ gợi ý bộ 4 môn lựa chọn giữ được nhiều cửa nhất.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
