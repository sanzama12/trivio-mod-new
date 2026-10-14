import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { reviewService } from "@/services/review.service";
import { adminService } from "@/services";
import { AuditLog } from "@/components/admin/audit-log";
import { ModerationQueue } from "@/components/admin/moderation-queue";

export const metadata: Metadata = { title: "Kiểm duyệt cảm nhận", robots: { index: false, follow: false } };

export default async function ReviewModerationPage() {
  await adminPage("/quan-tri/cam-nhan", { staff: true });
  const [queue, recent, audit] = await Promise.all([reviewService.queue(), reviewService.recentModerated(15), adminService.listAudit(200)]);
  const names = Object.fromEntries(recent.map((r) => [r.id, `“${r.title}” – ${r.schoolName}`]));
  return (
    <>
      <AdminHeader title="Kiểm duyệt cảm nhận sinh viên" crumb="Kiểm duyệt cảm nhận" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Cảm nhận chỉ hiển thị sau khi được duyệt. Cờ tự động giúp chú ý nội dung quảng cáo, thông tin liên hệ, ngôn từ hoặc cáo buộc cần kiểm tra. Cảm nhận bị 3 tài khoản khác nhau báo cáo sẽ tự ẩn và quay lại đây.
      </p>
      <ModerationQueue items={queue} />
      <AuditLog entries={audit.filter((a) => a.targetType === "review").slice(0, 20)} names={names} title="Lịch sử kiểm duyệt" />
      </AdminBody>
    </>
  );
}
