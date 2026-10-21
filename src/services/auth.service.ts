/**
 * SERVICE LAYER — xác thực & quản lý tài khoản.
 * Hỗ trợ 2 phương thức: email + mật khẩu (băm scrypt) và Google (OpenID Connect).
 * Hai phương thức được liên kết theo cùng email đã xác minh.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PublicUser, User, UserRole } from "../domain/types";
import { PROVINCES } from "../domain/provinces";
import { repositories } from "@database/repositories";
import { checkPassword } from "./password.rules";
import { hashPassword, verifyPassword } from "./password.hash";
import { signToken, verifyToken } from "./session.service";
import { sendMail } from "./mailer";
import { emailError } from "../lib/email-validation";
import { accountRole } from "../domain/access";

export { checkPassword, passwordStrength } from "./password.rules";

export const MAX_LOGIN_ATTEMPTS = 5;
const RESET_TOKEN_TTL = 30 * 60; // 30 phút
const OTP_TTL_MS = 15 * 60 * 1000; // 15 phút

const otpHash = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("base64url");
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Tạo mã OTP 6 số, lưu bản băm + hạn dùng, gửi qua mailer. */
async function issueEmailOtp(user: Pick<User, "id" | "email">) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await repositories.users.update(user.id, { emailOtpHash: otpHash(user.id, code), emailOtpExpires: new Date(Date.now() + OTP_TTL_MS).toISOString() });
  await sendMail({ to: user.email, subject: "Mã xác thực Trovio", text: `Mã xác thực email của bạn là ${code} (hiệu lực 15 phút).` });
}

export type LoginResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "locked"; lockUntil?: string | null }
  | { ok: false; reason: "google_only" };

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; field: "name" | "email" | "password" | "confirm" | "terms"; message: string };

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

export type GoogleLoginResult =
  | { ok: true; user: PublicUser; isNew: boolean }
  | { ok: false; reason: "email_unverified" | "conflict" | "not_found" | "disabled" };

export interface ProfilePatch {
  name?: string;
  role?: UserRole | null;
  gradYear?: number | null;
  province?: string | null;
  under16?: boolean;
  parentConsent?: boolean;
  onboarded?: boolean;
  emailReminders?: boolean;
}

type Fail<F extends string = string> = { ok: false; field?: F; message: string };

const strong = (pw: string) => checkPassword(pw).every((c) => c.passed);
/** Dấu vân tay mật khẩu hiện tại: đổi mật khẩu xong thì link đặt lại cũ tự mất hiệu lực. */
const passwordFingerprint = (u: User) => (u.passwordHash ? u.passwordHash.slice(-12) : "none");

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, googleId, failedAttempts: _f, sessionVersion: _s, emailOtpHash: _o, emailOtpExpires: _e, admin, ...rest } = user;
  const isAdmin = admin === true;
  return { ...rest, role: accountRole(isAdmin), hasPassword: !!passwordHash, hasGoogle: !!googleId, admin: isAdmin };
}

const blankProfile = {
  avatarUrl: null,
  role: "user",
  gradYear: null,
  province: null,
  under16: false,
  parentConsent: false,
  onboarded: false,
  locked: false,
  failedAttempts: 0,
} satisfies Partial<User>;

