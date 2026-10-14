/** Chặn truy cập trang quản trị ở server: khách → đăng nhập; không đủ quyền → 404 (không tiết lộ trang tồn tại). */
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

export async function adminPage(next: string, opts: { staff?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  if (!user.admin && !(opts.staff && user.moderator)) notFound();
  return user;
}
