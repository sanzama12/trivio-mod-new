/** Tổng hợp số việc chờ xử lý cho thanh bên quản trị. */
import { repositories } from "@database/repositories";

export const adminNavigationService = {
  async getBadges() {
    return repositories.adminDashboard.badges();
  },
};
