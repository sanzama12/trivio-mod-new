"use client";

/**
 * Khung chat "Trợ lý ngành học" (nút nổi góc phải dưới).
 *
 * - Câu trả lời do server soạn từ dữ liệu có cấu trúc của Trovio (xem services/chatbot.service.ts), luôn kèm nguồn.
 * - Client chỉ hiển thị; link được lọc lại bằng safeChatHref (chỉ "/…" hoặc https).
 * - Hội thoại chỉ giữ trong bộ nhớ trang (không lưu trình duyệt); server lưu nhật ký đã che email/số điện thoại.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  LuArrowLeftRight,
  LuCheck,
  LuBotMessageSquare,
  LuChevronRight,
  LuExternalLink,
  LuInfo,
  LuRotateCcw,
  LuSendHorizontal,
  LuShieldCheck,
  LuThumbsDown,
  LuThumbsUp,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import { MAX_QUESTION, safeChatHref, type ChatAnswer } from "@/domain/chat";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { SaveButton, useCompareBarVisible } from "@/components/program/program-actions";
import { MAX_COMPARE } from "@/stores/trovio-store";
import { track } from "@/lib/track";
import { useToast } from "@/components/ui/toast";

type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "bot"; answer: ChatAnswer; logId: string | null; feedback?: boolean }
  | { id: string; role: "error"; text: string };

const MAX_MESSAGES = 40;
const HIDDEN_ON = ["/trac-nghiem/lam-bai"];
const STARTERS = ["Ngành Marketing học gì?", "Điểm chuẩn ngành Công nghệ thông tin", "Lương ngành Kế toán", "Tôi nên học ngành gì?"];
/** Sự kiện để nơi khác mở khung chat, VD: window.dispatchEvent(new CustomEvent("trovio:open-chat", { detail: "Câu hỏi" })). */
export const OPEN_CHAT_EVENT = "trovio:open-chat";

let seq = 0;
const nextId = () => `m${++seq}`;

