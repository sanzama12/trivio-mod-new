import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { adminService, timelineService } from "@/services";
import { AuditLog } from "@/components/admin/audit-log";
import { TimelineEditor } from "@/components/admin/timeline-editor";

export const metadata: Metadata = { title: "Quản trị mốc tuyển sinh", robots: { index: false, follow: false } };

export default async function AdminTimelinePage() {
  await adminPage("/quan-tri/moc-tuyen-sinh");
  const [view, audit] = await Promise.all([timelineService.list(), adminService.listAudit(200)]);
  return (
    <>
      <AdminHeader title="Mốc tuyển sinh" crumb="Mốc tuyển sinh" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Khi Bộ GD&amp;ĐT / ĐHQG công bố lịch, cập nhật ngày ở đây và đánh dấu “Lịch chính thức” kèm đường dẫn văn bản. Trang Mốc tuyển sinh, banner nhắc hạn, email nhắc và chatbot dùng ngay lịch mới.
      </p>
      <TimelineEditor initial={view} />
      <AuditLog entries={audit.filter((a) => a.targetType === "timeline").slice(0, 15)} title="Lịch sử cập nhật" />
      </AdminBody>
    </>
  );
}
