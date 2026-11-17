"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { LuArrowLeft, LuArrowRight, LuCheck, LuRotateCcw } from "react-icons/lu";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { RIASEC_ANSWERS, RIASEC_ASSESSMENT_VERSION, RIASEC_QUESTIONS, RIASEC_SOURCE_URL } from "@/domain/riasec-questions";
import { scoreAnswers, type QuizAnswers } from "@/services/riasec.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { PersonalizedSuggestions } from "@/components/search/personalized-suggestions";

const PAGE_SIZE = 6;
const PAGE_COUNT = RIASEC_QUESTIONS.length / PAGE_SIZE;

export function RiasecQuiz() {
  const store = useTrovio();
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"quiz" | "results">("quiz");
  const [error, setError] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftKey = `trovio:riasec-draft:${store.user?.id ?? "guest"}`;
  const result = store.riasec;
  const completed = RIASEC_QUESTIONS.filter((question) => Number.isInteger(answers[question.id])).length;
  const currentQuestions = RIASEC_QUESTIONS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setDraftLoaded(false);
    setAnswers({});
    setPage(0);
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (draft?.version === RIASEC_ASSESSMENT_VERSION && draft.answers && typeof draft.answers === "object") {
        const clean: QuizAnswers = {};
        for (const question of RIASEC_QUESTIONS) {
          const answer = draft.answers[question.id];
          if (Number.isInteger(answer) && answer >= 0 && answer <= 4) clean[question.id] = answer;
        }
        setAnswers(clean);
        setPage(Number.isInteger(draft.page) ? Math.max(0, Math.min(PAGE_COUNT - 1, draft.page)) : 0);
      }
    } catch {
      // A damaged draft must not prevent taking the assessment.
    }
    setDraftLoaded(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version: RIASEC_ASSESSMENT_VERSION, answers, page }));
    } catch {
      // Answers remain available in memory when storage is blocked.
    }
  }, [answers, page, draftKey, draftLoaded]);

  useEffect(() => {
    if (store.hydrated && result) setTab("results");
  }, [store.hydrated, result?.completedAt]);

  const moveTo = (nextPage: number) => {
    setPage(nextPage);
    setError("");
    headingRef.current?.focus();
  };

  const submitPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = currentQuestions.find((question) => !Number.isInteger(answers[question.id]));
    if (missing) {
      setError("Bạn hãy chọn mức độ hứng thú cho mỗi hoạt động trên trang này.");
      document.getElementById(`answer-${missing.id}-0`)?.focus();
      return;
    }
    if (page < PAGE_COUNT - 1) { moveTo(page + 1); return; }
    const scored = scoreAnswers(answers);
    if (!scored) {
      const index = RIASEC_QUESTIONS.findIndex((question) => !Number.isInteger(answers[question.id]));
      moveTo(Math.max(0, Math.floor(index / PAGE_SIZE)));
      setError("Bạn cần hoàn thành đủ 60 câu để xem kết quả.");
      return;
    }
    store.setRiasec(scored);
    setTab("results");
  };

  const restart = () => {
    setAnswers({});
    setPage(0);
    setError("");
    setTab("quiz");
  };

  return (
    <div className="mt-7">
      <div role="tablist" aria-label="Trắc nghiệm và kết quả" className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
        {([
          { id: "quiz", label: "Làm trắc nghiệm" },
          { id: "results", label: "Kết quả & ngành phù hợp" },
        ] as const).map((item) => (
          <button key={item.id} id={`riasec-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id}
            aria-controls={`riasec-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "quiz" : event.key === "End" ? "results" : tab === "quiz" ? "results" : "quiz";
              setTab(next);
              document.getElementById(`riasec-tab-${next}`)?.focus();
            }}
            className={cn("min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-5", tab === item.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
            {item.label}
          </button>
        ))}
      </div>

      <section id="riasec-panel-quiz" role="tabpanel" aria-labelledby="riasec-tab-quiz" hidden={tab !== "quiz"} className="mt-5 max-w-4xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">Bạn muốn thực hiện những hoạt động này ở mức nào?</h2>
            <span className="text-sm font-semibold text-primary-700">{completed}/60 câu</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Chọn theo mức độ yêu thích của bạn khi có cơ hội trải nghiệm. Câu trả lời được lưu tạm trên trình duyệt để bạn có thể tiếp tục sau.</p>
          <progress value={completed} max={60} aria-label="Tiến độ trả lời trắc nghiệm" className="mt-4 h-2 w-full accent-primary-600" />
          <form onSubmit={submitPage} className="mt-5">
            <div className="space-y-6">
              {currentQuestions.map((question, index) => (
                <fieldset key={question.id}>
                  <legend className="mb-3 text-sm font-semibold leading-relaxed text-slate-800">{page * PAGE_SIZE + index + 1}. {question.text}</legend>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {RIASEC_ANSWERS.map((option) => (
                      <label key={option.value} className="min-w-0 cursor-pointer">
                        <input id={`answer-${question.id}-${option.value}`} type="radio" name={question.id} value={option.value}
                          checked={answers[question.id] === option.value} disabled={!draftLoaded || !store.hydrated}
                          onChange={() => { setAnswers((current) => ({ ...current, [question.id]: option.value })); setError(""); }}
                          className="peer sr-only" />
                        <span className="flex min-h-12 items-center justify-center rounded-lg border border-slate-200 px-1 py-2 text-center text-[11px] leading-snug text-slate-600 transition-colors hover:border-primary-300 peer-checked:border-primary-600 peer-checked:bg-primary-50 peer-checked:font-bold peer-checked:text-primary-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600 sm:text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-medium text-danger-700">{error}</p>}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button variant="secondary" disabled={page === 0} onClick={() => moveTo(page - 1)}><LuArrowLeft aria-hidden />Quay lại</Button>
              <span className="text-sm text-slate-500">Trang {page + 1}/{PAGE_COUNT}</span>
              <Button type="submit" disabled={!draftLoaded || !store.hydrated}>{page === PAGE_COUNT - 1 ? "Xem kết quả" : "Tiếp tục"}<LuArrowRight aria-hidden /></Button>
            </div>
          </form>
        </div>
      </section>

      <section id="riasec-panel-results" role="tabpanel" aria-labelledby="riasec-tab-results" hidden={tab !== "results"} className="mt-5">
        {!store.hydrated ? <p className="text-sm text-slate-600">Đang tải kết quả…</p> : result ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Hồ sơ sở thích của bạn</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-success-700"><LuCheck aria-hidden />Đã lưu kết quả {new Date(result.completedAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <Button variant="secondary" onClick={restart}><LuRotateCcw aria-hidden />Làm lại</Button>
              </div>
              {result.isFlatProfile ? (
                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">Điểm giữa sáu nhóm khá gần nhau. Bạn hãy khám phá nhiều nhóm ngành và đối chiếu với trải nghiệm thực tế trước khi chọn hướng đi.</p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">{result.code.map((type) => <span key={type} className="rounded-lg bg-primary-50 px-4 py-2 text-sm font-bold text-primary-800">{type} · {RIASEC_INFO[type].label}</span>)}</div>
              )}
              {result.tiedDimensions && result.tiedDimensions.length > 1 && <p className="mt-3 text-sm text-slate-600">Các nhóm có điểm cao xấp xỉ nhau gồm {result.tiedDimensions.map((type) => RIASEC_INFO[type].label).join(", ")}.</p>}
              <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
                {RIASEC_ORDER.map((type) => (
                  <div key={type}>
                    <div className="flex justify-between gap-3 text-sm"><h3 className="font-bold text-slate-800">{type} · {RIASEC_INFO[type].label}</h3><span className="font-semibold text-primary-700">{result.percents[type]}/100</span></div>
                    <div role="meter" aria-label={RIASEC_INFO[type].label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.percents[type]} className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${result.percents[type]}%` }} /></div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{RIASEC_INFO[type].desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-relaxed text-slate-600">Mỗi nhóm có 10 câu, mỗi câu 0–4 điểm. Tổng điểm nhóm được đổi sang thang 100. Các chỉ số phản ánh mức độ hứng thú với hoạt động nghề nghiệp.</p>
            </div>
            <PersonalizedSuggestions limit={8} />
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Bạn chưa hoàn thành trắc nghiệm</h2>
            <p className="mt-2 text-sm text-slate-600">Hoàn thành đủ 60 câu để xem sáu nhóm sở thích và ngành học được gợi ý.</p>
            <Button className="mt-4" onClick={() => setTab("quiz")}>Tiếp tục làm bài<LuArrowRight aria-hidden /></Button>
          </div>
        )}
      </section>

      <details className="mt-6 max-w-4xl rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800">Cơ sở mô hình và cách sử dụng kết quả</summary>
        <p className="mt-3 leading-relaxed">Bài gồm sáu nhóm Holland RIASEC. Trovio biên soạn 60 câu hoạt động bằng tiếng Việt và cộng điểm theo từng nhóm. Bộ câu hỏi này hiện chưa được kiểm định chuẩn hóa trên học sinh Việt Nam. Kết quả dùng để khám phá sở thích và tham khảo ngành học, cần kết hợp với năng lực học tập, điều kiện và trải nghiệm của bạn.</p>
        <p className="mt-3 leading-relaxed">Ngành học được đối chiếu với nhãn RIASEC trong danh mục của Trovio. Khi ngành chưa có nhãn riêng, hệ thống dùng tham chiếu của nhóm ngành và ghi rõ trong lý do gợi ý. Lượt xem gần đây có trọng số bổ sung và giảm dần theo thời gian.</p>
        <a href={RIASEC_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-primary-700 underline underline-offset-4">Tài liệu mô hình và chấm điểm của O*NET® Interest Profiler</a>
        <p className="mt-3">Bạn có thể bổ sung sở thích và môn thế mạnh trong <Link href="/dinh-huong-nghe-nghiep" className="font-semibold text-primary-700 underline">khảo sát định hướng nghề nghiệp</Link>.</p>
      </details>
    </div>
  );
}
