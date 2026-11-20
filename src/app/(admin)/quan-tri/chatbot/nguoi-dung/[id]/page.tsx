import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { safeChatHref } from "@/domain/chat";

import { chatbotService } from "@/services/chatbot.service";
import { StatTile } from "@/components/ui/misc";
import { CHAT_INTENT_LABELS } from "@/domain/chat-intents";

export const metadata: Metadata = { title: "Lịch sử chatbot theo người dùng", robots: { index: false, follow: false } };

const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function ChatUserHistoryPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const path = `/quan-tri/chatbot/nguoi-dung/${encodeURIComponent(id)}`;
  const actor = await adminPage(path);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(pageParam ?? "1", 10) || 1));
  const user = await chatbotService.adminHistoryUser(actor, id);
  if (!user) notFound();
  const [conversations, summary] = await Promise.all([
    chatbotService.adminHistory(id, page),
    chatbotService.adminUserSummary(id),
  ]);
  const hasNext = conversations.length > 10;

  return <>
    <AdminHeader title={`Lịch sử chatbot: ${user.name}`} crumb="Chatbot / Người dùng" />
    <AdminBody>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/quan-tri/chatbot" className="font-semibold text-primary-700 hover:underline">← Tổng quan chatbot và người dùng</Link>
        <span className="break-all text-slate-600">{user.email}</span>
      </div>
      <section aria-label="Tổng kết sử dụng chatbot" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Hội thoại" value={summary.conversationCount} tone="primary" />
        <StatTile label="Lượt hỏi" value={summary.questionCount} />
        <StatTile label="Đã trả lời" value={summary.answered} />
        <StatTile label="Từ chối an toàn" value={summary.refused} />
        <StatTile label="Chưa có dữ liệu / hỏi lại" value={summary.unknown} />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold">Chủ đề người dùng quan tâm</h2>
        <p className="mt-1 text-sm text-slate-500">Tổng kết toàn bộ lịch sử đã lưu của người dùng này.{summary.lastActiveAt && ` Hoạt động gần nhất: ${fmt(summary.lastActiveAt)}.`}</p>
        {summary.byIntent.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {summary.byIntent.map(([intent, count]) => <li key={intent} className="flex justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
            <span>{CHAT_INTENT_LABELS[intent] ?? intent}</span><span className="shrink-0 font-semibold">{count} lượt</span>
          </li>)}
        </ul> : <p className="mt-3 text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p>}
      </section>
      <h2 className="text-lg font-bold text-slate-900">Lịch sử hội thoại</h2>
      {conversations.length === 0 ? <p className="border-y border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Không có hội thoại ở trang này.</p> : (
        <div className="space-y-8">
          {conversations.slice(0, 10).map((conversation) => <section key={conversation.id} className="border-t border-slate-200 pt-5" aria-label={conversation.title}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="min-w-0 text-base font-bold text-slate-900">{conversation.title}</h2>
              <time dateTime={conversation.updatedAt} className="shrink-0 text-xs text-slate-500">{fmt(conversation.updatedAt)}</time>
            </div>
            <div className="mt-4 space-y-3">
              {conversation.messages.map((message) => <div key={message.id} className={`max-w-3xl border-l-2 pl-3 ${message.role === "user" ? "border-primary-500" : "border-slate-300"}`}>
                <p className="text-xs font-semibold text-slate-600">{message.role === "user" ? "Người dùng" : "Trợ lý"} · {fmt(message.at)}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{message.role === "user" ? message.text : message.answer?.text}</p>
                {message.role === "assistant" && message.answer && <>
                  <p className="mt-1 text-xs text-slate-500">{message.answer.intent} · {message.answer.kind}</p>
                  {message.answer.items.length > 0 && <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100 text-sm">
                    {message.answer.items.map((item, index) => <li key={index} className="py-2">
                      <span className="block font-medium text-slate-900">{item.title}</span>
                      {item.meta && <span className="block text-slate-600">{item.meta}</span>}
                    </li>)}
                  </ul>}
                  {message.answer.note && <p className="mt-2 text-xs leading-5 text-slate-600">{message.answer.note}</p>}
                  {message.answer.sources.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {message.answer.sources.map((source, index) => {
                      const href = safeChatHref(source.href);
                      return href ? <a key={index} href={href} target={source.external ? "_blank" : undefined} rel={source.external ? "noopener noreferrer" : undefined} className="break-all font-medium text-primary-700 hover:underline">{source.label}</a> : null;
                    })}
                  </div>}
                </>}
              </div>)}
            </div>
          </section>)}
        </div>
      )}
      <nav aria-label="Trang lịch sử" className="flex items-center justify-between text-sm">
        {page > 1 ? <Link href={`${path}?page=${page - 1}`} className="font-semibold text-primary-700 hover:underline">Trang trước</Link> : <span />}
        <span className="text-slate-500">Trang {page}</span>
        {hasNext ? <Link href={`${path}?page=${page + 1}`} className="font-semibold text-primary-700 hover:underline">Trang sau</Link> : <span />}
      </nav>
    </AdminBody>
  </>;
}
