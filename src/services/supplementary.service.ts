/**
 * SERVICE LAYER — theo dõi xét tuyển bổ sung và gửi thông báo
 * "Ngành X của trường Y vừa mở xét bổ sung, phù hợp với điểm của bạn".
 * Dữ liệu điểm/nguyện vọng lấy từ tài khoản (server), không tin dữ liệu client gửi lên.
 */
import { repositories } from "@database/repositories";
import { notificationService } from "./notification.service";
import { programService } from "./program.service";
import { toLiteProgram } from "./lite";
import { matchRounds } from "./plan-b";
import { profileScore } from "./scoring.service";
import { vnDay } from "./analytics.service";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

export const supplementaryService = {
  async list() {
    const supplementaryRounds = await repositories.supplementary.list();
    const views = await programService.listAll();
    const ids = new Set(supplementaryRounds.map((r) => r.programId));
    return { rounds: supplementaryRounds, programs: views.filter((v) => ids.has(v.program.id)).map(toLiteProgram) };
  },

  /**
   * Tạo thông báo cho đợt bổ sung ĐANG NHẬN hồ sơ mà người dùng đủ điểm và thuộc ngành/nhóm ngành của nguyện vọng,
   * hoặc đợt người dùng đã bật "Nhắc tôi". Mỗi đợt chỉ báo 1 lần (nhật ký chống trùng).
   */
  async notifyUser(userId: string, today = vnDay()): Promise<number> {
    const supplementaryRounds = await repositories.supplementary.list();
    const data = await repositories.userData.get(userId);
    if (!data) return 0;
    const views = await programService.listAll();
    const lite = views.map(toLiteProgram);
    const wishIds = data.wishlist.map((w) => w.id);
    const wishPrograms = lite.filter((p) => wishIds.includes(p.id));
    const majorIds = Array.from(new Set([...wishPrograms.map((p) => p.majorId), ...(data.goal?.majorId ? [data.goal.majorId] : [])]));
    const groupIds = Array.from(new Set(wishPrograms.map((p) => p.groupId)));
    const s = data.profile ? profileScore(data.profile) : null;
    const score = s ? { method: s.method, total: s.total, combo: data.profile?.combo ?? null } : null;
    const followed = new Set(data.reminders ?? []);
    const matches = matchRounds(supplementaryRounds, lite, today, score, majorIds, groupIds).filter(
      (m) => m.status === "dang-nhan" && ((m.eligible && m.relevant) || followed.has(m.round.id)),
    );
    if (!matches.length) return 0;
    const keys = matches.map((m) => `bs:${m.round.id}:${userId}`);
    const sent = await repositories.reminderLog.sent(keys);
    let created = 0;
    for (const m of matches) {
      const key = `bs:${m.round.id}:${userId}`;
      if (sent.has(key)) continue;
      await notificationService.notify({
        userId,
        kind: "supplementary",
        title: `Ngành ${m.program.name} của ${m.program.schoolName} vừa mở xét bổ sung${m.eligible ? ", phù hợp với điểm của bạn" : ""}`,
        body: `${m.round.quota} chỉ tiêu, nhận hồ sơ từ ${m.round.minScore} điểm (tổ hợp ${m.round.combos.join(", ")}), hạn ${fmt(m.round.closes)}.${m.eligible ? " Điểm của bạn đủ mức nhận hồ sơ." : ""} Dữ liệu minh hoạ — kiểm tra thông báo chính thức của trường.`,
        href: "/mua-diem",
        email: true,
      });
      await repositories.reminderLog.add([key]);
      created++;
    }
    return created;
  },

  /** Chạy hằng ngày cùng cron nhắc hạn. */
  async notifyAll(today = vnDay()): Promise<number> {
    const users = await repositories.users.list();
    let total = 0;
    for (const u of users) if (!u.locked) total += await this.notifyUser(u.id, today);
    return total;
  },
};
