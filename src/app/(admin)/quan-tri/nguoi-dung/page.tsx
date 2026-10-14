import type { Metadata } from "next";
import { LuActivity, LuShieldAlert, LuTrendingUp, LuUsers } from "react-icons/lu";
import { adminPage } from "@/lib/admin-page";
import { userAdminService } from "@/services/user-admin.service";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody, AdminStat, StatGrid } from "@/components/admin/ui";
import { UserManager } from "@/components/admin/user-manager";

export const metadata: Metadata = { title: "Quản lý Người dùng", robots: { index: false, follow: false } };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await adminPage("/quan-tri/nguoi-dung");
  const { status } = await searchParams;
  const { rows, stats } = await userAdminService.list();
  const pct = stats.total ? Math.round((stats.active30 / stats.total) * 100) : 0;
  return (
    <>
      <AdminHeader title="Quản lý Người dùng" crumb="Người dùng" />
      <AdminBody>
        <StatGrid>
          <AdminStat label="Tổng người dùng" value={stats.total.toLocaleString("vi-VN")} hint={`↑ +${stats.newThisMonth} người dùng mới tháng này`} hintTone="success" Icon={LuUsers} />
          <AdminStat label="Hoạt động" value={stats.active30.toLocaleString("vi-VN")} hint={`${pct}% đăng nhập trong 30 ngày`} hintTone="success" Icon={LuActivity} />
          <AdminStat label="Mới tháng này" value={stats.newThisMonth.toLocaleString("vi-VN")} hint={stats.pendingStaff ? `${stats.pendingStaff} cán bộ tuyển sinh chờ duyệt` : "Không có yêu cầu chờ duyệt"} hintTone={stats.pendingStaff ? "accent" : "slate"} Icon={LuTrendingUp} tone="success" />
          <AdminStat label="Bị khóa" value={stats.locked} hint="Khoá bởi quản trị hoặc sai mật khẩu 5 lần" Icon={LuShieldAlert} tone="danger" />
        </StatGrid>
        <UserManager rows={rows} meId={me.id} initialStatus={status === "staff" ? "staff" : ""} />
      </AdminBody>
    </>
  );
}
