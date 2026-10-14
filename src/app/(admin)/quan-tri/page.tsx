import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LuCircleCheck, LuLandmark, LuTriangleAlert } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { dataOpsService } from "@/services/data-ops.service";
import { schoolPortalService } from "@/services/school-portal.service";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, Panel, StatGrid, ago } from "@/components/admin/ui";
import { DataIssues } from "@/components/admin/data-issues";
import { SubmissionQueue } from "@/components/admin/submission-queue";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tổng quan dữ liệu", robots: { index: false, follow: false } };

const DOT: Record<string, string> = { import: "bg-success-500", program: "bg-primary-500", school: "bg-primary-500", rules: "bg-accent-500", user: "bg-accent-500" };

export default async function AdminOverviewPage() {
  const user = await adminPage("/quan-tri", { staff: true });
  if (!user.admin) redirect("/quan-tri/cam-nhan"); // kiểm duyệt viên chỉ có mục kiểm duyệt
  const [data, submissions] = await Promise.all([dataOpsService.overview(), schoolPortalService.listSubmissions("pending")]);
  const { stats, progress } = data;
  const total = progress.verified + progress.pending + progress.missing || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const now = Date.now();

  return (
    <>
      <AdminHeader title="Tổng quan dữ liệu" crumb="Tổng quan dữ liệu" updatedAt={new Date().toISOString()} search />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng trường" value={stats.schools.toLocaleString("vi-VN")} hint={<Link href="/quan-tri/truong" className="font-semibold hover:underline">Quản lý trường ›</Link>} hintTone="success" Icon={LuLandmark} valueTone="primary" />
          <AdminStat label="Tổng chương trình" value={stats.programs.toLocaleString("vi-VN")} hint={`${stats.verifiedPct}% đã xác minh`} Icon={LuCircleCheck} tone="success" valueTone="primary" />
          <AdminStat label="Chờ kiểm duyệt" value={stats.pending.toLocaleString("vi-VN")} hint="Chương trình chưa đối chiếu nguồn trong 12 tháng" Icon={LuTriangleAlert} tone="accent" valueTone="accent" />
          <AdminStat label="Thiếu nguồn" value={stats.missingSource.toLocaleString("vi-VN")} hint="Bản ghi chưa có nguồn chính thức" Icon={LuTriangleAlert} tone="danger" valueTone="danger" />
        </StatGrid>

        <Panel className="p-5 sm:p-6" aria-labelledby="issues-h">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="issues-h" className="text-lg font-bold text-slate-900">
              Vấn đề dữ liệu cần xử lý
            </h2>
            <Badge tone="danger">{stats.openIssues} vấn đề</Badge>
          </div>
          <DataIssues issues={data.issues} />
        </Panel>

        <Panel className="p-5 sm:p-6" id="de-xuat" aria-labelledby="sub-h">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="sub-h" className="text-lg font-bold text-slate-900">
              Bản sửa từ Cổng trường
            </h2>
            <Badge tone={submissions.length ? "accent" : "slate"}>{submissions.length} chờ duyệt</Badge>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">Cán bộ tuyển sinh không sửa trực tiếp — số liệu chỉ thay đổi khi bạn duyệt. Trường nhận thông báo kết quả.</p>
          <SubmissionQueue items={submissions} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="p-5 sm:p-6" aria-labelledby="progress-h">
            <h2 id="progress-h" className="text-lg font-bold text-slate-900">
              Tiến độ xác minh dữ liệu
            </h2>
            <div className="mt-5 flex h-6 overflow-hidden rounded-full bg-slate-100 text-[11px] font-bold" role="img" aria-label={`Đã xác minh ${pct(progress.verified)}%, chờ xác minh ${pct(progress.pending)}%, thiếu dữ liệu ${pct(progress.missing)}%`}>
              {[
                [progress.verified, "bg-success-500 text-white"],
                [progress.pending, "bg-accent-500 text-slate-900"],
                [progress.missing, "bg-danger-500 text-white"],
              ].map(([n, cls], i) =>
                (n as number) > 0 ? (
                  <span key={i} className={`flex items-center justify-center ${cls}`} style={{ width: `${pct(n as number)}%` }}>
                    {pct(n as number) >= 8 ? `${pct(n as number)}%` : ""}
                  </span>
                ) : null,
              )}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-600">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-success-500" aria-hidden /> Đã xác minh · {progress.verified} ({pct(progress.verified)}%)
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-accent-500" aria-hidden /> Chờ xác minh · {progress.pending} ({pct(progress.pending)}%)
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-danger-500" aria-hidden /> Thiếu dữ liệu · {progress.missing} ({pct(progress.missing)}%)
              </li>
            </ul>
            <p className="mt-4 text-[13px] text-slate-500">
              “Đã xác minh” = quản trị viên đối chiếu nguồn (Điểm &amp; Học phí → Xác minh hàng loạt) hoặc trường xác nhận trên Cổng trường, còn hiệu lực 12 tháng.
            </p>
          </Panel>
          <Panel className="p-5 sm:p-6" aria-labelledby="act-h">
            <h2 id="act-h" className="text-lg font-bold text-slate-900">
              Hoạt động gần đây
            </h2>
            {data.activity.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Chưa có hoạt động nào.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[a.kind] ?? "bg-primary-500"}`} aria-hidden />
                    <span className="min-w-0 flex-1 text-slate-700">
                      <span className="font-medium text-slate-900">{a.who}</span> · {a.text}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{ago(a.at, now)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/quan-tri/chuong-trinh#nhat-ky" className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:underline">
              Xem toàn bộ nhật ký →
            </Link>
          </Panel>
        </div>
      </AdminBody>
    </>
  );
}
