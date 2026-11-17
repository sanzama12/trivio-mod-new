"use client";

/**
 * Khung chat "Trợ lý ngành học" (nút nổi góc phải dưới).
 *
 * - Câu trả lời do server soạn từ dữ liệu có cấu trúc của Trovio (xem services/chatbot.service.ts), luôn kèm nguồn.
 * - Client chỉ hiển thị; link được lọc lại bằng safeChatHref (chỉ "/…" hoặc https).
 * - Hội thoại chỉ giữ trong bộ nhớ trang (không lưu trình duyệt); server lưu nhật ký đã che email/số điện thoại.
 */
import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  LuArrowLeftRight,
  LuCheck,
  LuBotMessageSquare,
  LuChevronRight,
  LuExternalLink,
  LuHistory,
  LuInfo,
  LuLoaderCircle,
  LuRotateCcw,
  LuSendHorizontal,
  LuThumbsDown,
  LuThumbsUp,
  LuTriangleAlert,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { MAX_QUESTION, safeChatHref, type ChatAnswer, type ChatConversationView, type ChatHistoryMessage } from "@/domain/chat";
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
const GUEST_HISTORY_KEY = "trovio:chat-history:v1";
const HIDDEN_ON: string[] = ["/trac-nghiem/lam-bai"];
const STARTERS = ["Giới thiệu ngành Marketing", "Điểm chuẩn ngành Công nghệ thông tin", "Học phí ngành Kế toán", "Tôi nên học ngành gì?"];
/** Sự kiện để nơi khác mở khung chat, VD: window.dispatchEvent(new CustomEvent("trovio:open-chat", { detail: "Câu hỏi" })). */
export const OPEN_CHAT_EVENT = "trovio:open-chat";

let seq = 0;
const nextId = () => `m${++seq}`;

function readGuestHistory(): ChatConversationView[] {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((item): item is ChatConversationView => !!item && typeof item === "object" && typeof (item as ChatConversationView).id === "string").slice(0, 20) : [];
  } catch { return []; }
}

function writeGuestHistory(items: ChatConversationView[]) {
  try { localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(items.slice(0, 20))); } catch { /* storage unavailable */ }
}

function historyToMessages(conversation: ChatConversationView): Msg[] {
  return conversation.messages.flatMap((message): Msg[] => {
    if (message.role === "user" && typeof message.text === "string") return [{ id: message.id, role: "user", text: message.text }];
    if (message.role === "assistant" && message.answer) return [{ id: message.id, role: "bot", answer: message.answer, logId: message.logId ?? null }];
    return [];
  });
}

