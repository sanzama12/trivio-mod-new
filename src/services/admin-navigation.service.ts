/** Tổng hợp số việc chờ xử lý cho thanh bên quản trị. */
import { repositories } from "../repositories";
import { reviewService } from "./review.service";
import { dataReportService } from "./data-report.service";
import { qaService } from "./community.service";

export const adminNavigationService = {
  async getBadges() {
    const [reviews, reports, qa, subs, users] = await Promise.all([
      reviewService.queueCount(),
      dataReportService.openCount(),
      qaService.pendingCount(),
      repositories.schoolSubmissions.list({ status: "pending" }),
      repositories.users.list(),
    ]);
    return { reviews, reports, qa, overview: subs.length, users: users.filter((u) => u.schoolStaff?.status === "pending").length };
  },
};
