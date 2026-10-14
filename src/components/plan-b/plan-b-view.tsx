"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuBell, LuCheck, LuCircleAlert, LuGraduationCap, LuGlobe, LuPlus, LuRoute, LuSchool, LuShuffle, LuSparkles } from "react-icons/lu";
import type { FitLevel, SupplementaryRound, TimelineEvent } from "@/domain/types";
import type { LiteMajor, LiteProgram } from "@/services/lite";
import { hasSafe, matchRounds, reEvaluate, ROUND_STATUS_LABELS, suggestPlanB, type PlanScore } from "@/services/plan-b";
import { ADMISSION_METHODS, FIT_LABELS, formatMethodScore, profileScore } from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const FIT_TAG: Record<FitLevel, string> = {
  "an-toan": "bg-success-50 text-success-700",
  "vua-suc": "bg-primary-50 text-primary-700",
  "thu-suc": "bg-accent-50 text-accent-700",
};
const fmt = (iso: string) => iso.split("-").reverse().join("/");
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);

function FitTag({ level }: { level: FitLevel }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", FIT_TAG[level])}>{FIT_LABELS[level]}</span>;
}

export function PlanBView({
  today,
  simulated,
  demoDate,
  demoMode,
  season,
  events,
  rounds,
  programs,
  majors,
}: {
  today: string;
  simulated: boolean;
  demoDate: string;
  demoMode: boolean;
  season: string;
  events: TimelineEvent[];
  rounds: SupplementaryRound[];
  programs: LiteProgram[];
  majors: LiteMajor[];
}) {
  const { profile, wishlist, goal, hydrated, user, addWishlist, inWishlist, hasReminder, toggleReminder } = useTrovio();
  const toast = useToast();
  const [onlyMine, setOnlyMine] = useState(false);
  const checked = useRef(false);

  const score: PlanScore | null = useMemo(() => {
    if (!profile) return null;
    const s = profileScore(profile);
    return { method: s.method, total: s.total, combo: ADMISSION_METHODS[s.method].needsCombo ? profile.combo : null };
  }, [profile]);

  const wishPrograms = useMemo(() => wishlist.map((w) => programs.find((p) => p.id === w.id)).filter((p): p is LiteProgram => !!p), [wishlist, programs]);
  const planA = useMemo(() => (score ? reEvaluate(wishPrograms, score) : []), [wishPrograms, score]);
  const majorIds = useMemo(() => Array.from(new Set([...wishPrograms.map((p) => p.majorId), ...(goal?.majorId ? [goal.majorId] : [])])), [wishPrograms, goal]);
  const groupIds = useMemo(() => {
    const g = new Set(wishPrograms.map((p) => p.groupId));
    const gm = majors.find((m) => m.id === goal?.majorId);
    if (gm) g.add(gm.groupId);
    return [...g];
  }, [wishPrograms, goal, majors]);
  const planB = useMemo(
    () =>
      score
        ? suggestPlanB(programs, { score, majorIds, groupIds, excludeIds: wishlist.map((w) => w.id), budgetMax: profile?.budgetMax ?? goal?.budgetMax ?? null, regions: profile?.regions?.length ? profile.regions : (goal?.regions ?? []) })
        : [],
    [programs, score, majorIds, groupIds, wishlist, profile, goal],
  );
  const matches = useMemo(() => matchRounds(rounds, programs, today, score, majorIds, groupIds), [rounds, programs, today, score, majorIds, groupIds]);
  const shownRounds = onlyMine ? matches.filter((m) => m.eligible) : matches;

  // Thông báo đợt bổ sung phù hợp (server kiểm tra bằng dữ liệu tài khoản).
  useEffect(() => {
    if (!hydrated || !user || checked.current) return;
    if (simulated && !demoMode) return;
    checked.current = true;
    fetch("/api/supplementary/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(simulated ? { today } : {}) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.created > 0 && toast(`Có ${d.created} đợt xét bổ sung phù hợp — xem chuông thông báo`, "info"))
      .catch(() => undefined);
  }, [hydrated, user, simulated, demoMode, today, toast]);

  // Các mốc từ khi công bố điểm thi trở đi + mốc xét bổ sung.
  const steps = useMemo(() => {
    const fromIdx = events.findIndex((e) => e.category === "ket-qua");
    const list = (fromIdx >= 0 ? events.slice(fromIdx) : events).map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end ?? e.start }));
    if (rounds.length) {
      const opens = rounds.map((r) => r.opens).sort()[0];
      const closes = rounds.map((r) => r.closes).sort().slice(-1)[0];
      list.push({ id: "bo-sung", title: "Xét tuyển bổ sung", start: opens, end: closes });
    }
    return list;
  }, [events, rounds]);

  const target = goal?.targetScore != null && score && goal.method === score.method ? goal.targetScore : null;
  const gap = target != null && score ? Math.round((score.total - target) * 100) / 100 : null;
  const unit = score ? ADMISSION_METHODS[score.method] : ADMISSION_METHODS.thpt;

  const pathways = [
    { Icon: LuRoute, title: "Xét tuyển bổ sung", text: `${matches.filter((m) => m.eligible).length} đợt nhận hồ sơ với điểm của bạn`, href: "#bo-sung" },
    { Icon: LuSchool, title: "Cùng ngành, trường khác", text: `${planB.filter((p) => p.kind === "same-major").length} chương trình An toàn / Vừa sức`, href: "#ke-hoach-b" },
    { Icon: LuShuffle, title: "Ngành gần với ngành bạn muốn", text: `${planB.filter((p) => p.kind === "related").length} chương trình cùng nhóm ngành`, href: "#ke-hoach-b" },
    { Icon: LuGlobe, title: "Chương trình liên kết / quốc tế", text: "Thường xét học bạ, phỏng vấn; học phí cao hơn — xem kỹ chi phí", href: "/chuong-trinh?types=quoc-te" },
    { Icon: LuGraduationCap, title: "Cao đẳng rồi liên thông", text: "Học cao đẳng 2,5–3 năm, sau đó xét liên thông lên đại học theo quy định của từng trường", href: "/tro-giup#lien-he" },
  ];

  // Phần đầu trang render ngay ở máy chủ; nội dung cá nhân hoá chờ dữ liệu trên máy (localStorage) sẵn sàng.
  const header = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Mùa công bố điểm {season}</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi từng mốc, xem lại nguyện vọng với điểm thật và chuẩn bị kế hoạch B trước khi hết hạn điều chỉnh.</p>
        </div>
        {simulated ? (
          <Link href="/mua-diem" className={buttonClass({ variant: "ghost", size: "sm" })}>
            Thoát mô phỏng
          </Link>
        ) : (
          <Link href={`/mua-diem?ngay=${demoDate}`} className={buttonClass({ variant: "outline", size: "sm" })}>
            <LuSparkles className="size-4" aria-hidden /> Xem mô phỏng giữa mùa ({fmt(demoDate)})
          </Link>
        )}
      </div>
      {simulated && (
        <p className="rounded-xl bg-primary-50 px-4 py-2.5 text-[13px] font-medium text-primary-800" role="status">
          Đang xem mô phỏng ngày {fmt(today)} — trạng thái các mốc và đợt bổ sung tính theo ngày này.
        </p>
      )}
    </>
  );

  if (!hydrated)
    return (
      <div className="mt-4 space-y-5">
        {header}
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );

  return (
    <div className="mt-4 space-y-5">
      {header}

      {score ? (
        <div className={cn("flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4", gap != null && gap < 0 ? "border-accent-200 bg-accent-50" : "border-primary-200 bg-primary-50")}>
          <LuCircleAlert className={cn("size-6 shrink-0", gap != null && gap < 0 ? "text-accent-700" : "text-primary-600")} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={cn("font-semibold", gap != null && gap < 0 ? "text-accent-700" : "text-primary-800")}>
              Điểm của bạn: {formatMethodScore(score.total, score.method)} ({score.combo ?? unit.short})
              {gap != null && (gap < 0 ? ` — thấp hơn mục tiêu ${formatMethodScore(target, score.method)} là ${Math.abs(gap).toFixed(unit.decimals)} điểm` : gap > 0 ? ` — cao hơn mục tiêu ${Math.abs(gap).toFixed(unit.decimals)} điểm` : " — đúng mục tiêu")}
            </p>
            <p className="text-[13px] text-slate-700">Trovio đã chấm lại {planA.length} nguyện vọng và gợi ý kế hoạch B bên dưới.</p>
          </div>
          <Link href="/diem-cua-toi" className={buttonClass({ variant: "outline", size: "sm", className: "bg-white" })}>
            Sửa điểm
          </Link>
        </div>
      ) : (
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <p className="flex-1 text-sm text-slate-600">Nhập điểm thi (hoặc điểm dự kiến) để Trovio chấm lại nguyện vọng và gợi ý kế hoạch B.</p>
          <Link href="/diem-cua-toi" className={buttonClass({ size: "sm" })}>
            Nhập điểm
          </Link>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Các mốc mùa tuyển sinh</h2>
          <Link href="/moc-tuyen-sinh" className="text-[13px] font-semibold text-primary-600 hover:underline">
            Xem toàn bộ lịch & bật nhắc →
          </Link>
        </div>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {steps.map((s, i) => {
            const st = today > s.end ? "done" : today >= s.start ? "now" : "todo";
            return (
              <li key={s.id} className="relative">
                <div className="flex items-center">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      st === "done" ? "bg-success-500 text-white" : st === "now" ? "bg-primary-600 ring-4 ring-primary-200" : "border-2 border-slate-300 bg-white",
                    )}
                    aria-hidden
                  >
                    {st === "done" && <LuCheck className="size-3.5" />}
                  </span>
                  {i < steps.length - 1 && <span className={cn("ml-2 hidden h-0.5 flex-1 rounded lg:block", st === "done" ? "bg-success-500" : "bg-slate-200")} aria-hidden />}
                </div>
                <p className={cn("mt-2 text-[13px] font-semibold", st === "todo" ? "text-slate-600" : "text-slate-900")}>{s.title}</p>
                <p className={cn("text-xs", st === "now" ? "font-semibold text-primary-600" : "text-slate-500")}>{s.start === s.end ? fmt(s.start) : `${fmt(s.start)}–${fmt(s.end)}`}</p>
                {st === "now" && <span className="mt-1 inline-flex rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">Đang diễn ra · còn {daysBetween(today, s.end) + 1} ngày</span>}
                <span className="sr-only">{st === "done" ? "Đã qua" : st === "now" ? "Đang diễn ra" : "Sắp tới"}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Kế hoạch A · danh sách hiện tại</h2>
            {score && <span className="text-xs text-slate-500">chấm lại với {formatMethodScore(score.total, score.method)}</span>}
          </div>
          {wishPrograms.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Chưa có nguyện vọng.{" "}
              <Link href="/da-luu" className="font-semibold text-primary-600 hover:underline">
                Lập danh sách nguyện vọng
              </Link>
            </p>
          ) : !score ? (
            <p className="mt-3 text-sm text-slate-600">Nhập điểm để chấm lại {wishPrograms.length} nguyện vọng.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {planA.map((it, i) => (
                <li key={it.program.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="rounded-md bg-primary-600 px-1.5 py-1 text-[11px] font-bold text-white">NV{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{it.program.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {it.program.schoolName}
                      {it.cutoff != null ? ` · chuẩn ${formatMethodScore(it.cutoff, score.method)}` : ""}
                    </p>
                  </div>
                  {it.diff != null && <span className={cn("text-xs font-semibold", it.diff < -0.5 ? "text-danger-700" : "text-slate-600")}>{it.diff > 0 ? "+" : ""}{it.diff.toFixed(unit.decimals)}</span>}
                  {it.level ? <FitTag level={it.level} /> : <span className="text-[11px] text-slate-500">{it.reason === "combo" ? "Không xét tổ hợp của bạn" : "Không xét phương thức này"}</span>}
                </li>
              ))}
            </ul>
          )}
          {score && planA.length > 0 && !hasSafe(planA) && (
            <p className="mt-3 flex gap-2 rounded-lg bg-danger-50 px-3 py-2 text-[13px] font-semibold text-danger-700">
              <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Chưa có nguyện vọng An toàn — có rủi ro trượt cả {planA.length} nguyện vọng.
            </p>
          )}
        </Card>

        <Card id="ke-hoach-b" className="border-primary-200 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Kế hoạch B · Trovio đề xuất thêm</h2>
            {planB.length > 0 && <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">{planB.length} lựa chọn</span>}
          </div>
          <p className="mt-1 text-xs text-slate-600">Cùng ngành ở trường khác, rồi tới ngành gần — chỉ mức An toàn / Vừa sức với điểm của bạn. Thêm vào cuối danh sách để giữ thứ tự ưu tiên.</p>
          {!score ? (
            <p className="mt-3 text-sm text-slate-600">Cần điểm để gợi ý kế hoạch B.</p>
          ) : planB.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Chưa tìm được chương trình phù hợp trong khu vực/ngân sách bạn chọn. Thử mở rộng khu vực hoặc xem các đợt xét bổ sung bên dưới.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {planB.map((o) => {
                const added = inWishlist(o.program.id);
                return (
                  <li key={o.program.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/chuong-trinh/${o.program.slug}`} className="text-[13px] font-semibold text-slate-900 hover:text-primary-700">
                          {o.program.name}
                        </Link>
                        <FitTag level={o.level} />
                      </div>
                      <p className="text-[11px] text-primary-600">
                        {o.program.schoolName} · chuẩn {formatMethodScore(o.program.cutoffs[0]?.score ?? null, score.method)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {o.kind === "same-major" ? "Cùng ngành" : o.kind === "related" ? "Ngành gần (cùng nhóm)" : "Chương trình liên kết / quốc tế"} · {o.diff >= 0 ? "cao" : "thấp"} hơn chuẩn{" "}
                        {Math.abs(o.diff).toFixed(unit.decimals)} · học phí {o.program.tuitionMin}–{o.program.tuitionMax} tr/năm
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={added ? "ghost" : "outline"}
                      disabled={added}
                      onClick={() => {
                        addWishlist(o.program.id);
                        toast(`Đã thêm làm NV${wishlist.length + 1}`, "success");
                      }}
                    >
                      {added ? (
                        <>
                          <LuCheck className="size-4" aria-hidden /> Đã thêm
                        </>
                      ) : (
                        <>
                          <LuPlus className="size-4" aria-hidden /> Thêm làm NV{wishlist.length + 1}
                        </>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900">Luôn có đường đi khác</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pathways.map((p) => (
            <li key={p.title}>
              <Link href={p.href} className="flex h-full flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 hover:border-primary-200 hover:bg-primary-50/40">
                <p.Icon className="size-5 text-primary-600" aria-hidden />
                <span className="text-[13px] font-semibold text-slate-900">{p.title}</span>
                <span className="text-xs text-slate-600">{p.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card id="bo-sung" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Theo dõi xét tuyển bổ sung</h2>
            <p className="text-xs text-slate-500">Ngành thuộc nhóm bạn quan tâm hiện lên trước. Trạng thái tự cập nhật theo ngày.</p>
          </div>
          {score && (
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-700">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="size-4 accent-primary-600" />
              Chỉ đợt nhận hồ sơ với điểm của tôi
            </label>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <caption className="sr-only">Các đợt xét tuyển bổ sung</caption>
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-5 py-2.5">
                  Trường · ngành
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Chỉ tiêu còn
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Điểm nhận hồ sơ
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Hạn nộp
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Trạng thái
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Nhắc tôi
                </th>
              </tr>
            </thead>
            <tbody>
              {shownRounds.map((m) => {
                const on = hasReminder(m.round.id);
                return (
                  <tr key={m.round.id} className="border-t border-slate-100">
                    <td className="px-5 py-3">
                      <Link href={`/chuong-trinh/${m.program.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                        {m.program.name} – {m.program.schoolName}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]">
                        {m.relevant && <span className="rounded bg-primary-50 px-1.5 text-primary-700">Đúng nhóm ngành của bạn</span>}
                        {m.eligible && <span className="rounded bg-success-50 px-1.5 text-success-700">Đủ điểm nhận hồ sơ</span>}
                        <span className="text-slate-500">{m.round.combos.join(", ")}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">{m.round.quota}</td>
                    <td className="px-3 py-3">từ {m.round.minScore.toFixed(2)}</td>
                    <td className="px-3 py-3">{fmt(m.round.closes)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          m.status === "dang-nhan" ? "bg-success-50 text-success-700" : m.status === "sap-mo" ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {ROUND_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Nhắc tôi về ${m.program.name} – ${m.program.schoolName}`}
                        disabled={m.status === "da-dong"}
                        onClick={() => {
                          const now = toggleReminder(m.round.id);
                          toast(now ? (user ? "Sẽ báo trong chuông khi đợt này mở" : "Đã bật — đăng nhập để nhận thông báo") : "Đã tắt nhắc", "success");
                        }}
                        className={cn("relative h-5 w-9 rounded-full transition-colors disabled:opacity-40", on ? "bg-primary-600" : "bg-slate-300")}
                      >
                        <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform", on && "translate-x-4")} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {shownRounds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                    Chưa có đợt bổ sung nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="flex gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
          <LuBell className="mt-0.5 size-3.5 shrink-0 text-primary-600" aria-hidden />
          Khi đợt phù hợp với điểm và nhóm ngành của bạn mở, Trovio báo trong chuông thông báo (và email nếu bạn bật nhắc qua email). Tên đợt, chỉ tiêu và ngày là dữ liệu minh hoạ.
        </p>
      </Card>
    </div>
  );
}