export function ChatWidget() {
  const { user } = useTrovio();
  const pathname = usePathname();
  const compareVisible = useCompareBarVisible();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<ChatAnswer["context"]>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ChatConversationView[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  // Sang trang ngành/trường khác → bỏ ngữ cảnh hội thoại cũ để server dùng ngữ cảnh của trang đang xem.
  useEffect(() => {
    if (/^\/(nganh|truong|chuong-trinh)\/[^/]+/.test(pathname)) setCtx({});
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    if (!user) {
      setHistory(readGuestHistory());
      setHistoryLoading(false);
      return;
    }
    const response = await fetch("/api/chat", { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setHistory(response?.ok && Array.isArray(data?.items) ? data.items : []);
    setHistoryLoading(false);
  }, [user]);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.replace(/\s+/g, " ").trim();
      if (question.length < 2 || busy) return;
      if (question.length > MAX_QUESTION) {
        push({ id: nextId(), role: "error", text: `Câu hỏi tối đa ${MAX_QUESTION} ký tự.` });
        return;
      }
      const userMessage: Msg = { id: nextId(), role: "user", text: question };
      const requestedConversationId = conversationId ?? (user ? null : crypto.randomUUID());
      if (requestedConversationId) setConversationId(requestedConversationId);
      push(userMessage);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: question, context: { ...ctx, page: pathname }, conversationId: requestedConversationId }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; answer?: ChatAnswer; logId?: string; conversationId?: string | null; message?: string } | null;
        if (res.ok && data?.ok && data.answer) {
          const botMessage: Msg = { id: nextId(), role: "bot", answer: data.answer, logId: data.logId ?? null };
          push(botMessage);
          const resolvedId = data.conversationId ?? requestedConversationId;
          if (resolvedId) setConversationId(resolvedId);
          if (!user && resolvedId) {
            const now = new Date().toISOString();
            const historyMessages: ChatHistoryMessage[] = [...messages, userMessage, botMessage].flatMap((message): ChatHistoryMessage[] =>
              message.role === "user"
                ? [{ id: message.id, role: "user", at: now, text: message.text }]
                : message.role === "bot"
                  ? [{ id: message.id, role: "assistant", at: now, answer: message.answer, logId: message.logId }]
                  : [],
            ).slice(-MAX_MESSAGES);
            const existing = readGuestHistory();
            const previous = existing.find((item) => item.id === resolvedId);
            writeGuestHistory([{ id: resolvedId, title: previous?.title ?? question.slice(0, 80), createdAt: previous?.createdAt ?? now, updatedAt: now, messages: historyMessages }, ...existing.filter((item) => item.id !== resolvedId)]);
          }
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
    [busy, conversationId, ctx, messages, pathname, user],
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
    setConversationId(null);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) await loadHistory();
  };

  const selectHistory = (conversation: ChatConversationView) => {
    const restored = historyToMessages(conversation);
    setConversationId(conversation.id);
    setMessages(restored);
    const lastAnswer = [...restored].reverse().find((message) => message.role === "bot");
    setCtx(lastAnswer?.role === "bot" ? lastAnswer.answer.context : {});
    setHistoryOpen(false);
  };

  const deleteHistory = async (id: string) => {
    if (user) await fetch(`/api/chat?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    else writeGuestHistory(readGuestHistory().filter((item) => item.id !== id));
    if (conversationId === id) reset();
    await loadHistory();
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
          className={cn(buttonClass({ className: "fixed right-4 z-30 h-12 gap-2 rounded-lg px-4 text-[15px] shadow-elevated md:right-6" }), compareVisible ? "bottom-24" : "bottom-4 md:bottom-6")}
          title="Mở trợ lý AI"
        >
          <LuBotMessageSquare className="size-5" aria-hidden />
          <span>Hỏi trợ lý AI</span>
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
            "fixed inset-x-0 z-40 flex flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-elevated sm:inset-x-auto sm:right-4 sm:w-[min(460px,calc(100vw-2rem))] sm:rounded-lg md:right-6",
            compareVisible ? "bottom-24 h-[min(700px,calc(100dvh-7rem))]" : "bottom-0 h-[min(700px,calc(100dvh-0.5rem))] sm:bottom-4 sm:h-[min(700px,calc(100dvh-2rem))] md:bottom-6",
          )}
        >
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white">
              <LuBotMessageSquare className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-bold text-slate-950">
                Trợ lý TriOVO
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="size-1.5 rounded-full bg-success-600" aria-hidden />
                Ưu tiên dữ liệu tuyển sinh TriOVO
              </p>
            </div>
            <button type="button" onClick={() => void openHistory()} aria-pressed={historyOpen} className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100", historyOpen && "bg-primary-50 text-primary-700")} aria-label="Xem lịch sử trò chuyện" title="Lịch sử trò chuyện">
              <LuHistory className="size-4.5" />
            </button>
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label="Bắt đầu cuộc trò chuyện mới" title="Cuộc trò chuyện mới">
                <LuRotateCcw className="size-4.5" />
              </button>
            )}
            <button type="button" onClick={close} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label="Đóng trợ lý" title="Đóng trợ lý">
              <LuX className="size-4.5" />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-paper-50/70 px-4 py-5" role="log" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
            {historyOpen ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div><h3 className="text-base font-bold text-slate-950">Lịch sử trò chuyện</h3><p className="text-xs text-slate-600">{user ? "Đồng bộ theo tài khoản" : "Lưu trên trình duyệt này"}</p></div>
                  <button type="button" onClick={reset} className={buttonClass({ size: "sm" })}>Cuộc trò chuyện mới</button>
                </div>
                {historyLoading ? <p className="py-8 text-center text-sm text-slate-600">Đang tải lịch sử…</p> : history.length ? <ul className="space-y-2">
                  {history.map((conversation) => <li key={conversation.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                    <button type="button" onClick={() => selectHistory(conversation)} className="min-w-0 flex-1 rounded-md px-2 py-1 text-left hover:bg-primary-50"><span className="block truncate text-[15px] font-semibold text-slate-900">{conversation.title}</span><span className="text-xs text-slate-600">{new Date(conversation.updatedAt).toLocaleString("vi-VN")} · {Math.ceil(conversation.messages.length / 2)} lượt hỏi</span></button>
                    <button type="button" onClick={() => void deleteHistory(conversation.id)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-danger-700 hover:bg-danger-50" aria-label={`Xóa hội thoại ${conversation.title}`} title="Xóa hội thoại"><LuTrash2 className="size-4" /></button>
                  </li>)}
                </ul> : <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><LuHistory className="mx-auto size-8 text-slate-600" /><p className="mt-2 text-sm font-semibold text-slate-700">Chưa có lịch sử trò chuyện</p></div>}
              </div>
            ) : <>
            {messages.length === 0 && (
              <div className="py-3">
                <span className="flex size-10 items-center justify-center rounded-md border border-primary-200 bg-primary-50 text-primary-700"><LuBotMessageSquare className="size-5" aria-hidden /></span>
                <h3 className="mt-4 text-lg font-bold text-slate-950">Bạn muốn tìm hiểu điều gì?</h3>
                <div className="mt-4 grid gap-2">
                  {STARTERS.map((s) => (
                    <SuggestionChip key={s} text={s} onPick={send} disabled={busy} />
                  ))}
                </div>
                <p className="mt-5 flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
                  <LuInfo className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Kiểm tra nguồn chính thức trước khi quyết định tuyển sinh.
                </p>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[88%] break-words rounded-lg rounded-br-sm bg-primary-700 px-3.5 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-white">{m.text}</p>
                </div>
              ) : m.role === "error" ? (
                <p key={m.id} role="alert" className="flex gap-2 rounded-md border border-danger-100 bg-danger-50 px-3 py-2.5 text-[15px] leading-6 text-danger-700">
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
              <div role="status" className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-primary-700"><LuLoaderCircle className="size-4 animate-spin" aria-hidden /></span>
                Đang tra cứu và đối chiếu nguồn…
              </div>
            )}
            </>}
          </div>

          {!historyOpen && <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                placeholder="Nhập câu hỏi của bạn…"
                className="max-h-28 min-h-12 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length < 2}
                className={buttonClass({ size: "icon", className: "size-12 rounded-md sm:size-12" })}
                aria-label="Gửi câu hỏi"
                title="Gửi câu hỏi"
              >
                <LuSendHorizontal className="size-5" />
              </button>
            </div>
            <p className="mt-1.5 h-4 text-right text-xs text-slate-500" aria-live="off">{input.length > 0 ? `${input.length}/${MAX_QUESTION}` : ""}</p>
          </form>}
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
      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[13px] font-medium leading-5 text-slate-800 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50"
    >
      <span>{text}</span><LuChevronRight className="size-4 shrink-0 text-primary-700" aria-hidden />
    </button>
  );
}

const KIND_STYLE: Record<ChatAnswer["kind"], string> = {
  answer: "border-slate-200 bg-white",
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
    <div className="min-w-0 max-w-[96%]">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <LuBotMessageSquare className="size-3.5 text-primary-700" aria-hidden />
        TriOVO{answer.intent === "external-evidence" ? " · Tài liệu ngoài" : ""}
      </p>
      <div className={cn("break-words rounded-lg rounded-bl-sm border px-4 py-3 text-[15px] leading-6 text-slate-900 shadow-sm", KIND_STYLE[answer.kind] ?? KIND_STYLE.answer)}>
        {answer.kind === "refusal" && <p className="mb-1 text-xs font-semibold text-accent-800">Ngoài phạm vi hỗ trợ</p>}
        <p className="whitespace-pre-wrap">{answer.text}</p>

        {answer.items.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-200">
            {answer.items.map((it, i) => {
              const href = safeChatHref(it.href);
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{it.title}</span>
                    {it.meta && <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">{it.meta}</span>}
                  </span>
                  {href && <LuChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />}
                </>
              );
              const pid = typeof it.programId === "string" && /^[a-z0-9-]{1,100}$/.test(it.programId) ? it.programId : null;
              return (
                <li key={i} className={cn(pid && "flex items-center gap-1 pr-2")}>
                  {href ? (
                    <Link href={href} className="flex min-w-0 flex-1 items-center gap-2 py-2.5 hover:text-primary-700">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5">{body}</div>
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
          <p className="mt-3 flex gap-2 border-l-2 border-accent-500 pl-2.5 text-[13px] leading-5 text-slate-700">
            <LuInfo className="mt-0.5 size-3.5 shrink-0 text-accent-800" aria-hidden />
            <span>{answer.note}</span>
          </p>
        )}

        {sources.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2.5">
            <p className="text-xs font-semibold text-slate-600">Nguồn tham khảo</p>
            <ul className="mt-1.5 grid gap-1.5">
              {sources.map((s, i) => (
                <li key={i}>
                  {s.external ? (
                    <a href={s.href!} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 break-words text-[13px] leading-5 font-medium text-primary-700 hover:underline">
                      {s.label}
                      <LuExternalLink className="mt-1 size-3 shrink-0" aria-hidden />
                      <span className="sr-only">(mở tab mới)</span>
                    </a>
                  ) : (
                    <Link href={s.href!} className="inline-flex items-start break-words text-[13px] leading-5 font-medium text-primary-700 hover:underline">
                      {s.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1 pl-1 text-xs text-slate-600">
        {feedback === undefined ? (
          <>
            <span className="mr-1">Câu trả lời có ích?</span>
            <button type="button" onClick={() => onFeedback(true)} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-md hover:bg-slate-100" aria-label="Có ích">
              <LuThumbsUp className="size-3.5" />
            </button>
            <button type="button" onClick={() => onFeedback(false)} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-md hover:bg-slate-100" aria-label="Chưa đúng hoặc chưa có ích">
              <LuThumbsDown className="size-3.5" />
            </button>
          </>
        ) : (
          <span role="status">{feedback ? "Cảm ơn bạn đã đánh giá!" : "Cảm ơn! Quản trị viên sẽ xem lại câu trả lời này."}</span>
        )}
      </div>

      {showSuggestions && answer.suggestions.length > 0 && (
        <div className="mt-2 grid gap-1.5">
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
        "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-lg border transition-colors",
        active ? "border-primary-200 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-700",
      )}
    >
      {active ? <LuCheck className="size-4" aria-hidden /> : <LuArrowLeftRight className="size-4" aria-hidden />}
    </button>
  );
}