const DUMMY_HASH = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await repositories.users.findByEmail(email);
    // Chống timing attack & chống dò quét tài khoản (GIAI ĐOẠN 8):
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      return { ok: false, reason: "invalid", attemptsLeft: MAX_LOGIN_ATTEMPTS };
    }
    if (user.disabled) return { ok: false, reason: "locked" };

    const now = Date.now();
    // Kiểm tra khoá tạm thời (progressive lockout):
    if (user.lockUntil) {
      const unlockTime = Date.parse(user.lockUntil);
      if (unlockTime > now) {
        return { ok: false, reason: "locked", lockUntil: user.lockUntil };
      }
      // Đã quá hạn khoá tạm thời -> tự động mở khoá
    } else if (user.locked) {
      return { ok: false, reason: "locked" };
    }

    if (!user.passwordHash) return { ok: false, reason: "google_only" };
    if (!(await verifyPassword(password, user.passwordHash))) {
      const failedAttempts = (user.failedAttempts ?? 0) + 1;
      let locked = false;
      let lockUntil: string | null = null;

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        locked = true;
        // Exponential backoff có giới hạn:
        // 5 lần: 60s (1 phút)
        // 6 lần: 300s (5 phút)
        // 7 lần: 900s (15 phút)
        // >=8 lần: 3600s (60 phút tối đa)
        const delaySeconds =
          failedAttempts === 5 ? 60 :
          failedAttempts === 6 ? 300 :
          failedAttempts === 7 ? 900 : 3600;
        lockUntil = new Date(now + delaySeconds * 1000).toISOString();
      }

      await repositories.users.update(user.id, { failedAttempts, locked, lockUntil });
      return locked
        ? { ok: false, reason: "locked", lockUntil }
        : { ok: false, reason: "invalid", attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts) };
    }

    // Đăng nhập thành công -> reset toàn bộ bộ đếm sai và khoá tạm thời
    if (user.failedAttempts || user.locked || user.lockUntil) {
      await repositories.users.update(user.id, { failedAttempts: 0, locked: false, lockUntil: null });
    }
    return { ok: true, user: toPublicUser(user) };
  },

  async register(input: { name?: string; email: string; password: string; confirm: string; terms: boolean }): Promise<RegisterResult> {
    const typed = (typeof input.name === "string" ? input.name : "").trim().replace(/\s+/g, " ");
    const email = (typeof input.email === "string" ? input.email : "").trim().toLowerCase();
    const invalidEmail = emailError(email);
    if (invalidEmail) return { ok: false, field: "email", message: invalidEmail };
    // Tên gọi không bắt buộc (thu ít dữ liệu cá nhân): bỏ trống thì dùng phần trước @ của email.
    if (typed.length === 1 || typed.length > 60) return { ok: false, field: "name", message: "Tên gọi cần từ 2 đến 60 ký tự (hoặc để trống)." };
    const name = typed || email.split("@")[0].slice(0, 30);
    if (await repositories.users.findByEmail(email)) {
      return { ok: false, field: "email", message: "Email này đã được đăng ký." };
    }
    if (!strong(input.password)) return { ok: false, field: "password", message: "Mật khẩu chưa đáp ứng yêu cầu." };
    if (input.password !== input.confirm) return { ok: false, field: "confirm", message: "Mật khẩu xác nhận không khớp." };
    if (!input.terms) return { ok: false, field: "terms", message: "Bạn cần đồng ý với Điều khoản sử dụng." };
    const user = await repositories.users.create({
      ...blankProfile,
      name,
      email,
      passwordHash: await hashPassword(input.password),
      googleId: null,
      verified: false,
    });
    // Email ownership is optional at sign-up; do not block account access on mail delivery.
    return { ok: true, user: toPublicUser(user) };
  },

  async verifyEmail(email: string, code: string): Promise<{ ok: true; user: PublicUser } | { ok: false; message: string }> {
    const user = await repositories.users.findByEmail(email);
    const wrong = { ok: false as const, message: "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại." };
    if (!user) return wrong;
    const clean = String(code).replace(/\D/g, "");
    const realOk =
      !!user.emailOtpHash &&
      !!user.emailOtpExpires &&
      Date.parse(user.emailOtpExpires) > Date.now() &&
      safeEqual(otpHash(user.id, clean), user.emailOtpHash);
    if (!realOk) return wrong;
    const updated = await repositories.users.update(user.id, { verified: true, emailOtpHash: null, emailOtpExpires: null, sessionVersion: (user.sessionVersion ?? 0) + 1 });
    return { ok: true, user: toPublicUser(updated!) };
  },

  /** Gửi lại mã xác thực (không tiết lộ email có tồn tại hay không). */
  async resendEmailOtp(email: string): Promise<{ ok: true }> {
    const user = await repositories.users.findByEmail(email);
    if (user && !user.verified) await issueEmailOtp(user);
    return { ok: true };
  },

  /**
   * Luôn trả về thành công để không tiết lộ email nào đã đăng ký.
   * Bản demo trả token về để mô phỏng liên kết trong email.
   */
  async requestPasswordReset(email: string, resetUrl?: (token: string) => string): Promise<{ ok: true; token: string }> {
    const user = await repositories.users.findByEmail(email);
    if (!user) return { ok: true, token: "reset-unknown" };
    const token = signToken({ uid: user.id, typ: "reset", pv: passwordFingerprint(user) }, RESET_TOKEN_TTL);
    if (resetUrl) await sendMail({ to: user.email, subject: "Đặt lại mật khẩu Trovio", text: `Mở liên kết sau trong 30 phút để đặt mật khẩu mới:\n${resetUrl(token)}` });
    return { ok: true, token };
  },

  async resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; reason: "expired" | "weak" }> {
    const data = verifyToken<{ uid: string; typ: string; pv: string }>(token);
    if (!data || data.typ !== "reset") return { ok: false, reason: "expired" };
    const user = await repositories.users.findById(data.uid);
    if (!user || passwordFingerprint(user) !== data.pv) return { ok: false, reason: "expired" };
    if (!strong(password)) return { ok: false, reason: "weak" };
    // Mở được link trong email = đã chứng minh sở hữu email → coi như đã xác thực.
    await repositories.users.update(user.id, {
      passwordHash: await hashPassword(password),
      locked: false,
      lockUntil: null,
      failedAttempts: 0,
      verified: true,
      sessionVersion: (user.sessionVersion ?? 0) + 1, // đăng xuất mọi phiên cũ
    });
    return { ok: true };
  },

  /**
   * Đăng nhập / đăng ký bằng Google.
   * - Đã liên kết `sub` → đăng nhập.
   * - Trùng email với tài khoản mật khẩu → tự liên kết (Google đã xác minh email).
   * - Chưa có → tạo tài khoản mới (không mật khẩu, đã xác thực).
   * - `linkToUserId`: người dùng đang đăng nhập muốn liên kết thêm Google từ trang hồ sơ.
   */
  async loginWithGoogle(profile: GoogleProfile, opts: { linkToUserId?: string } = {}): Promise<GoogleLoginResult> {
    if (!profile.emailVerified) return { ok: false, reason: "email_unverified" };
    const byGoogle = await repositories.users.findByGoogleId(profile.sub);
    if (byGoogle?.disabled) return { ok: false, reason: "disabled" };

    if (opts.linkToUserId) {
      const target = await repositories.users.findById(opts.linkToUserId);
      if (!target) return { ok: false, reason: "not_found" };
      if (byGoogle && byGoogle.id !== target.id) return { ok: false, reason: "conflict" };
      const updated = await repositories.users.update(target.id, { googleId: profile.sub, avatarUrl: target.avatarUrl ?? profile.picture });
      return { ok: true, user: toPublicUser(updated!), isNew: false };
    }

    if (byGoogle) {
      const updated = await repositories.users.update(byGoogle.id, {
        avatarUrl: byGoogle.avatarUrl ?? profile.picture,
        locked: false,
        failedAttempts: 0,
      });
      return { ok: true, user: toPublicUser(updated!), isNew: false };
    }

    const byEmail = await repositories.users.findByEmail(profile.email);
    if (byEmail?.disabled) return { ok: false, reason: "disabled" };
    if (byEmail) {
      const updated = await repositories.users.update(byEmail.id, {
        googleId: profile.sub,
        avatarUrl: byEmail.avatarUrl ?? profile.picture,
        verified: true,
        locked: false,
        failedAttempts: 0,
        // Tài khoản mật khẩu chưa xác thực email có thể do người khác tạo hộ → huỷ mật khẩu đó.
        ...(byEmail.verified ? {} : { passwordHash: null, sessionVersion: (byEmail.sessionVersion ?? 0) + 1 }),
      });
      return { ok: true, user: toPublicUser(updated!), isNew: false };
    }

    const created = await repositories.users.create({
      ...blankProfile,
      name: profile.name.trim() || profile.email.split("@")[0],
      email: profile.email,
      avatarUrl: profile.picture,
      passwordHash: null,
      googleId: profile.sub,
      verified: true,
    });
    return { ok: true, user: toPublicUser(created), isNew: true };
  },

  async getUser(id: string): Promise<PublicUser | null> {
    const user = await repositories.users.findById(id);
    return user ? toPublicUser(user) : null;
  },

  /** Người dùng của một phiên — null nếu phiên đã bị thu hồi (đổi mật khẩu, đăng xuất mọi thiết bị). */
  async getUserForSession(id: string, sessionVersion: number): Promise<PublicUser | null> {
    const user = await repositories.users.findById(id);
    if (!user || user.disabled || (user.sessionVersion ?? 0) !== sessionVersion) return null;
    return toPublicUser(user);
  },

  /** Ghi nhận lần đăng nhập (thống kê "đang hoạt động 30 ngày" ở trang quản trị). */
  async markLogin(id: string): Promise<void> {
    await repositories.users.update(id, { lastLoginAt: new Date().toISOString() });
  },

  async getSessionVersion(id: string): Promise<number> {
    return (await repositories.users.findById(id))?.sessionVersion ?? 0;
  },

  /** Đăng xuất khỏi mọi thiết bị. */
  async revokeSessions(id: string): Promise<void> {
    const user = await repositories.users.findById(id);
    if (user) await repositories.users.update(id, { sessionVersion: (user.sessionVersion ?? 0) + 1 });
  },

  async updateProfile(id: string, patch: ProfilePatch): Promise<{ ok: true; user: PublicUser } | Fail<keyof ProfilePatch>> {
    const user = await repositories.users.findById(id);
    if (!user) return { ok: false, message: "Không tìm thấy tài khoản." };
    const next: Partial<User> = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 2 || name.length > 80) return { ok: false, field: "name", message: "Họ tên cần từ 2 đến 80 ký tự." };
      next.name = name;
    }
    if (patch.role !== undefined && patch.role !== toPublicUser(user).role) {
      return { ok: false, field: "role", message: "Không thể thay đổi quyền tài khoản từ hồ sơ cá nhân." };
    }
    if (patch.gradYear !== undefined) {
      if (patch.gradYear !== null && !(Number.isInteger(patch.gradYear) && patch.gradYear >= 2020 && patch.gradYear <= 2040)) {
        return { ok: false, field: "gradYear", message: "Năm tốt nghiệp không hợp lệ." };
      }
      next.gradYear = patch.gradYear;
    }
    if (patch.province !== undefined) {
      if (patch.province !== null && !(PROVINCES as readonly string[]).includes(patch.province)) {
        return { ok: false, field: "province", message: "Tỉnh/thành không hợp lệ." };
      }
      next.province = patch.province;
    }
    const under16 = patch.under16 ?? user.under16;
    const parentConsent = patch.parentConsent ?? user.parentConsent;
    if (under16 && !parentConsent) {
      return { ok: false, field: "parentConsent", message: "Người dùng dưới 16 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ." };
    }
    if (patch.under16 !== undefined) next.under16 = patch.under16;
    if (patch.parentConsent !== undefined) next.parentConsent = patch.parentConsent;
    if (patch.onboarded !== undefined) next.onboarded = patch.onboarded;
    if (patch.emailReminders !== undefined) next.emailReminders = patch.emailReminders === true;
    const updated = await repositories.users.update(id, next);
    return { ok: true, user: toPublicUser(updated!) };
  },

  /** Đổi mật khẩu, hoặc tạo mật khẩu lần đầu cho tài khoản chỉ dùng Google. */
  async setPassword(
    id: string,
    input: { current?: string; password: string; confirm: string },
  ): Promise<{ ok: true; user: PublicUser } | Fail<"current" | "password" | "confirm">> {
    const user = await repositories.users.findById(id);
    if (!user) return { ok: false, message: "Không tìm thấy tài khoản." };
    if (user.passwordHash && !(await verifyPassword(input.current ?? "", user.passwordHash))) {
      return { ok: false, field: "current", message: "Mật khẩu hiện tại không đúng." };
    }
    if (!strong(input.password)) return { ok: false, field: "password", message: "Mật khẩu chưa đáp ứng yêu cầu." };
    if (input.password !== input.confirm) return { ok: false, field: "confirm", message: "Mật khẩu xác nhận không khớp." };
    const updated = await repositories.users.update(id, {
      passwordHash: await hashPassword(input.password),
      failedAttempts: 0,
      locked: false,
      lockUntil: null,
      sessionVersion: (user.sessionVersion ?? 0) + 1, // các thiết bị khác phải đăng nhập lại
    });
    return { ok: true, user: toPublicUser(updated!) };
  },

  /** Gỡ liên kết Google — chỉ cho phép khi còn ít nhất 1 cách đăng nhập khác (mật khẩu). */
  async unlinkGoogle(id: string): Promise<{ ok: true; user: PublicUser } | Fail> {
    const user = await repositories.users.findById(id);
    if (!user) return { ok: false, message: "Không tìm thấy tài khoản." };
    if (!user.passwordHash) return { ok: false, message: "Hãy tạo mật khẩu trước khi gỡ Google để không bị mất quyền truy cập tài khoản." };
    const updated = await repositories.users.update(id, { googleId: null });
    return { ok: true, user: toPublicUser(updated!) };
  },

  async deleteAccount(id: string): Promise<boolean> {
    return repositories.users.delete(id);
  },
};
