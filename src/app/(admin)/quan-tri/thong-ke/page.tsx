import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowUpRight, LuDownload, LuEye, LuHandHeart, LuMousePointerClick, LuSearch, LuUsers } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { analyticsService, dateRange, vnDay } from "@/services/analytics.service";
import { donationService } from "@/services/donation.service";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Thống kê hoạt động", robots: { index: false, follow: false } };

const RANGES = [
  { days: 1, label: "1 ngày" },
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 365, label: "1 năm" },
] as const;
const number = (value: number) => value.toLocaleString("vi-VN");
const money = (value: number) => `${number(Math.round(value))} ₫`;
const fmtDate = (day: string) => new Date(`${day}T00:00:00+07:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

type DailyPoint = { day: string; value: number };

function chartPoints(from: string, to: string, rows: DailyPoint[], annual: boolean): DailyPoint[] {
  const values = new Map(rows.map((row) => [row.day, row.value]));
  const buckets = new Map<string, number>();
  for (let time = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); time <= end; time += 86400_000) {
    const day = new Date(time).toISOString().slice(0, 10);
    const key = annual ? day.slice(0, 7) : day;
    buckets.set(key, (buckets.get(key) ?? 0) + (values.get(day) ?? 0));
  }
  return [...buckets].map(([day, value]) => ({ day, value }));
}

function Metric({ label, value, sub, Icon, tone = "slate" }: {
  label: string; value: string; sub?: string; Icon: typeof LuUsers; tone?: "slate" | "teal";
}) {
  return <div className="min-w-0 border-t border-slate-200 pt-4">
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Icon className={cn("size-4", tone === "teal" ? "text-teal-700" : "text-primary-700")} aria-hidden />{label}</div>
    <p className="mt-2 break-words text-2xl font-bold text-slate-900 tabular-nums sm:text-3xl">{value}</p>
    {sub && <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p>}
  </div>;
}

function Trend({ points, label, annual, tone = "primary" }: { points: DailyPoint[]; label: string; annual: boolean; tone?: "primary" | "teal" }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return <div>
    <p className="mb-3 text-xs font-semibold text-slate-600">{label}</p>
    <div className="flex h-28 items-end gap-1 border-b border-slate-200" role="img" aria-label={`${label}: ${points.map((point) => `${point.day}: ${number(point.value)}`).join(", ")}`}>
      {points.map((point) => <div key={point.day} className="flex h-full min-w-0 flex-1 items-end" title={`${point.day}: ${number(point.value)}`}>
        <span className={cn("block w-full rounded-t-sm", point.value === 0 ? "h-1 bg-slate-200" : tone === "teal" ? "bg-teal-600" : "bg-primary-600")} style={point.value ? { height: `${Math.max(5, point.value / max * 100)}%` } : undefined} />
      </div>)}
    </div>
    <div className="mt-1 flex justify-between text-[11px] text-slate-500">
      <span>{annual ? points[0]?.day : fmtDate(points[0]?.day ?? "")}</span>
      <span>{annual ? points.at(-1)?.day : fmtDate(points.at(-1)?.day ?? "")}</span>
    </div>
  </div>;
}

export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<{ ngay?: string }> }) {
  await adminPage("/quan-tri/thong-ke");
  const { ngay } = await searchParams;
  const days = RANGES.some((range) => range.days === Number(ngay)) ? Number(ngay) : 30;
  const to = vnDay();
  const { from } = dateRange(days, to);
  const [funnel, usage, donations, sus] = await Promise.all([
    analyticsService.report(days, to),
    analyticsService.usageReport(days, to),
    donationService.rangeReport(from, to),
    analyticsService.surveyReport(),
  ]);
  const visits = funnel.steps[0].users;
  const dailyVisits = funnel.daily.reduce((sum, row) => sum + row.counts.visit, 0);
  const views = usage.totals.school_view.hits + usage.totals.major_view.hits + usage.totals.program_view.hits;
  const saves = usage.totals.school_save.hits + usage.totals.major_save.hits + usage.totals.program_save.hits + usage.totals.wishlist_add.hits;
  const annual = days === 365;
  const visitPoints = chartPoints(from, to, funnel.daily.map((row) => ({ day: row.day, value: row.counts.visit })), annual);
  const donationPoints = chartPoints(from, to, donations.daily.map((row) => ({ day: row.day, value: row.amount })), annual);

  return <>
    <AdminHeader title="Thống kê hoạt động" crumb="Thống kê" />
    <AdminBody>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm text-slate-600">{fmtDate(from)} – {fmtDate(to)} · Giờ Việt Nam</p>
          {annual && <p className="mt-1 text-xs text-slate-500">Dữ liệu truy cập và sử dụng trước khi áp dụng lưu trữ 365 ngày có thể đã bị xoá.</p>}
        </div>
        <nav aria-label="Khoảng thời gian" className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
          {RANGES.map((range) => <Link key={range.days} href={`/quan-tri/thong-ke?ngay=${range.days}`} aria-current={days === range.days ? "page" : undefined} className={cn("rounded px-3 py-2 text-sm font-semibold", days === range.days ? "bg-white text-primary-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>{range.label}</Link>)}
        </nav>
      </div>

      <section aria-labelledby="visits-title" className="space-y-5">
        <div><h2 id="visits-title" className="text-lg font-bold text-slate-900">Truy cập</h2><p className="text-sm text-slate-500">Trình duyệt ẩn danh đã đồng ý thống kê; một trình duyệt được tính một lần trong kỳ.</p></div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
          <Metric label="Trình duyệt truy cập" value={number(visits)} Icon={LuUsers} sub="Không bao gồm người tắt theo dõi" />
          <Metric label="Lượt truy cập theo ngày" value={number(dailyVisits)} Icon={LuEye} sub="Cộng các lượt duy nhất của từng ngày" />
          <Metric label="Trung bình mỗi ngày" value={number(Math.round(dailyVisits / days))} Icon={LuMousePointerClick} sub={`Trong ${days} ngày được chọn`} />
        </div>
        {days > 1 && <Trend points={visitPoints} label={annual ? "Truy cập theo tháng" : "Truy cập theo ngày"} annual={annual} />}
      </section>

      <section aria-labelledby="usage-title" className="space-y-5 border-t border-slate-200 pt-6">
        <div><h2 id="usage-title" className="text-lg font-bold text-slate-900">Lượt dùng</h2><p className="text-sm text-slate-500">Các thao tác được ghi nhận khi người dùng cho phép thống kê.</p></div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tìm kiếm" value={number(usage.totals.search.hits)} Icon={LuSearch} sub={`${number(usage.totals.search.people)} trình duyệt`} />
          <Metric label="Xem nội dung" value={number(views)} Icon={LuEye} sub="Trường, ngành và chương trình" />
          <Metric label="Lưu & nguyện vọng" value={number(saves)} Icon={LuMousePointerClick} sub="Lưu trường, ngành, chương trình hoặc thêm nguyện vọng" />
          <Metric label="Dùng trợ lý" value={number(funnel.chat)} Icon={LuUsers} sub="Trình duyệt đã hỏi trợ lý trong kỳ" />
        </div>
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          <div><h3 className="text-sm font-semibold text-slate-900">Hành trình sử dụng</h3><dl className="mt-2 divide-y divide-slate-100 text-sm">
            {funnel.steps.slice(1).map((step) => <div key={step.event} className="flex items-center justify-between gap-4 py-2"><dt className="text-slate-600">{step.label}</dt><dd className="font-semibold text-slate-900 tabular-nums">{number(step.users)} <span className="font-normal text-slate-500">trình duyệt</span></dd></div>)}
          </dl></div>
          <div><h3 className="text-sm font-semibold text-slate-900">Nội dung được quan tâm</h3><div className="mt-2 grid gap-5 sm:grid-cols-3">
            {[
              { title: "Trường", rows: usage.topSchools },
              { title: "Ngành", rows: usage.topMajors },
              { title: "Chương trình", rows: usage.topPrograms },
            ].map((group) => <div key={group.title} className="min-w-0"><p className="text-xs font-semibold text-slate-600">{group.title}</p><ol className="mt-2 space-y-1.5 text-xs">{group.rows.slice(0, 3).map((row) => <li key={row.id} className="flex justify-between gap-2"><span className="min-w-0 truncate text-slate-700" title={row.name}>{row.name}</span><strong className="tabular-nums text-slate-900">{number(row.people)}</strong></li>)}</ol>{group.rows.length === 0 && <p className="mt-2 text-xs text-slate-500">Chưa có dữ liệu</p>}</div>)}
          </div></div>
        </div>
        <Link href="/quan-tri/chatbot" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">Xem lịch sử trợ lý <LuArrowUpRight className="size-4" aria-hidden /></Link>
      </section>

      <section aria-labelledby="donations-title" className="space-y-5 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="donations-title" className="text-lg font-bold text-slate-900">Donate</h2><p className="text-sm text-slate-500">Chỉ cộng giao dịch thành công theo ngày thanh toán.</p></div><Link href="/quan-tri/ung-ho" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">Xem giao dịch <LuArrowUpRight className="size-4" aria-hidden /></Link></div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tổng ủng hộ" value={money(donations.amount)} Icon={LuHandHeart} tone="teal" />
          <Metric label="Giao dịch thành công" value={number(donations.successful)} Icon={LuHandHeart} tone="teal" />
          <Metric label="Trung bình / giao dịch" value={money(donations.average)} Icon={LuHandHeart} tone="teal" />
          <Metric label="Đang chờ xử lý" value={number(donations.pending)} Icon={LuHandHeart} tone="teal" sub="Giao dịch tạo trong kỳ" />
        </div>
        {days > 1 && <Trend points={donationPoints} label={annual ? "Số tiền nhận theo tháng" : "Số tiền nhận theo ngày"} annual={annual} tone="teal" />}
      </section>

      <details className="border-t border-slate-200 pt-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Chi tiết {annual ? "theo tháng" : "theo ngày"}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-600"><tr><th scope="col" className="py-2 font-medium">{annual ? "Tháng" : "Ngày"}</th><th scope="col" className="py-2 text-right font-medium">Lượt truy cập</th><th scope="col" className="py-2 text-right font-medium">Donate thành công</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{visitPoints.map((point, index) => <tr key={point.day}><th scope="row" className="py-2 font-medium text-slate-700">{annual ? point.day : fmtDate(point.day)}</th><td className="py-2 text-right tabular-nums">{number(point.value)}</td><td className="py-2 text-right tabular-nums">{money(donationPoints[index]?.value ?? 0)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>

      <details className="border-t border-slate-200 pt-5">
        <summary className="cursor-pointer text-base font-bold text-slate-900">Khảo sát trải nghiệm SUS · toàn thời gian</summary>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-slate-600">{number(sus.n)} phiếu · Điểm trung bình: <strong className="text-slate-900">{sus.mean === null ? "—" : number(sus.mean)}</strong> {sus.grade && `· ${sus.grade}`}</p><div className="flex gap-4"><Link href="/khao-sat" className="font-semibold text-primary-700 hover:underline">Phiếu khảo sát</Link>{sus.n > 0 && <a href="/api/admin/survey/export" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline"><LuDownload className="size-4" aria-hidden /> Tải CSV</a>}</div></div>
        {sus.n > 0 && <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div><h3 className="text-sm font-semibold text-slate-900">Điểm từng câu</h3><ol className="mt-2 divide-y divide-slate-100 text-sm">{sus.perQuestion.map((item, index) => <li key={index} className="flex justify-between gap-3 py-2"><span className="text-slate-700">{index + 1}. {item.q}</span><strong className="shrink-0 tabular-nums">{item.mean?.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) ?? "—"}</strong></li>)}</ol></div>
          <div><h3 className="text-sm font-semibold text-slate-900">Góp ý gần đây</h3>{sus.comments.length ? <ul className="mt-2 divide-y divide-slate-100 text-sm">{sus.comments.map((item, index) => <li key={`${item.at}-${index}`} className="py-2"><p className="whitespace-pre-wrap text-slate-700">{item.comment}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.at).toLocaleDateString("vi-VN")} · SUS {number(item.score)}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Chưa có góp ý.</p>}</div>
        </div>}
      </details>
    </AdminBody>
  </>;
}
