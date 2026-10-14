import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import type { ChatLog } from "@/domain/types";
import { chatbotService } from "@/services/chatbot.service";
import { llmEnabled } from "@/services/chatbot-llm";
import { catalogService } from "@/services";
import { AliasManager } from "@/components/admin/alias-manager";
import { StatTile } from "@/components/ui/misc";
import { Badge, type BadgeTone } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Giám sát chatbot", robots: { index: false, follow: false } };

const KIND: Record<ChatLog["kind"], { label: string; tone: BadgeTone }> = {
  answer: { label: "Trả lời", tone: "success" },
  refusal: { label: "Từ chối", tone: "accent" },
  clarify: { label: "Hỏi lại", tone: "primary" },
  unknown: { label: "Chưa có dữ liệu", tone: "slate" },
};

const INTENT_LABELS: Record<string, string> = {
  cheat: "Gian lận (từ chối)",
  predict: "Dự đoán / cam kết đỗ (từ chối)",
  thanks: "Cảm ơn",
  help: "Chào hỏi / hướng dẫn",
  "rules-priority": "Quy chế: điểm ưu tiên",
  "rules-wishlist": "Quy chế: nguyện vọng",
  timeline: "Mốc tuyển sinh",
  recommend: "Gợi ý ngành",
  methods: "Phương thức xét tuyển",
  "methods-schools": "Trường theo phương thức",
  cutoff: "Điểm chuẩn",
  tuition: "Học phí",
  salary: "Việc làm & thu nhập",
  "school-info": "Giới thiệu trường",
  evaluate: "Đánh giá ngành (có nên học…)",
  quota: "Chỉ tiêu",
  duration: "Thời gian đào tạo",
  "score-advice": "Có điểm, hỏi trường nào",
  "not-covered": "Chủ đề chưa có dữ liệu",
  reviews: "Cảm nhận sinh viên",
  "major-info": "Giới thiệu ngành",
  fit: "Ngành hợp với ai",
  schools: "Trường đào tạo",
  combos: "Tổ hợp xét tuyển",
  scholarship: "Học bổng",
  compare: "So sánh",
  unknown: "Không nhận diện được",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function AdminChatbotPage() {
  await adminPage("/quan-tri/chatbot");
  const [stats, aliases, majors, schools] = await Promise.all([chatbotService.stats(500), chatbotService.listAliases(), catalogService.listMajors(), catalogService.listSchools()]);
  const rated = stats.positive + stats.negative;
  return (
    <>
      <AdminHeader title="Giám sát trợ lý hỏi đáp" crumb="Chatbot" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Trợ lý trả lời bằng cách truy xuất dữ liệu đã kiểm soát của Trovio (không tự sinh số liệu). Nhật ký chỉ lưu câu hỏi đã che email/số điện thoại, không gắn với tài khoản.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Thống kê 500 câu hỏi gần nhất">
        <StatTile label="Câu hỏi (gần nhất)" value={stats.total} tone="primary" />
        <StatTile label="Đã trả lời" value={stats.answered} />
        <StatTile label="Từ chối an toàn" value={stats.refused} />
        <StatTile label="Chưa có dữ liệu / hỏi lại" value={stats.unknown} />
        <StatTile label="Đánh giá có ích" value={rated ? `${stats.positive}/${rated}` : "—"} />
        <StatTile label="Bị đánh giá chưa đúng" value={stats.negative} />
      </section>

      <div className="mt-6">
        <AliasManager
          aliases={aliases.map((a) => ({ id: a.id, label: a.label, kind: a.kind, targetId: a.targetId, targetName: a.targetName }))}
          majors={majors.map(({ major: m }) => ({ id: m.id, name: m.name }))}
          schools={schools.map((s) => ({ id: s.id, name: s.shortName }))}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold">Cần xem lại ({stats.needsReview.length})</h2>
          <p className="mt-1 text-sm text-slate-500">Câu hỏi chưa có dữ liệu, cần hỏi lại, hoặc người dùng đánh giá “chưa đúng”. Dùng để bổ sung dữ liệu / từ khoá.</p>
          <LogTable logs={stats.needsReview} empty="Chưa có câu hỏi cần xem lại." />
          <h2 className="mt-8 text-base font-bold">20 câu hỏi gần nhất</h2>
          <LogTable logs={stats.recent} empty="Chưa có câu hỏi nào." />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold">Chủ đề được hỏi</h2>
            {stats.byIntent.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats.byIntent.map(([intent, n]) => (
                  <li key={intent} className="flex justify-between gap-3">
                    <span className="text-slate-700">{INTENT_LABELS[intent] ?? intent}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
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
              Lớp diễn đạt bằng mô hình ngôn ngữ: <b>{llmEnabled() ? "ĐANG BẬT" : "đang tắt"}</b>. Khi bật, câu trả lời có con số không nằm trong dữ kiện sẽ bị loại và dùng bản gốc.
            </p>
          </section>
        </aside>
      </div>
      </AdminBody>
    </>
  );
}

function LogTable({ logs, empty }: { logs: ChatLog[]; empty: string }) {
  if (logs.length === 0) return <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">Thời gian</th>
            <th scope="col" className="py-2 pr-3 font-medium">Câu hỏi (đã che thông tin)</th>
            <th scope="col" className="py-2 pr-3 font-medium">Chủ đề</th>
            <th scope="col" className="py-2 pr-3 font-medium">Kết quả</th>
            <th scope="col" className="py-2 font-medium">Đánh giá</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{fmt(l.at)}</td>
              <td className="py-2 pr-3 break-words text-slate-900">{l.question}</td>
              <td className="py-2 pr-3 text-slate-600">{INTENT_LABELS[l.intent] ?? l.intent}</td>
              <td className="py-2 pr-3">
                <Badge tone={KIND[l.kind]?.tone ?? "slate"}>{KIND[l.kind]?.label ?? l.kind}</Badge>
              </td>
              <td className="py-2 text-slate-600">{l.helpful === null ? "—" : l.helpful ? "Có ích" : "Chưa đúng"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
