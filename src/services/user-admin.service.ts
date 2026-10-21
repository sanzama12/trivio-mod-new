/**
 * SERVICE LAYER — A08 Người dùng: thống kê, danh sách + lọc, khoá/mở khoá, xoá, tạo tài khoản (gửi link đặt mật khẩu),
 * hai vai trò User/Admin. Mọi thao tác có nhật ký.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, UserRole } from "../domain/types";
import { repositories } from "@database/repositories";
import { authService, toPublicUser } from "./auth.service";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminUserStatus = "active" | "unverified" | "locked";
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  admin: boolean;
  status: AdminUserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  hasGoogle: boolean;
}

const statusOf = (u: PublicUser): AdminUserStatus => (u.disabled || u.locked ? "locked" : !u.verified ? "unverified" : "active");

async function audit(actor: PublicUser, id: string, action: "update" | "delete" | "create" | "approve" | "reject", field: string, before: string, after: string) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: id, targetType: "user", action, changes: [{ field, before, after }] });
}

export const userAdminService = {
  async list(): Promise<{ rows: AdminUserRow[]; stats: { total: number; active30: number; newThisMonth: number; locked: number } }> {
    const users = await repositories.users.list();
    const rows = users
      .map((raw) => {
        const u = toPublicUser(raw);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          admin: u.admin,
          status: statusOf(u),
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
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
        hasScores: !!data?.profile,
        reminders: data?.reminders.length ?? 0,
      },
    };
  },

  async action(actor: PublicUser, id: string, input: Record<string, unknown>, resetUrl: (token: string) => string): Promise<{ ok: true } | Fail> {
    if (!actor.admin) return { ok: false, status: 403, message: "Chỉ Admin được quản lý tài khoản." };
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
    if (action === "invite") {
      await authService.requestPasswordReset(user.email, resetUrl);
      await audit(actor, id, "update", `Gửi link đặt mật khẩu ${user.email}`, "—", "Đã gửi");
      return { ok: true };
    }
    return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
  },

  /** Tạo tài khoản User — người dùng tự đặt mật khẩu qua link trong email. */
  async create(actor: PublicUser, input: Record<string, unknown>, resetUrl: (token: string) => string): Promise<{ ok: true; id: string } | Fail> {
    if (!actor.admin) return { ok: false, status: 403, message: "Chỉ Admin được quản lý tài khoản." };
    const name = String(input.name ?? "").replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    if (name.length < 2 || name.length > 60) return { ok: false, status: 400, field: "name", message: "Họ tên 2–60 ký tự." };
    if (!EMAIL_RE.test(email) || email.length > 120) return { ok: false, status: 400, field: "email", message: "Email không hợp lệ." };
    if (await repositories.users.findByEmail(email)) return { ok: false, status: 409, field: "email", message: "Email này đã có tài khoản." };
    if (input.role !== undefined && input.role !== "user") return { ok: false, status: 400, field: "role", message: "Tài khoản mới mặc định là User." };
    if (input.admin === true || input.moderator === true) return { ok: false, status: 400, message: "Không cấp quyền quản trị qua thao tác tạo người dùng." };
    const created = await repositories.users.create({
      name,
      email,
      avatarUrl: null,
      passwordHash: null,
      googleId: null,
      verified: false,
      locked: false,
      failedAttempts: 0,
      role: "user",
      gradYear: null,
      province: null,
      under16: false,
      parentConsent: false,
      onboarded: false,
    });
    await authService.requestPasswordReset(email, resetUrl);
    await audit(actor, created.id, "create", "Tạo tài khoản", "—", `${email} (User)`);
    return { ok: true, id: created.id };
  },
};
