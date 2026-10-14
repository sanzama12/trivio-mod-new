"use client";

/** Phiếu SUS (System Usability Scale) — 10 câu, thang 1–5, ẩn danh. Dùng sau mỗi buổi test người dùng. */
import { useRef, useState, type FormEvent } from "react";
import { LuCircleCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const SCALE = ["Rất không đồng ý", "Không đồng ý", "Phân vân", "Đồng ý", "Rất đồng ý"] as const;

export function SusSurvey({ questions, roles }: { questions: readonly string[]; roles: Record<string, string> }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [role, setRole] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const answered = answers.filter((a) => a !== null).length;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const missing = answers.findIndex((a) => a === null);
    if (missing >= 0) {
      setError(`Bạn chưa trả lời câu ${missing + 1}. Vui lòng trả lời đủ ${questions.length} câu.`);
      formRef.current?.querySelector<HTMLInputElement>(`input[name="sus-${missing}"]`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const website = String(new FormData(e.currentTarget).get("website") ?? "");
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, role: role || null, comment, website }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setError(d.message ?? "Không gửi được, vui lòng thử lại.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Không kết nối được. Kiểm tra mạng và thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setAnswers(questions.map(() => null));
    setRole("");
    setComment("");
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-success-50 p-6 text-success-700" role="status">
        <LuCircleCheck className="mt-0.5 size-6 shrink-0" aria-hidden />
        <div>
          <p className="text-lg font-bold">Cảm ơn bạn đã góp ý!</p>
          <p className="mt-1 text-sm text-slate-700">Câu trả lời đã được ghi nhận ẩn danh và giúp nhóm cải thiện Trovio.</p>
          <button type="button" onClick={reset} className="mt-3 text-sm font-semibold text-primary-700 hover:underline">
            Điền phiếu mới (cho người tham gia tiếp theo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <div className="max-w-xs">
        <Label htmlFor="sus-role">Bạn là (không bắt buộc)</Label>
        <select
          id="sus-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        >
          <option value="">Không nêu</option>
          {Object.entries(roles).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={i}>
            <fieldset className={cn("rounded-xl border bg-white p-4 sm:p-5", error && answers[i] === null ? "border-danger-500" : "border-slate-200")}>
              <legend className="sr-only">
                Câu {i + 1}: {q}
              </legend>
              <p aria-hidden className="text-[15px] font-semibold text-slate-900">
                <span className="text-primary-700">{i + 1}.</span> {q}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {SCALE.map((label, k) => {
                  const v = k + 1;
                  const checked = answers[i] === v;
                  return (
                    <label
                      key={v}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center rounded-lg border py-2.5 text-center transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary-100",
                        checked ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-primary-300",
                      )}
                    >
                      <input
                        type="radio"
                        name={`sus-${i}`}
                        value={v}
                        checked={checked}
                        onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                        className="sr-only"
                      />
                      <span className="text-base font-bold">{v}</span>
                      <span className={cn("hidden text-[11px] leading-tight sm:block", checked ? "text-white" : "text-slate-600")}>{label}</span>
                      <span className="sr-only sm:hidden"> – {label}</span>
                    </label>
                  );
                })}
              </div>
              <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-slate-600 sm:hidden">
                <span>{SCALE[0]}</span>
                <span>{SCALE[4]}</span>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div>
        <Label htmlFor="sus-comment">Điều bạn thấy khó dùng nhất, hoặc muốn Trovio cải thiện (không bắt buộc)</Label>
        <textarea
          id="sus-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        />
      </div>
      {/* Bẫy bot: người dùng không nhìn thấy ô này. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Đang gửi…" : "Gửi phiếu khảo sát"}
        </Button>
        <p className="text-sm text-slate-600" aria-live="polite">
          Đã trả lời {answered}/{questions.length} câu
        </p>
      </div>
    </form>
  );
}
