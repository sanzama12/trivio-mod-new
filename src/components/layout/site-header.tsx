import { getCurrentUser } from "@/lib/auth";
import { HeaderClient } from "./header-client";

/** Server component: đọc phiên đăng nhập rồi giao phần tương tác cho HeaderClient. */
export async function SiteHeader() {
  const user = await getCurrentUser();
  return <HeaderClient user={user ? { name: user.name, email: user.email, avatarUrl: user.avatarUrl, admin: user.admin, teacher: user.role === "teacher", moderator: !!user.moderator, schoolStaff: user.schoolStaff?.status === "approved" } : null} />;
}
