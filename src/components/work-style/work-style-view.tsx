"use client";

/**
 * Trang /trac-nghiem/phong-cach: Giới thiệu → 12 tình huống (chọn 1 trong 2) → Kết quả 4 trục + góc nhìn MBTI.
 * Kết quả lưu trong store (đồng bộ theo tài khoản), chỉ để GIẢI THÍCH — không đổi điểm phù hợp.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuArrowLeft, LuArrowLeftRight, LuArrowRight, LuCircleAlert, LuCircleCheck, LuCompass, LuRotateCcw, LuTrash2, LuX } from "react-icons/lu";
import type { Major, MajorGroup, StoredWorkStyle } from "@/domain/types";
import {
  AXIS_INFO,
  describeAxis,
  matchWorkStyle,
  scoreWorkStyle,
  styleSentence,
  summarizeWorkStyle,
  WORK_AXES,
  WORK_STYLE_QUESTIONS,
  type WorkStyleChoice,
} from "@/domain/work-style";
import { formatDateVi } from "@/lib/format";
import { track } from "@/lib/track";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { AXIS_ICON } from "./style-bits";
import { MbtiCard, WhyRiasec } from "./mbti-card";

type Mode = "intro" | "run" | "result";
type Answers = Partial<Record<string, WorkStyleChoice>>;
type Rec = { major: Major; group: MajorGroup; match: number };
const TOTAL = WORK_STYLE_QUESTIONS.length;

function Crumb({ current }: { current?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
      <Link href="/trac-nghiem" className="hover:text-primary-700">
        Trắc nghiệm
      </Link>{" "}
      ›{" "}
      {current ? (
        <>
          <Link href="/trac-nghiem/phong-cach" className="hover:text-primary-700">
            Phong cách làm việc
          </Link>{" "}
          › {current}
        </>
      ) : (
        "Phong cách làm việc"
      )}
    </nav>
  );
}

export function WorkStyleView() {
  const { workStyle, setWorkStyle, hydrated, quiz, mbti } = useTrovio();
  const toast = useToast();
  const [mode, setMode] = useState<Mode | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const view: Mode = mode ?? (workStyle ? "result" : "intro");

  const go = (m: Mode) => {
    setMode(m);
    window.scrollTo({ top: 0 });
  };
  const restart = () => {
    setAnswers({});
    setIndex(0);
    go("run");
  };
  const finish = (all: Answers) => {
    const scores = scoreWorkStyle(all);
    if (!scores) return;
    setWorkStyle({ scores, completedAt: new Date().toISOString() });
    track("style_done");
    toast("Đã lưu phong cách làm việc của bạn", "success");
    setAnswers({});
    setIndex(0);
    go("result");
  };

  if (!hydrated) {
    return (
      <div className="container-page py-8 sm:py-10">
        <div className="mx-auto max-w-[720px] space-y-5">
          <Crumb />
          <div role="status" className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white">
            <span className="sr-only">Đang tải mini-test…</span>
          </div>
        </div>
      </div>
    );
  }
  if (view === "run") {
    return (
      <Runner
        index={index}
        answers={answers}
        onAnswer={(next, nextIndex) => {
          setAnswers(next);
          if (nextIndex >= TOTAL) finish(next);
          else setIndex(nextIndex);
        }}
        onBack={() => setIndex((i) => Math.max(0, i - 1))}
        onExit={() => go(workStyle ? "result" : "intro")}
      />
    );
  }
  if (view === "result" && workStyle) {
    return (
      <Result
        workStyle={workStyle}
        quizCode={quiz ? quiz.result.code.join("") : null}
        quizPercents={quiz?.result.percents ?? null}
        quizCodeArr={quiz?.result.code ?? null}
        onRestart={restart}
        onDelete={() => {
          setWorkStyle(null);
          toast("Đã xoá kết quả mini-test", "info");
          go("intro");
        }}
      />
    );
  }
  const resumeAt = Object.keys(answers).length > 0 ? index : 0;
  return <Intro resumeAt={resumeAt} hasQuiz={!!quiz} hasMbti={!!mbti} onStart={() => go("run")} />;
}

function Intro({ resumeAt, hasQuiz, hasMbti, onStart }: { resumeAt: number; hasQuiz: boolean; hasMbti: boolean; onStart: () => void }) {
  const [showMbti, setShowMbti] = useState(hasMbti);
  useEffect(() => {
    if (window.location.hash !== "#mbti") return;
    setShowMbti(true);
    const t = setTimeout(() => document.getElementById("mbti")?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mx-auto max-w-[720px] space-y-5">
        <Crumb />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <LuCompass className="size-7" aria-hidden />
            </span>
            <div>
              <Badge tone="primary">Mới · khoảng 2 phút</Badge>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Phong cách làm việc của bạn</h1>
            </div>
          </div>
          <p className="mt-5 text-base text-slate-600">
            {TOTAL} tình huống ngắn, mỗi câu chọn 1 trong 2. Không có đáp án đúng hay sai — hãy chọn cái gần với bạn hơn, kể cả khi cả hai đều đúng một phần.
          </p>
          <p className="mt-5 text-sm font-semibold text-slate-900">Bạn sẽ biết mình nghiêng về phía nào trên 4 trục:</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {WORK_AXES.map((a) => {
              const Icon = AXIS_ICON[a];
              return (
                <li key={a} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800">
                  <Icon className="mt-0.5 size-[18px] shrink-0 text-primary-600" aria-hidden />
                  <span className="min-w-0">
                    {AXIS_INFO[a].left}
                    <LuArrowLeftRight className="mx-1.5 inline size-3.5 align-[-2px] text-slate-400" aria-label="hay" />
                    {AXIS_INFO[a].right}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
            <LuCircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            <span>
              <strong>Chỉ để tham khảo.</strong> Kết quả giúp giải thích thêm vì sao một ngành hợp với bạn, không làm thay đổi điểm phù hợp — điểm vẫn tính từ trắc nghiệm sở
              thích (RIASEC) và điểm thi của bạn.
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onStart}>
              {resumeAt > 0 ? `Tiếp tục (câu ${resumeAt + 1}/${TOTAL})` : "Bắt đầu"} <LuArrowRight className="size-4" aria-hidden />
            </Button>
            <Link href={hasQuiz ? "/trac-nghiem/ket-qua" : "/trac-nghiem"} className={buttonClass({ variant: "ghost", size: "lg", className: "text-primary-700" })}>
              Để sau
            </Link>
          </div>
        </div>

        {showMbti ? (
          <>
            <MbtiCard />
            <WhyRiasec />
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-slate-600">Đã biết mã MBTI của mình? Bạn có thể nhập để xem thêm một góc nhìn tham khảo.</p>
            <Button variant="outline" onClick={() => setShowMbti(true)}>
              Nhập mã MBTI <LuArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Runner({
  index,
  answers,
  onAnswer,
  onBack,
  onExit,
}: {
  index: number;
  answers: Answers;
  onAnswer: (next: Answers, nextIndex: number) => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const q = WORK_STYLE_QUESTIONS[index];
  const [flash, setFlash] = useState<WorkStyleChoice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const options: [WorkStyleChoice, string][] = q.flip
    ? [
        ["b", q.b],
        ["a", q.a],
      ]
    : [
        ["a", q.a],
        ["b", q.b],
      ];
  const answered = Object.keys(answers).length;

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  useEffect(() => {
    // Chuyển câu → đưa tiêu điểm về câu hỏi mới (trình đọc màn hình đọc lại), bỏ qua lần đầu.
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  const choose = (c: WorkStyleChoice) => {
    if (flash) return;
    const next = { ...answers, [q.id]: c };
    setFlash(c);
    timer.current = setTimeout(() => {
      setFlash(null);
      onAnswer(next, index + 1);
    }, 240);
  };
  const back = () => {
    if (flash || index === 0) return;
    onBack();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "1" || k === "a") choose(options[0][0]);
      else if (k === "2" || k === "b") choose(options[1][0]);
      else if (k === "arrowleft" || k === "backspace") back();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = flash ?? answers[q.id];
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mx-auto max-w-[720px] space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="primary">Mini-test · Phong cách làm việc</Badge>
          <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Thoát <LuX className="size-4" aria-hidden />
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900" aria-live="polite">
              Câu {index + 1} / {TOTAL}
            </p>
            <p className="text-xs text-slate-500 sm:text-[13px]">
              Tham khảo<span className="hidden sm:inline"> · không tính vào điểm gợi ý</span>
            </p>
          </div>
          <div
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL}
            aria-valuenow={answered}
            aria-label="Tiến độ mini-test"
          >
            <div className="h-full rounded-full bg-primary-600 transition-[width] duration-300" style={{ width: `${(answered / TOTAL) * 100}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <p className="text-[13px] font-semibold text-primary-600">Tình huống {index + 1}</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-lg font-bold text-slate-900 outline-none sm:text-[22px] sm:leading-snug">
            {q.prompt}
          </h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {options.map(([c, text], i) => {
              const sel = current === c;
              const letter = i === 0 ? "A" : "B";
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => choose(c)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:flex-col sm:p-5",
                    sel ? "border-primary-600 bg-primary-50" : "border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/40",
                  )}
                >
                  <span className="flex items-center justify-between sm:w-full">
                    <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-bold", sel ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600")}>
                      {letter}
                    </span>
                    {sel && <LuCircleCheck className="hidden size-5 text-primary-600 sm:block" aria-hidden />}
                  </span>
                  <span className="flex-1 pt-1 text-[15px] font-medium text-slate-900 sm:pt-0 sm:text-base">{text}</span>
                  {sel && <LuCircleCheck className="mt-1 size-5 shrink-0 text-primary-600 sm:hidden" aria-hidden />}
                  <span className="hidden text-xs text-slate-400 sm:block">
                    Phím {i + 1} hoặc {letter}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={back} disabled={index === 0} className="text-primary-700">
            <LuArrowLeft className="size-4" aria-hidden /> Câu trước
          </Button>
          <p className="text-xs text-slate-500 sm:text-[13px]">Chọn xong sẽ tự sang câu tiếp</p>
        </div>
        <p className="text-center text-xs text-slate-500 sm:text-[13px]">Không có đáp án đúng hay sai. Nếu thấy cả hai đều đúng, chọn cái bạn thấy thoải mái hơn.</p>
      </div>
    </div>
  );
}

function Result({
  workStyle,
  quizCode,
  quizPercents,
  quizCodeArr,
  onRestart,
  onDelete,
}: {
  workStyle: StoredWorkStyle;
  quizCode: string | null;
  quizPercents: Record<string, number> | null;
  quizCodeArr: readonly string[] | null;
  onRestart: () => void;
  onDelete: () => void;
}) {
  const { scores } = workStyle;
  const [confirm, setConfirm] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);

  useEffect(() => {
    if (!quizPercents || !quizCodeArr) return;
    let alive = true;
    fetch("/api/quiz/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percents: quizPercents, code: quizCodeArr }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { majors: Rec[] }) => alive && setRecs(d.majors.slice(0, 3)))
      .catch(() => alive && setRecs([]));
    return () => {
      alive = false;
    };
  }, [quizPercents, quizCodeArr]);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mx-auto max-w-[1000px] space-y-5">
        <Crumb current="Kết quả" />
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-8">
          <div className="min-w-0 flex-1">
            <Badge tone="accent">Tham khảo · không tính vào điểm gợi ý</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Phong cách làm việc của bạn</h1>
            <p className="mt-2 max-w-[600px] text-[15px] text-slate-600 sm:text-base">{summarizeWorkStyle(scores)}</p>
            <p className="mt-2 text-[13px] text-slate-500">
              Hoàn thành {formatDateVi(workStyle.completedAt)} · {TOTAL} tình huống
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Button variant="outline" size="sm" onClick={onRestart}>
              <LuRotateCcw className="size-4" aria-hidden /> Làm lại
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-primary-700">
              <LuTrash2 className="size-4" aria-hidden /> Xoá kết quả
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <section aria-labelledby="axes-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 id="axes-title" className="text-lg font-bold text-slate-900">
                Bạn nghiêng về phía nào?
              </h2>
              <ul className="mt-5 space-y-5">
                {WORK_AXES.map((a) => {
                  const v = scores[a];
                  const pos = v >= 3 ? 0 : v > 0 ? 1 : v > -3 ? 2 : 3;
                  const Icon = AXIS_ICON[a];
                  return (
                    <li key={a}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className={cn("flex items-center gap-2", v > 0 ? "font-semibold text-slate-900" : "text-slate-500")}>
                          <Icon className={cn("size-4 shrink-0", v > 0 ? "text-primary-600" : "text-slate-400")} aria-hidden />
                          {AXIS_INFO[a].left}
                        </span>
                        <span className={cn("text-right", v < 0 ? "font-semibold text-slate-900" : "text-slate-500")}>{AXIS_INFO[a].right}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1.5" role="img" aria-label={describeAxis(a, v)}>
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={cn("h-2.5 rounded-full", i === pos ? "bg-primary-600" : "bg-slate-200")} />
                        ))}
                      </div>
                      <p className="mt-1.5 text-[13px] text-slate-500">{describeAxis(a, v)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="style-majors-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 id="style-majors-title" className="text-lg font-bold text-slate-900">
                Gợi ý ngành của bạn, nhìn theo phong cách
              </h2>
              {!quizCode ? (
                <div className="mt-2">
                  <p className="text-sm text-slate-600">Làm trắc nghiệm sở thích (RIASEC) để xem ngành nào hợp cả sở thích lẫn phong cách làm việc của bạn.</p>
                  <Link href="/trac-nghiem" className={buttonClass({ size: "sm", className: "mt-3" })}>
                    Làm trắc nghiệm sở thích <LuArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-[13px] text-slate-500">Thứ tự vẫn theo điểm phù hợp RIASEC. Dòng phong cách chỉ giải thích thêm, không cộng hay trừ điểm.</p>
                  <ul className="mt-4 space-y-3">
                    {recs === null && [0, 1, 2].map((i) => <li key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
                    {recs?.length === 0 && <li className="text-sm text-slate-500">Chưa tải được gợi ý ngành. Thử tải lại trang.</li>}
                    {recs?.map(({ major, match }) => {
                      const m = matchWorkStyle(scores, major);
                      const all = m && m.matched.length === m.total;
                      return (
                        <li key={major.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link href={`/nganh/${major.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                              {major.name}
                            </Link>
                            {m && (
                              <Badge tone={all ? "success" : m.matched.length > 0 ? "primary" : "slate"}>
                                Khớp {m.matched.length}/{m.total}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] text-slate-600">
                            {m ? styleSentence(major.name, quizCode, m) : `Ngành ${major.name} hợp mã ${quizCode} của bạn (${match}%); ngành này không nghiêng rõ về phong cách nào.`}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/goi-y" className={buttonClass({ variant: "outline", size: "sm", className: "mt-4" })}>
                    Xem tất cả gợi ý <LuArrowRight className="size-4" aria-hidden />
                  </Link>
                </>
              )}
            </section>
          </div>
          <div className="space-y-5">
            <MbtiCard />
            <WhyRiasec />
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Xoá kết quả phong cách làm việc?"
        confirmLabel="Xoá kết quả"
        onConfirm={() => {
          setConfirm(false);
          onDelete();
        }}
        onCancel={() => setConfirm(false)}
      >
        Các dòng giải thích phong cách trên thẻ gợi ý sẽ ẩn đi. Mã MBTI (nếu có) vẫn được giữ. Bạn có thể làm lại bất cứ lúc nào.
      </ConfirmDialog>
    </div>
  );
}
