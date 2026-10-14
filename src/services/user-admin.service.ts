/**
 * SERVICE LAYER — A08 Người dùng: thống kê, danh sách + lọc, khoá/mở khoá, xoá, tạo tài khoản (gửi link đặt mật khẩu),
 * cấp/thu quyền kiểm duyệt viên, duyệt cán bộ tuyển sinh. Mọi thao tác có nhật ký.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, User, UserRole } from "../domain/types";
import { repositories } from "../repositories";
import { authService, toPublicUser } from "./auth.service";
import { notificationService } from "./notification.service";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: UserRole[] = ["student", "parent", "teacher", "school"];

export type AdminUserStatus = "active" | "unverified" | "locked";
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  admin: boolean;
  moderator: boolean;
  status: AdminUserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  schoolStaff: User["schoolStaff"] | null;
  schoolName: string | null;
  hasGoogle: boolean;
}

const statusOf = (u: PublicUser): AdminUserStatus => (u.disabled || u.locked ? "locked" : !u.verified ? "unverified" : "active");

async function audit(actor: PublicUser, id: string, action: "update" | "delete" | "create" | "approve" | "reject", field: string, before: string, after: string) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: id, targetType: "user", action, changes: [{ field, before, after }] });
}

export const userAdminService = {
  async list(): Promise<{ rows: AdminUserRow[]; stats: { total: number; active30: number; newThisMonth: number; locked: number; pendingStaff: number } }> {
    const [users, schools] = await Promise.all([repositories.users.list(), repositories.catalogAdmin.listSchools()]);
    const names = new Map(schools.map((s) => [s.id, s.shortName]));
    const rows = users
      .map((raw) => {
        const u = toPublicUser(raw);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          admin: u.admin,
          moderator: !!u.moderator,
          status: statusOf(u),
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
          schoolStaff: u.schoolStaff ?? null,
          schoolName: u.schoolStaff ? (names.get(u.schoolStaff.schoolId) ?? u.schoolStaff.schoolId) : null,
          hasGoogle: u.hasGoogle,
        } satisfies AdminUserRow;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const t = Date.now();
    const month = now().slice(0, 7);
    return {
      rows,
      stats: {
        total: rows.length,
        active30: rows.filter((r) => r.lastLoginAt && t - Date.parse(r.lastLoginAt) <= 30 * 86400_000).length,
        newThisMonth: rows.filter((r) => r.createdAt.startsWith(month)).length,
        locked: rows.filter((r) => r.status === "locked").length,
        pendingStaff: rows.filter((r) => r.schoolStaff?.status === "pending").length,
      },
    };
  },

  /** Chi tiết một tài khoản (không lộ dữ liệu nhạy cảm: không mật khẩu/điểm chi tiết). */
  async detail(id: string) {
    const user = await repositories.users.findById(id);
    if (!user) return null;
    const data = await repositories.userData.get(id);
    return {
      user: toPublicUser(user),
      usage: {
        saved: data?.saved.length ?? 0,
        wishlist: data?.wishlist.length ?? 0,
        quizDone: !!data?.quiz,
        hasScores: !!data?.profile,
        reminders: data?.reminders.length ?? 0,
      },
    };
  },

  async action(actor: PublicUser, id: string, input: Record<string, unknown>, resetUrl: (token: string) => string): Promise<{ ok: true } | Fail> {
    const action = String(input.action ?? "");
    const user = await repositories.users.findById(id);
    if (!user) return { ok: false, status: 404, message: "Không tìm thấy tài khoản." };
    const target = toPublicUser(user);
    const self = user.id === actor.id;

    if (action === "lock" || action === "unlock") {
      if (self) return { ok: false, status: 400, message: "Không thể tự khoá tài khoản của mình." };
      if (action === "lock" && target.admin) return { ok: false, status: 400, message: "Không khoá được tài khoản quản trị viên." };
      const lock = action === "lock";
      await repositories.users.update(id, lock ? { disabled: true, sessionVersion: (user.sessionVersion ?? 0) + 1 } : { disabled: false, locked: false, failedAttempts: 0 });
      await audit(actor, id, "update", `Tài khoản ${user.email}`, lock ? "Hoạt động" : "Đã khoá", lock ? "Đã khoá" : "Hoạt động");
      return { ok: true };
    }
    if (action === "delete") {
      if (self) return { ok: false, status: 400, message: "Không thể tự xoá tài khoản đang đăng nhập." };
      if (target.admin) return { ok: false, status: 400, message: "Không xoá được tài khoản quản trị viên." };
      if (String(input.confirm ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return { ok: false, status: 400, field: "confirm", message: "Nhập đúng email của tài khoản để xác nhận xoá." };
      await authService.deleteAccount(id);
      await audit(actor, id, "delete", "Xoá tài khoản", user.email, "—");
      return { ok: true };
    }
    if (action === "moderator") {
      const on = input.value === true;
      if (!!user.moderator === on) return { ok: true };
      await repositories.users.update(id, { moderator: on });
      await audit(actor, id, "update", `Kiểm duyệt viên ${user.email}`, user.moderator ? "Có" : "Không", on ? "Có" : "Không");
      return { ok: true };
    }
    if (action === "staff-approve" || action === "staff-reject") {
      if (!user.schoolStaff) return { ok: false, status: 400, message: "Tài khoản không có yêu cầu cán bộ tuyển sinh." };
      const approve = action === "staff-approve";
      const status = approve ? "approved" : "rejected";
      await repositories.users.update(id, { schoolStaff: { ...user.schoolStaff, status, reviewedAt: now() }, ...(approve ? { role: "school" as const } : {}) });
      await audit(actor, id, approve ? "approve" : "reject", `Cán bộ tuyển sinh ${user.email}`, user.schoolStaff.status, status);
      await notificationService.notify({
        userId: id,
        kind: "school-submission",
        title: approve ? "Đã duyệt quyền cán bộ tuyển sinh" : "Yêu cầu cán bộ tuyển sinh chưa được duyệt",
        body: approve ? "Bạn có thể xác nhận số liệu của trường trên Cổng trường." : "Quản trị viên chưa xác minh được tư cách cán bộ tuyển sinh. Liên hệ hỗ trợ nếu cần.",
        href: "/cong-truong",
        email: true,
      });
      return { ok: true };
    }
    if (action === "invite") {
      await authService.requestPasswordReset(user.email, resetUrl);
      await audit(actor, id, "update", `Gửi link đặt mật khẩu ${user.email}`, "—", "Đã gửi");
      return { ok: true };
    }
    return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
  },

  /** Tạo tài khoản hộ (VD: giáo viên, cán bộ trường) — người dùng tự đặt mật khẩu qua link trong email. */
  async create(actor: PublicUser, input: Record<string, unknown>, resetUrl: (token: string) => string): Promise<{ ok: true; id: string } | Fail> {
    const name = String(input.name ?? "").replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    if (name.length < 2 || name.length > 60) return { ok: false, status: 400, field: "name", message: "Họ tên 2–60 ký tự." };
    if (!EMAIL_RE.test(email) || email.length > 120) return { ok: false, status: 400, field: "email", message: "Email không hợp lệ." };
    if (await repositories.users.findByEmail(email)) return { ok: false, status: 409, field: "email", message: "Email này đã có tài khoản." };
    const role = ROLES.includes(input.role as UserRole) ? (input.role as UserRole) : "student";
    const created = await repositories.users.create({
      name,
      email,
      avatarUrl: null,
      passwordHash: null,
      googleId: null,
      verified: false,
      locked: false,
      failedAttempts: 0,
      role: role === "school" ? null : role,
      gradYear: null,
      province: null,
      under16: false,
      parentConsent: false,
      onboarded: false,
      moderator: input.moderator === true,
    });
    await authService.requestPasswordReset(email, resetUrl);
    await audit(actor, created.id, "create", "Tạo tài khoản", "—", `${email} (${role}${input.moderator === true ? ", kiểm duyệt viên" : ""})`);
    return { ok: true, id: created.id };
  },
};
