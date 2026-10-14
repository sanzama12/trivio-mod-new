"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuArrowRight, LuCloud, LuWandSparkles, LuX } from "react-icons/lu";
import { LIKERT_LABELS, QUESTIONS_PER_PAGE, RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import type { RiasecQuestion, RiasecResult } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { useToast } from "@/components/ui/toast";

export function QuizRunner({ questions }: { questions: RiasecQuestion[] }) {
  const router = useRouter();
  const toast = useToast();
  const { quizDraft, setQuizDraft, setQuiz, hydrated } = useTrovio();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageCount = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

  // Khôi phục bản nháp và nhảy tới trang đang làm dở.
  useEffect(() => {
    if (!hydrated) return;
    setAnswers(quizDraft);
    const firstUnanswered = questions.findIndex((q) => !quizDraft[q.id]);
    if (firstUnanswered > 0) setPage(Math.floor(firstUnanswered / QUESTIONS_PER_PAGE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const current = questions.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);
  const answered = useMemo(() => questions.filter((q) => answers[q.id]).length, [answers, questions]);
  const percent = Math.round((answered / questions.length) * 100);
  const pageDone = current.every((q) => answers[q.id]);
  const type = current[0]?.type ?? "R";
  const isLast = page === pageCount - 1;

  const answer = (id: number, v: number) => {
    if (Object.keys(answers).length === 0) track("quiz_started");
    const next = { ...answers, [id]: v };
    setAnswers(next);
    setQuizDraft(next);
  };

  const submit = async (payload = answers) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { result: RiasecResult };
      setQuiz({ result: data.result, savedToProfile: false });
      track("quiz_done");
      setQuizDraft({});
      router.push("/trac-nghiem/ket-qua");
    } catch {
      setError("Không gửi được bài làm. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  const autofill = () => {
    // Điền nhanh để thử: nghiêng về nhóm E, A, S.
    const bias: Record<string, number> = { E: 5, A: 4, S: 4, I: 3, C: 2, R: 2 };
    const filled = Object.fromEntries(questions.map((q, i) => [q.id, Math.max(1, Math.min(5, bias[q.type] + ((i % 3) - 1)))]));
    setAnswers(filled);
    setQuizDraft(filled);
    setPage(pageCount - 1);
    toast(`Đã điền sẵn ${questions.length} câu để thử. Bấm “Xem kết quả”.`, "info");
  };

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
          Phần {RIASEC_ORDER.indexOf(type) + 1}/6: Nhóm {RIASEC_INFO[type].label} ({type})
        </span>
        <Link href="/trac-nghiem" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          Thoát trắc nghiệm <LuX className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-slate-700">
            Câu {page * QUESTIONS_PER_PAGE + 1} – {Math.min((page + 1) * QUESTIONS_PER_PAGE, questions.length)} / {questions.length}
          </span>
          <span className="font-semibold text-primary-700">{percent}% hoàn thành</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ làm bài">
          <div className="h-full rounded-full bg-primary-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <LuCloud className="size-3.5" aria-hidden /> Tiến độ được lưu tự động trên trình duyệt này
        </p>
      </div>

      <div className="mt-6 hidden grid-cols-5 gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-[11px] font-semibold text-slate-600 md:ml-auto md:grid md:w-[420px]" aria-hidden>
        {LIKERT_LABELS.map((l, i) => (
          <span key={l}>
            {i + 1} · {l}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-4">
        {current.map((q) => (
          <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:flex md:items-center md:gap-6">
            <legend className="sr-only">
              Câu {q.id}: {q.text}
            </legend>
            <div className="flex-1" aria-hidden>
              <p className="text-sm font-bold text-primary-700">Câu {q.id}</p>
              <p className="mt-1 font-medium text-slate-900">{q.text}</p>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 md:mt-0 md:w-[420px]">
              {LIKERT_LABELS.map((label, i) => {
                const v = i + 1;
                const selected = answers[q.id] === v;
                return (
                  <label key={v} className="flex cursor-pointer flex-col items-center gap-1.5">
                    <input type="radio" name={`q-${q.id}`} value={v} checked={selected} onChange={() => answer(q.id, v)} className="peer sr-only" aria-label={label} />
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-primary-200",
                        selected ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 text-slate-500 hover:border-primary-300",
                      )}
                    >
                      {v}
                    </span>
                    <span className={cn("text-center text-[11px] leading-tight md:hidden", selected ? "font-semibold text-primary-700" : "text-slate-500")}>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <Button variant="ghost" onClick={() => (page === 0 ? router.push("/trac-nghiem") : setPage((p) => p - 1))}>
          <LuArrowLeft className="size-4" aria-hidden /> Quay lại
        </Button>
        <div className="flex flex-col items-end gap-1">
          <Button disabled={!pageDone || submitting} onClick={() => (isLast ? submit() : setPage((p) => p + 1))}>
            {isLast ? (submitting ? "Đang tính kết quả…" : "Xem kết quả") : "Tiếp tục"} <LuArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      {!pageDone && <p className="text-right text-xs text-slate-500">Trả lời đủ {current.length} câu để tiếp tục.</p>}

      <p className="mt-6 text-center">
        <button type="button" onClick={autofill} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 underline-offset-4 hover:text-primary-700 hover:underline">
          <LuWandSparkles className="size-3.5" aria-hidden /> Tự điền để thử nhanh (dành cho bản demo)
        </button>
      </p>
    </div>
  );
}
