import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminBadges } from "@/components/admin/admin-nav";

/** Khung quản trị (thanh bên A01–A09). Trang con tự kiểm tra quyền; tài khoản không có quyền không thấy khung. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || (!user.admin && !user.moderator)) return <>{children}</>;
  return (
    <AdminShell user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl, admin: user.admin }} badges={await adminBadges()}>
      {children}
    </AdminShell>
  );
}
