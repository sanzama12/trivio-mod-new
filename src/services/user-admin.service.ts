/**
 * SERVICE LAYER — A08 Người dùng: thống kê, danh sách + lọc, khoá/mở khoá, xoá, tạo tài khoản (gửi link đặt mật khẩu),
 * hai vai trò User/Admin. Mọi thao tác có nhật ký.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, UserRole } from "../domain/types";
import { repositories } from "@database/repositories";
import { normalizeVi } from "@/lib/text";
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
  lockNote: string | null;
}

const statusOf = (u: PublicUser): AdminUserStatus => (u.disabled || (u.locked && (!u.lockUntil || Date.parse(u.lockUntil) > Date.now())) ? "locked" : !u.verified ? "unverified" : "active");

async function audit(actor: PublicUser, id: string, action: "update" | "delete" | "create" | "approve" | "reject", field: string, before: string, after: string) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: id, targetType: "user", action, changes: [{ field, before, after }] });
}

export const userAdminService = {
  async list(filter: { q?: string; role?: string; status?: string; since?: string; page?: string } = {}) {
    const nowMs = Date.now();
    const since = filter.since === "7" ? new Date(nowMs - 7 * 864e5).toISOString()
      : filter.since === "30" ? new Date(nowMs - 30 * 864e5).toISOString()
      : filter.since === "month" ? new Date(new Date(nowMs).toISOString().slice(0,7) + "-01").toISOString() : "";
    const result = await repositories.users.listPage({
      q: normalizeVi((filter.q ?? "").slice(0,100)),
      role: ["admin","user"].includes(filter.role ?? "") ? filter.role! : "",
      status: ["active","unverified","locked"].includes(filter.status ?? "") ? filter.status! : "",
      since, page: Math.max(1,Math.min(10000,parseInt(filter.page ?? "1",10)||1)),
    });
    const users = result.rows;
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
          lockNote: u.disabled ? "Do quản trị viên khóa" : raw.locked && raw.failedAttempts >= 5 ? "Cần quản trị viên mở" : raw.locked && raw.lockUntil && Date.parse(raw.lockUntil) > Date.now()
            ? `Đến ${new Date(raw.lockUntil).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })}` : null,
        } satisfies AdminUserRow;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { rows, total: result.total, stats: result.stats };
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
      await repositories.users.update(id, lock ? { disabled: true, sessionVersion: (user.sessionVersion ?? 0) + 1 } : { disabled: false, locked: false, lockUntil: null, failedAttempts: 0 });
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
    if (action === "set-role") {
      const role = input.role === "admin" ? "admin" : input.role === "user" ? "user" : null;
      if (!role) return { ok: false, status: 400, field: "role", message: "Vai trò phải là học sinh (user) hoặc quản trị viên (admin)." };
      if (self) return { ok: false, status: 400, message: "Không thể tự đổi vai trò của chính mình." };
      if ((role === "admin") === target.admin) return { ok: true };
      if (role === "admin" && !user.verified) return { ok: false, status: 400, message: "Chỉ cấp quyền quản trị cho tài khoản đã xác thực email." };
      if (role === "admin" && user.disabled) return { ok: false, status: 400, message: "Không cấp quyền quản trị cho tài khoản đang bị khoá." };
      // Hạ quyền thì đăng xuất mọi thiết bị của tài khoản đó để quyền cũ không còn hiệu lực.
      await repositories.users.update(id, role === "user" ? { admin: false, role: "user", sessionVersion: (user.sessionVersion ?? 0) + 1 } : { admin: true, role: "admin" });
      await audit(actor, id, "update", `Vai trò ${user.email}`, target.admin ? "Quản trị viên" : "Học sinh", role === "admin" ? "Quản trị viên" : "Học sinh");
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
