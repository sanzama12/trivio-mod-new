import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { LeadEmailForm } from "@/components/admin/lead-email-form";
import { AdminBody } from "@/components/admin/ui";
import { adminPage } from "@/lib/admin-page";
import { isMailerConfigured } from "@/services/mailer";

export const metadata: Metadata = { title: "Email khách hàng", robots: { index: false, follow: false } };

export default async function LeadEmailPage() {
  await adminPage("/quan-tri/email-khach-hang");
  return (
    <>
      <AdminHeader title="Email khách hàng tiềm năng" crumb="Email khách hàng" />
      <AdminBody>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">Gửi thông báo tới khách hàng tiềm năng đã đồng ý nhận email. Hệ thống kiểm tra địa chỉ, loại bỏ email trùng và gửi riêng từng người nhận.</p>
        <LeadEmailForm configured={isMailerConfigured()} />
      </AdminBody>
    </>
  );
}
