import type { Metadata } from "next";
import Link from "next/link";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { chatbotService } from "@/services/chatbot.service";
import { isWusRouterConfigured } from "@/services/wusrouter-llm";
import { catalogService } from "@/services";
import { AliasManager } from "@/components/admin/alias-manager";
import { AiSourceManager } from "@/components/admin/ai-source-manager";
import { aiSourceService } from "@/services";
import { StatTile } from "@/components/ui/misc";
import { CHAT_INTENT_LABELS as INTENT_LABELS } from "@/domain/chat-intents";

export const metadata: Metadata = { title: "Giám sát chatbot", robots: { index: false, follow: false } };


const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function AdminChatbotPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await adminPage("/quan-tri/chatbot");
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const [stats, aliases, majors, schools, aiSources, users] = await Promise.all([chatbotService.stats(500), chatbotService.listAliases(), catalogService.listMajors(), catalogService.listSchools(), aiSourceService.list(), chatbotService.adminUsers(search, page)]);
  const rated = stats.positive + stats.negative;
  return (
    <>
      <AdminHeader title="Giám sát trợ lý hỏi đáp" crumb="Chatbot" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">Tổng quan hoạt động và các chủ đề được hỏi nhiều trên chatbot. Nhấn vào người dùng để xem tổng kết sử dụng và lịch sử hội thoại của người đó.</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Thống kê 500 câu hỏi gần nhất">
        <StatTile label="Câu hỏi (gần nhất)" value={stats.total} tone="primary" />
        <StatTile label="Đã trả lời" value={stats.answered} />
        <StatTile label="Từ chối an toàn" value={stats.refused} />
        <StatTile label="Chưa có dữ liệu / hỏi lại" value={stats.unknown} />
        <StatTile label="Đánh giá có ích" value={rated ? `${stats.positive}/${rated}` : "—"} />
        <StatTile label="Bị đánh giá chưa đúng" value={stats.negative} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="contents">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold">Chủ đề được hỏi nhiều</h2>
            <p className="mt-1 text-sm text-slate-500">Tỷ lệ lượt hỏi theo chủ đề trong {stats.total} câu hỏi gần nhất, gồm cả khách chưa đăng nhập.</p>
            {stats.byIntent.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats.byIntent.map(([intent, n]) => (
                  <li key={intent}>
                    <div className="flex justify-between gap-3">
                    <span className="text-slate-700">{INTENT_LABELS[intent] ?? intent}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{n} · {stats.total ? Math.round(n / stats.total * 100) : 0}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-primary-600" style={{ width: `${stats.total ? n / stats.total * 100 : 0}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <h2 className="text-base font-bold text-slate-900">Cơ chế kiểm soát</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Chỉ trả lời từ dữ liệu có cấu trúc; mọi con số kèm năm và nguồn/link kiểm tra.</li>
              <li>Từ chối dự đoán điểm chuẩn, cam kết đỗ, nội dung gian lận.</li>
              <li>Dữ liệu minh hoạ luôn được gắn nhãn “MINH HOẠ”.</li>
              <li>Không đủ dữ liệu → nói rõ “Trovio chưa có…”, không đoán.</li>
              <li>Giới hạn 20 câu/phút và 300 câu/ngày mỗi IP; câu hỏi tối đa 300 ký tự.</li>
            </ul>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              Tra cứu tài liệu ngoài bằng AI: <b>{isWusRouterConfigured() ? "ĐANG BẬT" : "đang tắt"}</b>. Trợ lý chỉ dùng tài liệu ngoài khi website chưa có câu trả lời và hiển thị liên kết nguồn.
            </p>
          </section>
        </div>
      </div>

      <section className="mt-6" aria-labelledby="chat-users-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="chat-users-title" className="text-base font-bold text-slate-900">Lịch sử theo người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">Chỉ gồm hội thoại của tài khoản đã đăng nhập. Khách chưa đăng nhập chỉ lưu lịch sử trên thiết bị của họ.</p>
          </div>
          <form action="/quan-tri/chatbot" role="search" className="flex w-full max-w-sm gap-2">
            <input name="q" type="search" defaultValue={search} placeholder="Tìm tên hoặc email" aria-label="Tìm người dùng" className="h-10 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm" />
            <button type="submit" className="h-10 rounded bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800">Tìm</button>
          </form>
        </div>
        <div className="mt-3 overflow-x-auto border-y border-slate-200 bg-white">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500"><tr>
              <th scope="col" className="px-3 py-3 font-medium">Người dùng</th>
              <th scope="col" className="px-3 py-3 font-medium">Hội thoại</th>
              <th scope="col" className="px-3 py-3 font-medium">Lượt hỏi</th>
              <th scope="col" className="px-3 py-3 font-medium">Gần nhất</th>
              <th scope="col" className="px-3 py-3 font-medium">Chi tiết</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.rows.map((user) => <tr key={user.userId}>
                <td className="px-3 py-3"><Link href={`/quan-tri/chatbot/nguoi-dung/${encodeURIComponent(user.userId)}`} className="block rounded font-semibold text-slate-900 hover:text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-700"><span className="block">{user.name}</span><span className="text-xs font-normal text-slate-500">{user.email}</span></Link></td>
                <td className="px-3 py-3 tabular-nums">{user.conversationCount}</td>
                <td className="px-3 py-3 tabular-nums">{user.questionCount}</td>
                <td className="px-3 py-3 whitespace-nowrap text-slate-600">{fmt(user.lastActiveAt)}</td>
                <td className="px-3 py-3"><Link href={`/quan-tri/chatbot/nguoi-dung/${encodeURIComponent(user.userId)}`} className="font-semibold text-primary-700 hover:underline">Xem lịch sử</Link></td>
              </tr>)}
            </tbody>
          </table>
          {users.rows.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">{search ? "Không tìm thấy người dùng có lịch sử chat." : "Chưa có tài khoản nào lưu lịch sử chat."}</p>}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>{users.total} người dùng có lịch sử</span>
          <div className="flex gap-3">
            {page > 1 && <Link href={`/quan-tri/chatbot?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page - 1) })}`} className="font-semibold text-primary-700 hover:underline">Trước</Link>}
            {page * 30 < users.total && <Link href={`/quan-tri/chatbot?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page + 1) })}`} className="font-semibold text-primary-700 hover:underline">Sau</Link>}
          </div>
        </div>
      </section>

      <div className="mt-6">
        <AliasManager
          aliases={aliases.map((a) => ({ id: a.id, label: a.label, kind: a.kind, targetId: a.targetId, targetName: a.targetName }))}
          majors={majors.map(({ major: m }) => ({ id: m.id, name: m.name }))}
          schools={schools.map((s) => ({ id: s.id, name: s.shortName }))}
        />
      </div>

      <div className="mt-6">
        <AiSourceManager sources={aiSources} />
      </div>

      </AdminBody>
    </>
  );
}
