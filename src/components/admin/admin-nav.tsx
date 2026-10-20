import { adminNavigationService } from "@/services/admin-navigation.service";

/** Khoá các mục trên thanh bên quản trị (dùng cho số việc đang chờ). */
export type AdminSection =
  | "overview"
  | "schools"
  | "majors"
  | "programs"
  | "scores"
  | "import"
  | "users"
  | "rules"
  | "qa"
  | "emails"
  | "timeline"
  | "news"
  | "materials"
  | "chatbot"
  | "stats";

/** Số việc đang chờ xử lý hiển thị trên thanh bên (gọi ở server). */
export async function adminBadges(): Promise<Partial<Record<AdminSection, number>>> {
  return adminNavigationService.getBadges();
}