export function ChatWidget() {
  const pathname = usePathname();
  const { quiz } = useTrovio();
  const compareVisible = useCompareBarVisible();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<ChatAnswer["context"]>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  // Sang trang ngành/trường khác → bỏ ngữ cảnh hội thoại cũ để server dùng ngữ cảnh của trang đang xem.
  useEffect(() => {
    if (/^\/(nganh|truong)\/[^/]+/.test(pathname)) setCtx({});
  }, [pathname]);

  const returnFocus = useRef(false);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  const push = (...m: Msg[]) => setMessages((prev) => [...prev, ...m].slice(-MAX_MESSAGES));

  const send = useCallback(
    async (raw: string) => {
      const question = raw.replace(/\s+/g, " ").trim();
      if (question.length < 2 || busy) return;
      if (question.length > MAX_QUESTION) {
        push({ id: nextId(), role: "error", text: `Câu hỏi tối đa ${MAX_QUESTION} ký tự.` });
        return;
      }
      push({ id: nextId(), role: "user", text: question });
      setInput("");
      setBusy(true);
      try {
        const riasec = quiz?.result ? { percents: quiz.result.percents, code: quiz.result.code } : undefined;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: question, context: { ...ctx, page: pathname, riasec } }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; answer?: ChatAnswer; logId?: string; message?: string } | null;
        if (res.ok && data?.ok && data.answer) {
          push({ id: nextId(), role: "bot", answer: data.answer, logId: data.logId ?? null });
          track("chat_asked");
          setCtx(data.answer.context ?? {});
        } else {
          push({ id: nextId(), role: "error", text: data?.message ?? "Trợ lý đang bận, bạn thử lại sau ít phút nhé." });
        }
      } catch {
        push({ id: nextId(), role: "error", text: "Không kết nối được. Kiểm tra mạng và thử lại." });
      } finally {
        setBusy(false);
      }
    },
    [busy, ctx, pathname, quiz],
  );

  // Cho phép nơi khác mở khung chat (kèm câu hỏi gợi ý).
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<unknown>).detail;
      if (typeof q === "string" && q.trim()) setInput(q.slice(0, MAX_QUESTION));
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  const close = () => {
    returnFocus.current = true;
    setOpen(false);
  };

  const reset = () => {
    setMessages([]);
    setCtx({});
    setInput("");
    inputRef.current?.focus();
  };

  const feedback = async (id: string, logId: string | null, helpful: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id && m.role === "bot" ? { ...m, feedback: helpful } : m)));
    if (!logId) return;
    await fetch("/api/chat/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logId, helpful }) }).catch(() => null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div data-print-hide>
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          data-tour="chat"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          className={cn(
            "fixed right-4 z-30 flex items-center gap-2 rounded-full bg-primary-600 py-3 pr-4 pl-3.5 text-sm font-semibold text-white shadow-elevated transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 md:right-6",
            compareVisible ? "bottom-24" : "bottom-4 md:bottom-6",
          )}
        >
          <LuBotMessageSquare className="size-5" aria-hidden />
          <span className="hidden sm:inline">Hỏi trợ lý</span>
          <span className="sr-only sm:hidden">Mở trợ lý hỏi đáp ngành học</span>
        </button>
      )}

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className={cn(
            "fixed inset-x-2 z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated sm:inset-x-auto sm:right-4 sm:w-[400px] md:right-6",
            compareVisible ? "bottom-24" : "bottom-2 sm:bottom-4 md:bottom-6",
            "h-[min(640px,calc(100dvh-5.5rem))]",
          )}
        >
          <header className="flex items-start gap-3 border-b border-slate-200 bg-primary-50 px-4 py-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
              <LuBotMessageSquare className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-bold text-slate-900">
                Trợ lý ngành học
              </h2>
              <p className="flex items-center gap-1 text-xs text-slate-600">
                <LuShieldCheck className="size-3.5 text-success-700" aria-hidden />
                Trả lời từ dữ liệu Trovio, luôn kèm nguồn
              </p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white" aria-label="Bắt đầu cuộc trò chuyện mới" title="Cuộc trò chuyện mới">
                <LuRotateCcw className="size-4" />
              </button>
            )}
            <button type="button" onClick={close} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white" aria-label="Đóng trợ lý">
              <LuX className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={busy}>
            <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs leading-relaxed text-slate-700">
              <p className="flex gap-1.5">
                <LuInfo className="mt-0.5 size-3.5 shrink-0 text-accent-700" aria-hidden />
                <span>
                  Trợ lý <b>không dự đoán điểm chuẩn</b> và không cam kết khả năng đỗ. Thông tin tuyển sinh chính thức: đề án tuyển sinh của trường và cổng thông tin của Bộ GD&amp;ĐT. Không nhập thông tin cá nhân (SĐT, CCCD…).
                </span>
              </p>
            </div>

            {messages.length === 0 && (
              <div>
                <p className="text-sm text-slate-700">Chào bạn! Bạn có thể hỏi về ngành học, trường đào tạo, điểm chuẩn các năm, học phí, việc làm & thu nhập, cảm nhận sinh viên hoặc mốc tuyển sinh.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <SuggestionChip key={s} text={s} onPick={send} disabled={busy} />
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-3.5 py-2 text-sm whitespace-pre-wrap text-white">{m.text}</p>
                </div>
              ) : m.role === "error" ? (
                <p key={m.id} role="alert" className="flex gap-1.5 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {m.text}
                </p>
              ) : (
                <BotMessage
                  key={m.id}
                  answer={m.answer}
                  feedback={m.feedback}
                  onFeedback={(v) => feedback(m.id, m.logId, v)}
                  onPick={send}
                  busy={busy}
                  showSuggestions={i === messages.length - 1}
                />
              ),
            )}

            {busy && (
              <div className="flex items-center gap-1 px-1 py-2" aria-label="Trợ lý đang trả lời">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
            <label htmlFor={`${panelId}-input`} className="sr-only">
              Câu hỏi của bạn
            </label>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                id={`${panelId}-input`}
                rows={1}
                value={input}
                maxLength={MAX_QUESTION}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="VD: Ngành Luật ra trường làm gì?"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length < 2}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Gửi câu hỏi"
              >
                <LuSendHorizontal className="size-5" />
              </button>
            </div>
            <p className="mt-1.5 flex justify-between text-[11px] text-slate-500">
              <span>Enter để gửi · Shift+Enter xuống dòng</span>
              <span aria-live="off">
                {input.length}/{MAX_QUESTION}
              </span>
            </p>
          </form>
        </section>
      )}
    </div>
  );
}

function SuggestionChip({ text, onPick, disabled }: { text: string; onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(text)}
      className="rounded-full border border-primary-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
    >
      {text}
    </button>
  );
}

const KIND_STYLE: Record<ChatAnswer["kind"], string> = {
  answer: "border-slate-200 bg-slate-50",
  clarify: "border-primary-200 bg-primary-50",
  refusal: "border-accent-200 bg-accent-50",
  unknown: "border-slate-200 bg-white",
};

