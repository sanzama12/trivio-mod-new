/**
 * SERVICE LAYER — xác thực & quản lý tài khoản.
 * Hỗ trợ 2 phương thức: email + mật khẩu (băm scrypt) và Google (OpenID Connect).
 * Hai phương thức được liên kết theo cùng email đã xác minh.
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { PublicUser, User, UserRole } from "../domain/types";
import { PROVINCES } from "../domain/provinces";
import { repositories } from "@database/repositories";
import { checkPassword } from "./password.rules";
import { hashPassword, verifyPassword } from "./password.hash";
import { signToken, verifyToken } from "./session.service";
import { isMailerConfigured, sendMail } from "./mailer";
import { emailError } from "../lib/email-validation";
import { accountRole } from "../domain/access";

export { checkPassword, passwordStrength } from "./password.rules";

export const MAX_LOGIN_ATTEMPTS = 5;
const RESET_TOKEN_TTL = 30 * 60; // 30 phút
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
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
  | { ok: false; reason: "locked"; permanent: boolean; lockUntil?: string | null; attemptsLeft?: number }
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
  | { ok: false; reason: "email_unverified" | "conflict" | "not_found" | "disabled" | "locked" };

export interface ProfilePatch {
  name?: string;
  role?: UserRole | null;
  gradYear?: number | null;
  province?: string | null;
  under16?: boolean;
  parentConsent?: boolean;
  onboarded?: boolean;
}

type Fail<F extends string = string> = { ok: false; field?: F; message: string };

const strong = (pw: string) => checkPassword(pw).every((c) => c.passed);
/** Dấu vân tay mật khẩu hiện tại: đổi mật khẩu xong thì link đặt lại cũ tự mất hiệu lực. */
const passwordFingerprint = (u: User) => (u.passwordHash ? u.passwordHash.slice(-12) : "none");
const TEMP_LOCK_THRESHOLD = 3;
type LockState = Pick<User, "locked" | "lockUntil" | "failedAttempts"> & Partial<Pick<User, "disabled">>;
function accountLock(user: LockState, now = Date.now()): "permanent" | "temporary" | null {
  if (user.disabled || user.failedAttempts >= MAX_LOGIN_ATTEMPTS || (user.locked && !user.lockUntil)) return "permanent";
  if (user.locked && user.lockUntil && Date.parse(user.lockUntil) > now) return "temporary";
  return null;
}
function lockedResult(user: LockState): Extract<LoginResult, { reason: "locked" }> {
  const permanent = accountLock(user) === "permanent";
  return { ok: false, reason: "locked", permanent, lockUntil: permanent ? null : user.lockUntil, attemptsLeft: permanent ? 0 : Math.max(0, MAX_LOGIN_ATTEMPTS - user.failedAttempts) };
}
const resetCodeHash = (userId: string, code: string) => {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET chưa được cấu hình đủ mạnh.");
  return createHmac("sha256", secret).update(`password-reset:${userId}:${code}`).digest("base64url");
};

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
  async requestPasswordResetCode(email: string): Promise<void> {
    if (!isMailerConfigured()) throw new Error("Email provider is not configured.");
    const user = await repositories.users.findByEmail(email.trim().toLowerCase());
    if (!user) return;
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = resetCodeHash(user.id, code);
    if (!(await repositories.passwordResetCodes.save(user.id, hash, new Date(Date.now() + RESET_CODE_TTL_MS).toISOString()))) return;
    try {
      await sendMail({
        to: user.email,
        subject: "Mã khôi phục mật khẩu Trovio",
        text: `Mã khôi phục mật khẩu của bạn là ${code}. Mã có hiệu lực 10 phút và chỉ dùng một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      });
    } catch (error) {
      await repositories.passwordResetCodes.revoke(user.id, hash);
      throw error;
    }
  },

  async verifyPasswordResetCode(email: string, code: string): Promise<{ ok: true; token: string } | { ok: false }> {
    if (!/^\d{6}$/.test(code)) return { ok: false };
    const user = await repositories.users.findByEmail(email.trim().toLowerCase());
    if (!user) return { ok: false };
    const hash = resetCodeHash(user.id, code);
    if (!(await repositories.passwordResetCodes.consume(user.id, hash))) return { ok: false };
    return { ok: true, token: signToken({ uid: user.id, typ: "reset", pv: passwordFingerprint(user) }, 10 * 60) };
  },
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await repositories.users.findByEmail(email);
    // Chống timing attack & chống dò quét tài khoản (GIAI ĐOẠN 8):
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      return { ok: false, reason: "invalid", attemptsLeft: TEMP_LOCK_THRESHOLD - 1 };
    }
    if (accountLock(user)) return lockedResult(user);

    if (!user.passwordHash) return { ok: false, reason: "google_only" };
    if (!(await verifyPassword(password, user.passwordHash))) {
      const failure = await repositories.users.recordFailedLogin(user.id);
      if (!failure) {
        const latest = await repositories.users.findById(user.id);
        return latest && accountLock(latest) ? lockedResult(latest) : { ok: false, reason: "invalid", attemptsLeft: 0 };
      }
      return failure.locked ? lockedResult(failure) : { ok: false, reason: "invalid", attemptsLeft: Math.max(0, TEMP_LOCK_THRESHOLD - failure.failedAttempts) };
    }

    // Đăng nhập thành công -> reset toàn bộ bộ đếm sai và khoá tạm thời
    const active = await repositories.users.clearFailedLogin(user.id);
    if (!active) {
      const latest = await repositories.users.findById(user.id);
      return latest && accountLock(latest) ? lockedResult(latest) : { ok: false, reason: "invalid", attemptsLeft: 0 };
    }
    return { ok: true, user: toPublicUser(active) };
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

  async resetPassword(token: string, password: string): Promise<{ ok: true; lockUntil: string | null } | { ok: false; reason: "expired" | "weak" | "locked" }> {
    const data = verifyToken<{ uid: string; typ: string; pv: string }>(token);
    if (!data || data.typ !== "reset") return { ok: false, reason: "expired" };
    const user = await repositories.users.findById(data.uid);
    if (!user || passwordFingerprint(user) !== data.pv) return { ok: false, reason: "expired" };
    if (accountLock(user) === "permanent") return { ok: false, reason: "locked" };
    if (!strong(password)) return { ok: false, reason: "weak" };
    // Mã hoặc link email chứng minh sở hữu email; không thay đổi trạng thái khóa.
    await repositories.users.update(user.id, {
      passwordHash: await hashPassword(password),
      verified: true,
      sessionVersion: (user.sessionVersion ?? 0) + 1, // đăng xuất mọi phiên cũ
    });
    await repositories.passwordResetCodes.revoke(user.id).catch(() => undefined);
    const active = await repositories.users.clearFailedLogin(user.id);
    if (active) return { ok: true, lockUntil: null };
    const latest = await repositories.users.findById(user.id);
    return accountLock(latest ?? user) === "permanent"
      ? { ok: false, reason: "locked" }
      : { ok: true, lockUntil: latest?.lockUntil ?? user.lockUntil ?? null };
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
    if (byGoogle && accountLock(byGoogle)) return { ok: false, reason: accountLock(byGoogle) === "temporary" ? "locked" : "disabled" };

    if (opts.linkToUserId) {
      const target = await repositories.users.findById(opts.linkToUserId);
      if (!target) return { ok: false, reason: "not_found" };
      if (accountLock(target)) return { ok: false, reason: accountLock(target) === "temporary" ? "locked" : "disabled" };
      if (byGoogle && byGoogle.id !== target.id) return { ok: false, reason: "conflict" };
      const updated = await repositories.users.update(target.id, { googleId: profile.sub, avatarUrl: target.avatarUrl ?? profile.picture });
      return { ok: true, user: toPublicUser(updated!), isNew: false };
    }

    if (byGoogle) {
      await repositories.users.update(byGoogle.id, { avatarUrl: byGoogle.avatarUrl ?? profile.picture });
      const active = await repositories.users.clearFailedLogin(byGoogle.id);
      if (!active) return { ok: false, reason: "disabled" };
      return { ok: true, user: toPublicUser(active), isNew: false };
    }

    const byEmail = await repositories.users.findByEmail(profile.email);
    if (byEmail && accountLock(byEmail)) return { ok: false, reason: accountLock(byEmail) === "temporary" ? "locked" : "disabled" };
    if (byEmail) {
      await repositories.users.update(byEmail.id, {
        googleId: profile.sub,
        avatarUrl: byEmail.avatarUrl ?? profile.picture,
        verified: true,
        // Tài khoản mật khẩu chưa xác thực email có thể do người khác tạo hộ → huỷ mật khẩu đó.
        ...(byEmail.verified ? {} : { passwordHash: null, sessionVersion: (byEmail.sessionVersion ?? 0) + 1 }),
      });
      const active = await repositories.users.clearFailedLogin(byEmail.id);
      if (!active) return { ok: false, reason: "disabled" };
      return { ok: true, user: toPublicUser(active), isNew: false };
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
    if (!user || accountLock(user) || (user.sessionVersion ?? 0) !== sessionVersion) return null;
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
