"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuArrowRight, LuRotateCcw } from "react-icons/lu";
import { LIKERT_LABELS, QUESTIONS_PER_PAGE, scoreRiasec, unansweredRiasecIds, type RiasecAnswers } from "@/domain/riasec";
import { RIASEC_QUESTIONS } from "@/domain/riasec-questions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Breadcrumb } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { clearRiasecDraft, clearRiasecQuiz, readRiasecDraft, saveRiasecDraft, saveRiasecResult } from "./quiz-storage";

export function QuizRunner() {
  const router = useRouter();
  const toast = useToast();
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const [answers, setAnswers] = useState<RiasecAnswers>({});
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const total = RIASEC_QUESTIONS.length;
  const pageCount = Math.ceil(total / QUESTIONS_PER_PAGE);
  const score = scoreRiasec(answers);
  const progress = Math.round(score.answered / total * 100);
  const start = page * QUESTIONS_PER_PAGE;
  const questions = RIASEC_QUESTIONS.slice(start, start + QUESTIONS_PER_PAGE);
  const missing = unansweredRiasecIds(answers, page);
  const lastPage = page === pageCount - 1;

  useEffect(() => {
    const draft = readRiasecDraft();
    const firstMissing = RIASEC_QUESTIONS.findIndex(({ id }) => !draft[id]);
    setAnswers(draft);
    setPage(firstMissing < 0 ? pageCount - 1 : Math.floor(firstMissing / QUESTIONS_PER_PAGE));
    setReady(true);
  }, [pageCount]);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [page, ready, resetCount]);

  function choose(id: string, value: number) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setStorageBlocked(!saveRiasecDraft(next));
  }

  function nextPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || missing.length || submitting.current) return;
    if (!lastPage) return setPage((current) => current + 1);
    // Bản nháp bị thiếu câu ở trang trước phải được hoàn thành trước khi xem kết quả.
    if (score.answered !== total) {
      const firstMissing = RIASEC_QUESTIONS.findIndex(({ id }) => !answers[id]);
      setPage(Math.floor(firstMissing / QUESTIONS_PER_PAGE));
      toast("Bạn còn câu chưa trả lời. Hãy hoàn thành trang này trước nhé.", "info");
      return;
    }
    submitting.current = true;
    setFinishing(true);
    const saved = saveRiasecResult({ ...score, completedAt: new Date().toISOString() });
    clearRiasecDraft();
    if (!saved) toast("Không lưu được trên trình duyệt. Bạn vẫn xem được kết quả trong phiên này; tải ảnh để giữ lại nhé.", "warning");
    router.push("/trac-nghiem/ket-qua");
  }

  function restart() {
    const cleared = clearRiasecQuiz();
    setResetOpen(false);
    setAnswers({});
    setPage(0);
    setResetCount((count) => count + 1);
    setStorageBlocked(!cleared);
    toast(cleared ? "Đã xoá bài cũ. Bạn có thể bắt đầu lại." : "Đã bắt đầu lại trong phiên này. Trình duyệt đang chặn việc xoá dữ liệu đã lưu.", cleared ? "success" : "warning");
  }

  return (
    <div className="bg-paper-50 pb-16">
      <div className="container-page max-w-4xl py-6 sm:py-8">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm", href: "/trac-nghiem" }, { label: "Làm bài" }]} />
        <div className="mt-6">
          <h1 ref={heading} tabIndex={-1} className="scroll-mt-28 rounded-lg text-2xl font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600 sm:text-3xl">
            Bạn thích những hoạt động nào?
            <span className="mt-2 block text-base font-medium text-slate-600">Trang {page + 1}/{pageCount} · Câu {start + 1}–{Math.min(start + QUESTIONS_PER_PAGE, total)}</span>
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">Chọn theo mức độ bạn thích, dù chưa từng thử. Không có đáp án đúng hay sai; bạn có thể quay lại đổi lựa chọn.</p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700" aria-live="polite">
            <span>{score.answered}/{total} câu đã trả lời</span><span className="tabular-nums">{progress}%</span>
          </div>
          <div role="progressbar" aria-label="Tiến độ trả lời" aria-valuemin={0} aria-valuemax={total} aria-valuenow={score.answered} aria-valuetext={`${score.answered}/${total} câu, ${progress}%`} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!ready ? <p role="status" className="py-12 text-slate-600">Đang mở bài làm…</p> : (
          <form onSubmit={nextPage} className="mt-8">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="p-4 sm:p-6">
                  <fieldset role="radiogroup" aria-labelledby={`question-${question.id}`}>
                    <legend id={`question-${question.id}`} className="text-base font-semibold leading-relaxed text-slate-900">
                      <span className="mr-2 text-slate-500">{start + index + 1}.</span>{question.text}
                    </legend>
                    <div className="mt-4 grid gap-2 sm:grid-cols-5">
                      {LIKERT_LABELS.map((label, option) => {
                        const value = option + 1;
                        const selected = answers[question.id] === value;
                        return (
                          <label key={label} className="relative flex cursor-pointer">
                            <input type="radio" name={question.id} value={value} checked={selected} aria-checked={selected} onChange={() => choose(question.id, value)} className="peer sr-only" />
                            <span className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 transition-colors hover:border-primary-300 hover:bg-primary-50 peer-checked:border-primary-600 peer-checked:bg-primary-50 peer-checked:font-semibold peer-checked:text-primary-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600 sm:flex-col sm:justify-center sm:gap-2 sm:text-center">
                              <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary-600 bg-primary-600" : "border-slate-500 bg-white"}`}>
                                {selected && <span className="size-2 rounded-full bg-white" />}
                              </span>
                              {label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </Card>
              ))}
            </div>
            <div className="mt-6" id="quiz-page-hint" aria-live="polite">
              <p className="text-sm text-slate-600">{missing.length ? `Còn câu ${missing.map((id) => start + questions.findIndex((question) => question.id === id) + 1).join(", ")} chưa trả lời. Chọn một mức cho mỗi câu để tiếp tục.` : "Bạn đã trả lời đủ trang này."}</p>
              {storageBlocked && <p role="status" className="mt-2 text-sm text-slate-700">Trình duyệt đang chặn lưu bài. Bạn vẫn làm và xem kết quả được trong phiên này; tải lại hoặc đóng trang có thể mất bài.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || finishing}><LuArrowLeft className="size-4" aria-hidden />Trang trước</Button>
              <Button type="submit" disabled={missing.length > 0 || finishing} aria-describedby="quiz-page-hint">{finishing ? "Đang mở kết quả…" : lastPage ? "Xem kết quả" : "Trang sau"}<LuArrowRight className="size-4" aria-hidden /></Button>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4">
              <Button variant="ghost" onClick={() => setResetOpen(true)} disabled={finishing}><LuRotateCcw className="size-4" aria-hidden />Làm lại từ đầu</Button>
              <p className="mt-2 text-xs text-slate-500">Bản nháp tự lưu trên trình duyệt này sau mỗi lựa chọn. Không cần đăng nhập.</p>
            </div>
          </form>
        )}
      </div>
      <ConfirmDialog open={resetOpen} title="Làm lại từ đầu?" confirmLabel="Xoá và làm lại" onConfirm={restart} onCancel={() => setResetOpen(false)}>
        Bản nháp và kết quả RIASEC trước đó trên trình duyệt này sẽ bị xoá. Bạn sẽ bắt đầu lại từ câu đầu tiên.
      </ConfirmDialog>
    </div>
  );
}
