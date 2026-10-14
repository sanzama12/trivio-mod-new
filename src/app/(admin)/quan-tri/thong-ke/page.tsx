import type { Metadata } from "next";
import Link from "next/link";
import { LuDownload, LuExternalLink, LuMessageCircle, LuShieldCheck } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { analyticsService, FUNNEL_LABELS } from "@/services/analytics.service";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Thống kê & khảo sát", robots: { index: false, follow: false } };

const RANGES = [7, 30, 90] as const;
const fmtDay = (iso: string) => iso.slice(5).split("-").reverse().join("/");
const pct = (v: number) => `${v.toLocaleString("vi-VN")}%`;

export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<{ ngay?: string }> }) {
  await adminPage("/quan-tri/thong-ke");
  const { ngay } = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(ngay)) ? Number(ngay) : 30;
  const [funnel, sus] = await Promise.all([analyticsService.report(days), analyticsService.surveyReport()]);
  const recent = [...funnel.daily].reverse().slice(0, 14);

  return (
    <>
      <AdminHeader title="Thống kê hành vi & khảo sát người dùng" crumb="Thống kê & khảo sát" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Phễu đếm số trình duyệt (ẩn danh) thực hiện từng bước — cho biết người dùng rơi ở đâu trong hành trình. Điểm SUS lấy từ phiếu khảo sát sau buổi test người dùng thật.
      </p>

      <section aria-labelledby="funnel-h" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="funnel-h" className="text-lg font-bold text-slate-900">
              Phễu hành vi
            </h2>
            <p className="text-[13px] text-slate-500">
              Từ {fmtDay(funnel.from)} đến {fmtDay(funnel.to)} · mỗi trình duyệt tính tối đa 1 lần mỗi bước
            </p>
          </div>
          <nav aria-label="Khoảng thời gian" className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/quan-tri/thong-ke?ngay=${r}`}
                aria-current={r === days ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", r === days ? "bg-white text-primary-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                {r} ngày
              </Link>
            ))}
          </nav>
        </div>

        <Card className="mt-4 p-5">
          {funnel.steps[0].users === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này. Số liệu bắt đầu ghi nhận khi có người truy cập trang (trình duyệt không bật “Do Not Track”).</p>
          ) : (
            <ol className="space-y-3">
              {funnel.steps.map((s, i) => (
                <li key={s.event} className="grid gap-1 sm:grid-cols-[180px_1fr_150px] sm:items-center sm:gap-4">
                  <span className="text-sm font-semibold text-slate-800">
                    {i + 1}. {s.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                      <span className="block h-full rounded-md bg-primary-600" style={{ width: `${Math.max(s.ofVisit, 1)}%` }} />
                    </span>
                    <strong className="w-16 text-right text-sm text-slate-900 tabular-nums">{s.users.toLocaleString("vi-VN")}</strong>
                  </span>
                  <span className="text-[13px] text-slate-600">
                    {i === 0 ? (
                      "100% lượt vào"
                    ) : (
                      <>
                        {pct(s.ofVisit)} lượt vào · <span className={cn(s.fromPrev < 30 ? "font-semibold text-danger-700" : "")}>{pct(s.fromPrev)} so với bước trước</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <LuMessageCircle className="size-4 text-primary-600" aria-hidden />
            <span>
              {FUNNEL_LABELS.chat_asked}: <strong className="text-slate-900">{funnel.chat.toLocaleString("vi-VN")}</strong> trình duyệt
              {funnel.steps[0].users > 0 && ` (${pct(Math.round((funnel.chat / funnel.steps[0].users) * 1000) / 10)} lượt vào)`}
            </span>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <span>
              Tỉ lệ làm hết trắc nghiệm:{" "}
              <strong className="text-slate-900">{funnel.quiz.rate == null ? "—" : pct(funnel.quiz.rate)}</strong> ({funnel.quiz.done.toLocaleString("vi-VN")}/{funnel.quiz.started.toLocaleString("vi-VN")} trình duyệt bắt đầu)
            </span>
            <span>
              {FUNNEL_LABELS.style_done}: <strong className="text-slate-900">{funnel.style.toLocaleString("vi-VN")}</strong>
            </span>
            <span>
              {FUNNEL_LABELS.mbti_added}: <strong className="text-slate-900">{funnel.mbti.toLocaleString("vi-VN")}</strong>
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Các bước không bắt buộc theo thứ tự (có người lưu chương trình mà không làm trắc nghiệm). Tỉ lệ “so với bước trước” dưới 30% được tô đỏ — nên xem lại giao diện của bước đó.
          </p>
        </Card>

        {recent.length > 0 && (
          <details className="mt-4 rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-800">Chi tiết theo ngày (14 ngày gần nhất có dữ liệu)</summary>
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Số trình duyệt thực hiện mỗi bước theo ngày</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Ngày
                    </th>
                    {funnel.steps.map((s) => (
                      <th key={s.event} scope="col" className="py-2 pr-3 text-right font-semibold">
                        {s.label}
                      </th>
                    ))}
                    <th scope="col" className="py-2 text-right font-semibold">
                      {FUNNEL_LABELS.chat_asked}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr key={d.day} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-700">
                        {fmtDay(d.day)}
                      </th>
                      {funnel.steps.map((s) => (
                        <td key={s.event} className="py-2 pr-3 text-right tabular-nums">
                          {d.counts[s.event]}
                        </td>
                      ))}
                      <td className="py-2 text-right tabular-nums">{d.counts.chat_asked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-700" aria-hidden />
          Chỉ lưu ngày, tên bước và một mã ngẫu nhiên do trình duyệt tạo; không lưu IP, tài khoản, nội dung hay đường dẫn. Dữ liệu tự xoá sau 180 ngày. Người dùng có thể tắt ở trang Chính sách quyền riêng tư.
        </p>
      </section>

      <section aria-labelledby="sus-h" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sus-h" className="text-lg font-bold text-slate-900">
              Khảo sát SUS (System Usability Scale)
            </h2>
            <p className="text-[13px] text-slate-500">10 câu chuẩn, thang 1–5, quy đổi 0–100. Mốc trung bình ngành là 68 điểm.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/khao-sat" target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-600 bg-white px-3.5 text-[13px] font-semibold text-primary-700 hover:bg-primary-50">
              <LuExternalLink className="size-4" aria-hidden /> Mở phiếu khảo sát
              <span className="sr-only"> (mở tab mới)</span>
            </Link>
            {sus.n > 0 && (
              <a href="/api/admin/survey/export" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-50 px-3.5 text-[13px] font-semibold text-primary-700 hover:bg-primary-100">
                <LuDownload className="size-4" aria-hidden /> Tải CSV
              </a>
            )}
          </div>
        </div>

        {sus.n === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-slate-500">
            Chưa có phiếu nào. Sau mỗi buổi test, mời người tham gia điền phiếu tại <strong className="text-slate-700">/khao-sat</strong> (5–8 người mỗi vòng là đủ phát hiện phần lớn vấn đề).
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card className="p-5 text-center">
              <p className="text-sm text-slate-500">Điểm SUS trung bình</p>
              <p className="mt-1 text-5xl font-extrabold text-slate-900">{sus.mean?.toLocaleString("vi-VN")}</p>
              <p className={cn("mt-1 font-bold", (sus.mean ?? 0) >= 68 ? "text-success-700" : "text-danger-700")}>{sus.grade}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Số phiếu</dt>
                  <dd className="font-bold text-slate-900">{sus.n}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Trung vị</dt>
                  <dd className="font-bold text-slate-900">{sus.median?.toLocaleString("vi-VN")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Độ lệch chuẩn</dt>
                  <dd className="font-bold text-slate-900">{sus.sd != null ? sus.sd.toLocaleString("vi-VN") : "—"}</dd>
                </div>
              </dl>
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-left text-[13px]">
                {sus.byRole
                  .filter((r) => r.n > 0)
                  .map((r) => (
                    <li key={r.role} className="flex justify-between gap-2">
                      <span className="text-slate-600">
                        {r.role} ({r.n})
                      </span>
                      <strong className="text-slate-900">{r.mean?.toLocaleString("vi-VN")}</strong>
                    </li>
                  ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900">Điểm trung bình từng câu (1–5)</h3>
              <p className="text-xs text-slate-500">Câu lẻ: càng cao càng tốt. Câu chẵn (phát biểu tiêu cực): càng thấp càng tốt.</p>
              <ol className="mt-3 space-y-2">
                {sus.perQuestion.map((q, i) => {
                  const good = q.mean == null ? null : i % 2 === 0 ? q.mean >= 3.5 : q.mean <= 2.5;
                  return (
                    <li key={i} className="grid grid-cols-[1fr_52px] items-start gap-3 text-[13px]">
                      <span className="text-slate-700">
                        <span className="font-semibold text-slate-900">{i + 1}.</span> {q.q}
                      </span>
                      <span className={cn("text-right font-bold tabular-nums", good === false ? "text-danger-700" : "text-slate-900")}>
                        {q.mean?.toLocaleString("vi-VN", { minimumFractionDigits: 2 }) ?? "—"}
                        {good === false && <span className="sr-only"> (cần cải thiện)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </div>
        )}

        {sus.comments.length > 0 && (
          <Card className="mt-4 p-5">
            <h3 className="text-sm font-bold text-slate-900">Góp ý gần đây</h3>
            <ul className="mt-3 divide-y divide-slate-100">
              {sus.comments.map((c) => (
                <li key={c.at} className="py-2.5 text-sm">
                  <p className="whitespace-pre-line text-slate-700">{c.comment}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(c.at).toLocaleDateString("vi-VN")} · SUS {c.score.toLocaleString("vi-VN")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
      </AdminBody>
    </>
  );
}
