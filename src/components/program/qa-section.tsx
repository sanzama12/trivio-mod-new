"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LuMessageCircleQuestion, LuSend, LuShieldCheck } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";

interface Answer {
  id: string;
  displayName: string;
  schoolDomain: string;
  text: string;
  createdAt: string;
  helpful: number;
  votedHelpful?: boolean;
  reported?: boolean;
}
interface Question {
  id: string;
  text: string;
  createdAt: string;
  demo: boolean;
  mine: boolean;
  status: "pending" | "approved" | "rejected";
  answers: Answer[];
}
interface QaState {
  items: Question[];
  canAnswer: boolean;
  domain: string | null;
  loggedIn: boolean;
}

const QA_MIN = 10;
const QA_MAX = 300;
const ANSWER_MIN = 20;
const ANSWER_MAX = 800;
const dateVi = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
/** "2 ngày trước" — chỉ gọi ở client (dữ liệu tải sau khi trang hiển thị). */
function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return mins <= 1 ? "vừa xong" : `${mins} phút trước`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  return d <= 30 ? `${d} ngày trước` : dateVi(iso);
}

/** Hỏi sinh viên đang học (bản gọn): hỏi ẩn danh, chỉ email trường được trả lời, mọi nội dung qua kiểm duyệt. */
export function QaSection({ programId, schoolName }: { programId: string; schoolName: string }) {
  const toast = useToast();
  const [data, setData] = useState<QaState | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/qa?programId=${encodeURIComponent(programId)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setData({ items: json.items, canAnswer: json.canAnswer, domain: json.domain, loggedIn: json.loggedIn });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (t.length < QA_MIN) return setError(`Câu hỏi cần ít nhất ${QA_MIN} ký tự.`);
    setSending(true);
    setError(null);
    const res = await fetch("/api/qa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programId, text: t }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(json?.message ?? "Không gửi được câu hỏi. Thử lại sau nhé.");
    setText("");
    toast("Đã gửi câu hỏi. Câu hỏi sẽ hiện sau khi được kiểm duyệt.", "success");
    void load();
  }

  const domain = data?.domain ?? "tên miền của trường";
  const approved = data?.items.filter((q) => q.status === "approved") ?? [];
  const mine = data?.items.filter((q) => q.mine && q.status === "pending") ?? [];

  return (
    <Card id="hoi-sinh-vien" className="scroll-mt-24 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <LuMessageCircleQuestion className="size-5 text-primary-600" aria-hidden /> Hỏi sinh viên đang học
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Câu trả lời đến từ sinh viên {schoolName} đã xác thực bằng email <strong className="text-slate-700">@{domain}</strong> · mọi nội dung được kiểm duyệt trước khi hiện.
          </p>
        </div>
        <Button size="sm" className="shrink-0 self-start" onClick={() => document.getElementById("qa-text")?.focus()}>
          Đặt câu hỏi
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {!data && !failed && <p className="text-sm text-slate-500">Đang tải câu hỏi…</p>}
        {failed && (
          <p className="text-sm text-danger-700">
            Không tải được hỏi đáp.{" "}
            <button type="button" className="font-semibold underline" onClick={() => void load()}>
              Thử lại
            </button>
          </p>
        )}
        {data && approved.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Chưa có câu hỏi nào cho chương trình này. Hãy là người hỏi đầu tiên.</p>
        )}
        {approved.map((q) => (
          <QuestionItem key={q.id} q={q} canAnswer={!!data?.canAnswer} loggedIn={!!data?.loggedIn} onAnswered={load} />
        ))}
        {mine.map((q) => (
          <div key={q.id} className="rounded-xl border border-dashed border-slate-300 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Đang chờ duyệt</Badge>
              <span className="text-xs text-slate-500">Chỉ bạn thấy câu hỏi này · {dateVi(q.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-800">{q.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={ask} className="mt-6 rounded-xl bg-slate-50 p-4" noValidate>
        <label htmlFor="qa-text" className="text-sm font-semibold text-slate-800">
          Đặt câu hỏi cho sinh viên
        </label>
        <textarea
          id="qa-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, QA_MAX))}
          rows={3}
          maxLength={QA_MAX}
          aria-invalid={!!error || undefined}
          aria-describedby="qa-hint"
          placeholder="VD: Năm nhất học có nặng không? Có nhiều cơ hội thực tập không?"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p id="qa-hint" className="text-xs text-slate-500">
            Câu hỏi hiện ẩn danh. Không ghi số điện thoại, email hay link (hệ thống sẽ tự che). {text.length}/{QA_MAX}
          </p>
          <Button type="submit" size="sm" disabled={sending}>
            <LuSend className="size-4" aria-hidden /> {sending ? "Đang gửi…" : "Gửi câu hỏi"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-danger-700">
            {error}
          </p>
        )}
      </form>

      {data && !data.canAnswer && (
        <p className="mt-3 text-xs text-slate-500">
          Bạn là sinh viên của trường?{" "}
          {data.loggedIn ? (
            <>Đăng ký tài khoản bằng email @{domain} để trả lời.</>
          ) : (
            <>
              <Link href="/dang-ky" className="font-semibold text-primary-700 hover:underline">
                Đăng ký bằng email @{domain}
              </Link>{" "}
              để trả lời câu hỏi.
            </>
          )}
        </p>
      )}
    </Card>
  );
}

function QuestionItem({ q, canAnswer, loggedIn, onAnswered }: { q: Question; canAnswer: boolean; loggedIn: boolean; onAnswered: () => void }) {
  const toast = useToast();
  const [votes, setVotes] = useState<Record<string, { helpful: number; voted: boolean; reported: boolean }>>({});

  async function vote(a: Answer, action: "helpful" | "report") {
    if (!loggedIn) return toast("Đăng nhập để đánh giá câu trả lời.", "info");
    const res = await fetch(`/api/qa/${encodeURIComponent(q.id)}/answers/${encodeURIComponent(a.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) return toast(json?.message ?? "Không gửi được.", "warning");
    const cur = votes[a.id] ?? { helpful: a.helpful, voted: !!a.votedHelpful, reported: !!a.reported };
    if (action === "helpful") setVotes({ ...votes, [a.id]: { ...cur, helpful: json.helpful, voted: json.votedHelpful } });
    else {
      setVotes({ ...votes, [a.id]: { ...cur, reported: true } });
      toast(json.hidden ? "Câu trả lời đã được ẩn để kiểm duyệt lại. Cảm ơn bạn!" : "Đã báo cáo — kiểm duyệt viên sẽ xem lại.", "info");
      if (json.hidden) onAnswered();
    }
  }
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (t.length < ANSWER_MIN) return setError(`Câu trả lời cần ít nhất ${ANSWER_MIN} ký tự.`);
    setSending(true);
    setError(null);
    const res = await fetch(`/api/qa/${encodeURIComponent(q.id)}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(json?.message ?? "Không gửi được câu trả lời.");
    setText("");
    setOpen(false);
    toast("Cảm ơn bạn! Câu trả lời sẽ hiện sau khi được duyệt.", "success");
    onAnswered();
  }

  return (
    <article className="rounded-xl bg-slate-50 p-4">
      <p className="font-semibold text-slate-900">{q.text}</p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        Học sinh lớp 12 · ẩn danh · {ago(q.createdAt)}
        {q.demo && <Badge tone="slate">Minh hoạ</Badge>}
      </p>
      {q.answers.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {q.answers.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg bg-white p-3">
              <Avatar name={a.displayName} className="size-8 bg-success-100! text-xs text-success-700!" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{a.displayName}</span>
                  <Badge tone="success" title={`Đã xác thực bằng email @${a.schoolDomain}`}>
                    <LuShieldCheck className="size-3.5" aria-hidden /> SV · đã xác thực
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-700">{a.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                  <span>@{a.schoolDomain}</span>
                  <span aria-hidden>·</span>
                  {(() => {
                    const v = votes[a.id] ?? { helpful: a.helpful, voted: !!a.votedHelpful, reported: !!a.reported };
                    return (
                      <>
                        <button type="button" onClick={() => vote(a, "helpful")} aria-pressed={v.voted} className={v.voted ? "font-semibold text-primary-700" : "hover:text-primary-700 hover:underline"}>
                          Hữu ích ({v.helpful})
                        </button>
                        <span aria-hidden>·</span>
                        {v.reported ? (
                          <span>Đã báo cáo</span>
                        ) : (
                          <button type="button" onClick={() => vote(a, "report")} className="hover:text-danger-700 hover:underline">
                            Báo cáo
                          </button>
                        )}
                      </>
                    );
                  })()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-slate-500">Chưa có sinh viên trả lời.</p>
      )}
      {canAnswer &&
        (open ? (
          <form onSubmit={submit} className="mt-3" noValidate>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX))}
              rows={3}
              aria-label="Câu trả lời của bạn"
              placeholder="Chia sẻ trải nghiệm thật của bạn (tối thiểu 20 ký tự)"
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-1 text-[13px] font-medium text-danger-700">
                {error}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <Button type="submit" size="sm" disabled={sending}>
                {sending ? "Đang gửi…" : "Gửi trả lời"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
            Trả lời với tư cách sinh viên
          </Button>
        ))}
    </article>
  );
}
