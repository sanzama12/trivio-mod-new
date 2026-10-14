import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { adminService } from "@/services";
import { dataReportService, REPORT_STATUS, REPORT_TOPICS } from "@/services/data-report.service";
import { AuditLog } from "@/components/admin/audit-log";
import { ReportQueue } from "@/components/admin/report-queue";

export const metadata: Metadata = { title: "Báo lỗi dữ liệu", robots: { index: false, follow: false } };

export default async function AdminReportsPage() {
  await adminPage("/quan-tri/bao-loi", { staff: true });
  const [items, audit] = await Promise.all([dataReportService.list(), adminService.listAudit(200)]);
  const names = Object.fromEntries(items.map((r) => [r.id, `${REPORT_TOPICS[r.topic]}${r.page ? ` – ${r.page}` : ""}`]));
  return (
    <>
      <AdminHeader title="Báo lỗi dữ liệu từ người dùng" crumb="Báo lỗi dữ liệu" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Người dùng gửi từ trang Trợ giúp hoặc nút “Báo dữ liệu sai” ở trang chương trình. Khi chuyển sang “{REPORT_STATUS["da-xu-ly"]}” hoặc “{REPORT_STATUS["khong-hop-le"]}”, ghi chú xử lý được gửi cho người báo (thông báo trong web và email).
      </p>
      <ReportQueue items={items} />
      <AuditLog entries={audit.filter((a) => a.targetType === "report").slice(0, 20)} names={names} title="Lịch sử xử lý" />
      </AdminBody>
    </>
  );
}