function BotMessage({
  answer,
  feedback,
  onFeedback,
  onPick,
  busy,
  showSuggestions,
}: {
  answer: ChatAnswer;
  feedback?: boolean;
  onFeedback: (helpful: boolean) => void;
  onPick: (q: string) => void;
  busy: boolean;
  showSuggestions: boolean;
}) {
  const sources = answer.sources.map((s) => ({ ...s, href: safeChatHref(s.href) })).filter((s) => s.href);
  return (
    <div className="max-w-[92%]">
      <div className={cn("rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm text-slate-800", KIND_STYLE[answer.kind] ?? KIND_STYLE.answer)}>
        {answer.kind === "refusal" && <p className="mb-1 text-xs font-semibold text-accent-700">Ngoài phạm vi hỗ trợ</p>}
        <p className="whitespace-pre-wrap">{answer.text}</p>

        {answer.items.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {answer.items.map((it, i) => {
              const href = safeChatHref(it.href);
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{it.title}</span>
                    {it.meta && <span className="block text-xs text-slate-500">{it.meta}</span>}
                  </span>
                  {href && <LuChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />}
                </>
              );
              const pid = typeof it.programId === "string" && /^[a-z0-9-]{1,100}$/.test(it.programId) ? it.programId : null;
              return (
                <li key={i} className={cn(pid && "flex items-center gap-1 pr-2")}>
                  {href ? (
                    <Link href={href} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 hover:bg-primary-50">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">{body}</div>
                  )}
                  {pid && (
                    <span className="flex shrink-0 items-center gap-1" aria-label={`Thao tác với ${it.title}`} role="group">
                      <SaveButton id={pid} />
                      <ChatCompareButton id={pid} name={it.title} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {answer.note && (
          <p className="mt-2 flex gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs text-slate-700">
            <LuInfo className="mt-0.5 size-3.5 shrink-0 text-accent-700" aria-hidden />
            <span>{answer.note}</span>
          </p>
        )}

        {sources.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Nguồn & xem thêm</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {sources.map((s, i) => (
                <li key={i}>
                  {s.external ? (
                    <a href={s.href!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-primary-700 hover:bg-primary-50">
                      {s.label}
                      <LuExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">(mở tab mới)</span>
                    </a>
                  ) : (
                    <Link href={s.href!} className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-primary-700 hover:bg-primary-50">
                      {s.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 pl-1 text-xs text-slate-500">
        {feedback === undefined ? (
          <>
            <span className="mr-1">Câu trả lời có ích?</span>
            <button type="button" onClick={() => onFeedback(true)} className="flex size-7 items-center justify-center rounded-md hover:bg-slate-100" aria-label="Có ích">
              <LuThumbsUp className="size-3.5" />
            </button>
            <button type="button" onClick={() => onFeedback(false)} className="flex size-7 items-center justify-center rounded-md hover:bg-slate-100" aria-label="Chưa đúng hoặc chưa có ích">
              <LuThumbsDown className="size-3.5" />
            </button>
          </>
        ) : (
          <span role="status">{feedback ? "Cảm ơn bạn đã đánh giá!" : "Cảm ơn! Quản trị viên sẽ xem lại câu trả lời này."}</span>
        )}
        {answer.polished && <span className="ml-auto">Đã diễn đạt lại · số liệu đã kiểm tra</span>}
      </div>

      {showSuggestions && answer.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {answer.suggestions.slice(0, 3).map((s) => (
            <SuggestionChip key={s} text={s} onPick={onPick} disabled={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Nút nhỏ "Thêm vào so sánh" trong câu trả lời của trợ lý. */
function ChatCompareButton({ id, name }: { id: string; name: string }) {
  const { inCompare, toggleCompare, hydrated } = useTrovio();
  const toast = useToast();
  const active = hydrated && inCompare(id);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Bỏ ${name} khỏi so sánh` : `Thêm ${name} vào so sánh`}
      title={active ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
      onClick={() => {
        const r = toggleCompare(id);
        if (r === "full") toast(`Chỉ so sánh tối đa ${MAX_COMPARE} chương trình.`, "warning");
        else toast(r === "added" ? "Đã thêm vào so sánh" : "Đã bỏ khỏi so sánh", "info");
      }}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        active ? "border-primary-200 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-500 hover:border-primary-200 hover:text-primary-700",
      )}
    >
      {active ? <LuCheck className="size-4" aria-hidden /> : <LuArrowLeftRight className="size-4" aria-hidden />}
    </button>
  );
}
