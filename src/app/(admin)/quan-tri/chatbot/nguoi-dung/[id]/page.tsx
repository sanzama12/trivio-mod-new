import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { safeChatHref } from "@/domain/chat";
import { repositories } from "@database/repositories";
import { chatbotService } from "@/services/chatbot.service";

export const metadata: Metadata = { title: "Lịch sử chatbot theo người dùng", robots: { index: false, follow: false } };

const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function ChatUserHistoryPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const path = `/quan-tri/chatbot/nguoi-dung/${encodeURIComponent(id)}`;
  await adminPage(path);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(pageParam ?? "1", 10) || 1));
  const user = await repositories.users.findById(id);
  if (!user) notFound();
  const conversations = await chatbotService.adminHistory(id, page);
  const hasNext = conversations.length > 10;

  return <>
    <AdminHeader title={`Lịch sử chatbot: ${user.name}`} crumb="Chatbot / Người dùng" />
    <AdminBody>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/quan-tri/chatbot" className="font-semibold text-primary-700 hover:underline">← Tất cả người dùng</Link>
        <span className="break-all text-slate-600">{user.email}</span>
      </div>
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
