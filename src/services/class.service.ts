/**
 * SERVICE LAYER — Trang giáo viên chủ nhiệm & Bảo mật dữ liệu học sinh (GIAI ĐOẠN 7).
 * - CHỈ giáo viên đã xác minh danh tính (verified) mới được tạo lớp và xem báo cáo.
 * - Học sinh đồng ý chia sẻ theo từng phạm vi (granular consent): tên, tiến độ, RIASEC, nguyện vọng.
 * - Mặc định chia sẻ tối thiểu (không chia sẻ tên, điểm, trường, RIASEC chi tiết).
 * - Học sinh có thể thu hồi đồng ý (revoke) bất kỳ lúc nào và có hiệu lực ngay lập tức.
 * - Mã mời có hạn sử dụng (7 ngày), có thể thu hồi (revoke), và rate-limit khi tham gia.
 * - Mọi lượt truy cập dữ liệu học sinh của giáo viên đều được ghi vết kiểm toán (audit log).
 */
import { randomInt, randomUUID } from "node:crypto";
import type { PublicUser, RiasecType, StudentShareConsent, TeacherClass } from "../domain/types";
import { DEFAULT_STUDENT_CONSENT } from "../domain/types";
import { repositories } from "../repositories";
import { notificationService } from "./notification.service";
import { fitForProfile } from "./scoring.service";
import { opaqueId } from "./session.service";
import { auditService } from "./audit.service";

type Fail = { ok: false; status: number; field?: string; message: string };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REMIND_COOLDOWN_HOURS = 6;
export const MEMBER_REMIND_HOURS = 24;
export const CLASS_CODE_TTL_DAYS = 7;

const memberKey = (classId: string, memberId: string) => opaqueId(`class:${classId}:${memberId}`);
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const newClassCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
export const normalizeCode = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export interface MemberProgress {
  /** Mã mờ để giáo viên "Gửi nhắc" riêng (không lộ id tài khoản). */
  key: string;
  /** Tên hiển thị (nếu học sinh đồng ý shareName, ngược lại hiển thị "Học sinh [mã]"). */
  name: string;
  remindedAt: string | null;
  quizDone: boolean;
  riasec: RiasecType[] | null;
  hasScore: boolean;
  wishlistCount: number;
  hasSafe: boolean | null;
}

export interface ClassDashboard {
  cls: PublicClass;
  members: MemberProgress[];
  summary: { total: number; quiz: number; score: number; wishlist: number; noSafe: number; riasecTop: Record<RiasecType, number> };
}

const shortName = (full: string) => {
  const p = full.trim().split(/\s+/).filter(Boolean);
  return p.length <= 1 ? (p[0] ?? "Học sinh") : `${p[p.length - 1]} ${p[0].charAt(0).toUpperCase()}.`;
};

/** Thông tin lớp gửi về trình duyệt: bỏ danh sách id nội bộ của học sinh. */
export type PublicClass = Omit<TeacherClass, "memberIds" | "teacherId"> & { memberCount: number };
export const toPublicClass = (c: TeacherClass): PublicClass => ({
  id: c.id,
  name: c.name,
  school: c.school,
  code: c.code,
  codeExpiresAt: c.codeExpiresAt ?? null,
  codeRevoked: c.codeRevoked ?? false,
  createdAt: c.createdAt,
  lastRemindAt: c.lastRemindAt,
  memberCount: c.memberIds.length,
});

export const classService = {
  async listMine(user: PublicUser): Promise<PublicClass[]> {
    // Chỉ giáo viên đã xác minh mới được truy cập danh sách lớp
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return [];
    }
    return (await repositories.classes.listByTeacher(user.id)).map(toPublicClass);
  },

  async create(user: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; cls: PublicClass } | Fail> {
    // Kiểm tra vòng đời giáo viên: người dùng bình thường tự nhận role teacher KHÔNG được phép tạo lớp
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return {
        ok: false,
        status: 403,
        message: "Chỉ giáo viên đã hoàn tất xác minh danh tính chính thức mới được phép tạo lớp và cấp mã tham gia.",
      };
    }

    const name = clean(input.name, 40);
    const school = clean(input.school, 80);
    if (name.length < 2) return { ok: false, status: 400, field: "name", message: "Nhập tên lớp, VD 12A1." };

    let code = newClassCode();
    for (let i = 0; i < 5 && (await repositories.classes.findByCode(code)); i++) code = newClassCode();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLASS_CODE_TTL_DAYS * 86400_000).toISOString();

    try {
      const cls = await repositories.classes.create({
        id: `cls-${randomUUID()}`,
        teacherId: user.id,
        name,
        school,
        code,
        codeExpiresAt: expiresAt,
        codeRevoked: false,
        createdAt: now.toISOString(),
        memberIds: [],
        lastRemindAt: null,
        memberConsents: {},
      });

      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        action: "teacher_class_created",
        targetType: "user",
        targetId: cls.id,
        detail: `Giáo viên tạo lớp ${cls.name} (${cls.school}), mã lớp ${cls.code}, hết hạn sau ${CLASS_CODE_TTL_DAYS} ngày`,
      });

      return { ok: true, cls: toPublicClass(cls) };
    } catch {
      return { ok: false, status: 429, message: "Bạn đã tạo quá nhiều lớp." };
    }
  },

  async join(
    user: PublicUser,
    rawCode: unknown,
    initialConsent?: Partial<StudentShareConsent>
  ): Promise<{ ok: true; cls: Pick<TeacherClass, "id" | "name" | "school"> } | Fail> {
    const code = normalizeCode(rawCode);
    if (code.length !== 6) return { ok: false, status: 400, field: "code", message: "Mã lớp gồm 6 ký tự." };

    const cls = await repositories.classes.findByCode(code);
    if (!cls) return { ok: false, status: 404, field: "code", message: "Không tìm thấy lớp với mã này." };

    if (cls.codeRevoked) {
      return { ok: false, status: 400, field: "code", message: "Mã tham gia lớp này đã bị thu hồi bởi giáo viên." };
    }

    if (cls.codeExpiresAt && Date.parse(cls.codeExpiresAt) < Date.now()) {
      return { ok: false, status: 400, field: "code", message: "Mã tham gia lớp này đã hết hạn hiệu lực. Vui lòng xin mã mới từ giáo viên." };
    }

    if (cls.teacherId === user.id) return { ok: false, status: 400, field: "code", message: "Bạn là giáo viên của lớp này." };

    if (!cls.memberIds.includes(user.id)) {
      if (cls.memberIds.length >= 80) return { ok: false, status: 409, message: "Lớp đã đủ thành viên." };

      // Thiết lập quyền chia sẻ mặc định tối thiểu cho học sinh mới tham gia
      const memberConsents = {
        ...(cls.memberConsents ?? {}),
        [user.id]: {
          ...DEFAULT_STUDENT_CONSENT,
          ...(initialConsent ?? {}),
          updatedAt: new Date().toISOString(),
        },
      };

      await repositories.classes.update(cls.id, {
        memberIds: [...cls.memberIds, user.id],
        memberConsents,
      });

      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        action: "student_class_joined",
        targetType: "user",
        targetId: cls.id,
        detail: `Học sinh tham gia lớp ${cls.name} với quyền chia sẻ mặc định tối thiểu`,
      });
    }

    return { ok: true, cls: { id: cls.id, name: cls.name, school: cls.school } };
  },

  async leave(user: PublicUser, classId: string): Promise<boolean> {
    const cls = await repositories.classes.findById(classId);
    if (!cls || !cls.memberIds.includes(user.id)) return false;

    const memberConsents = { ...(cls.memberConsents ?? {}) };
    delete memberConsents[user.id];

    await repositories.classes.update(cls.id, {
      memberIds: cls.memberIds.filter((m) => m !== user.id),
      memberConsents,
    });

    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      action: "student_class_left",
      targetType: "user",
      targetId: cls.id,
      detail: `Học sinh rời lớp ${cls.name}, thu hồi toàn bộ quyền truy cập dữ liệu`,
    });

    return true;
  },

  /** Cập nhật quyền chia sẻ dữ liệu của học sinh cho một lớp */
  async updateConsent(
    user: PublicUser,
    classId: string,
    consentPatch: Partial<StudentShareConsent>,
  ): Promise<{ ok: true; consent: StudentShareConsent } | Fail> {
    const cls = await repositories.classes.findById(classId);
    if (!cls || !cls.memberIds.includes(user.id)) {
      return { ok: false, status: 404, message: "Bạn không phải thành viên của lớp này." };
    }

    const currentConsent = cls.memberConsents?.[user.id] ?? DEFAULT_STUDENT_CONSENT;
    const updatedConsent: StudentShareConsent = {
      shareName: consentPatch.shareName ?? currentConsent.shareName,
      shareProgress: consentPatch.shareProgress ?? currentConsent.shareProgress,
      shareRiasec: consentPatch.shareRiasec ?? currentConsent.shareRiasec,
      shareWishlist: consentPatch.shareWishlist ?? currentConsent.shareWishlist,
      shareConsultation: consentPatch.shareConsultation ?? currentConsent.shareConsultation,
      updatedAt: new Date().toISOString(),
    };

    const memberConsents = {
      ...(cls.memberConsents ?? {}),
      [user.id]: updatedConsent,
    };

    await repositories.classes.update(cls.id, { memberConsents });

    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      action: "student_consent_updated",
      targetType: "user",
      targetId: cls.id,
      detail: `Học sinh cập nhật quyền chia sẻ: name=${updatedConsent.shareName}, riasec=${updatedConsent.shareRiasec}, wishlist=${updatedConsent.shareWishlist}`,
    });

    return { ok: true, consent: updatedConsent };
  },

  /** Thu hồi toàn bộ quyền chia sẻ dữ liệu với giáo viên lớp này */
  async revokeConsent(user: PublicUser, classId: string): Promise<{ ok: true } | Fail> {
    return this.updateConsent(user, classId, {
      shareName: false,
      shareProgress: false,
      shareRiasec: false,
      shareWishlist: false,
      shareConsultation: false,
    });
  },

  /** Xem quyền chia sẻ hiện tại của học sinh đối với lớp */
  async getConsent(user: PublicUser, classId: string): Promise<StudentShareConsent | null> {
    const cls = await repositories.classes.findById(classId);
    if (!cls || !cls.memberIds.includes(user.id)) return null;
    return cls.memberConsents?.[user.id] ?? DEFAULT_STUDENT_CONSENT;
  },

  /** Thu hồi mã mời (không cho phép tham gia mới) */
  async revokeCode(user: PublicUser, classId: string): Promise<boolean> {
    const cls = await repositories.classes.findById(classId);
    if (!cls || cls.teacherId !== user.id) return false;
    await repositories.classes.update(cls.id, { codeRevoked: true });
    return true;
  },

  /** Đổi mã mời mới với hạn sử dụng 7 ngày */
  async rotateCode(user: PublicUser, classId: string): Promise<string | null> {
    const cls = await repositories.classes.findById(classId);
    if (!cls || cls.teacherId !== user.id) return null;

    let code = newClassCode();
    for (let i = 0; i < 5 && (await repositories.classes.findByCode(code)); i++) code = newClassCode();

    const expiresAt = new Date(Date.now() + CLASS_CODE_TTL_DAYS * 86400_000).toISOString();
    await repositories.classes.update(cls.id, { code, codeExpiresAt: expiresAt, codeRevoked: false });
    return code;
  },

  async joined(user: PublicUser) {
    const list = await repositories.classes.listByMember(user.id);
    const teachers = await Promise.all(list.map((c) => repositories.users.findById(c.teacherId)));
    return list.map((c, i) => ({
      id: c.id,
      name: c.name,
      school: c.school,
      teacher: teachers[i] ? shortName(teachers[i]!.name) : "Giáo viên",
      consent: c.memberConsents?.[user.id] ?? DEFAULT_STUDENT_CONSENT,
    }));
  },

  /**
   * Báo cáo lớp cho giáo viên — tuân thủ quyền riêng tư nghiêm ngặt (GIAI ĐOẠN 7).
   * - Giáo viên phải là giáo viên đã xác minh danh tính.
   * - Chỉ hiển thị thông tin học sinh ĐÃ ĐỒNG Ý chia sẻ.
   * - Ghi vết kiểm toán (audit log) mỗi lần truy cập dữ liệu học sinh.
   */
  async dashboard(user: PublicUser, classId: string): Promise<ClassDashboard | null> {
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return null;
    }

    const cls = await repositories.classes.findById(classId);
    if (!cls || cls.teacherId !== user.id) return null;

    const programs = await repositories.programs.findAll();
    const members: MemberProgress[] = [];

    for (const id of cls.memberIds) {
      const [u, data] = await Promise.all([repositories.users.findById(id), repositories.userData.get(id)]);
      if (!u) continue;

      // Đọc quyền chia sẻ của từng học sinh
      const consent = cls.memberConsents?.[id] ?? DEFAULT_STUDENT_CONSENT;

      const wish = consent.shareWishlist ? (data?.wishlist ?? []) : [];
      const profile = consent.shareProgress ? (data?.profile ?? null) : null;

      let hasSafe: boolean | null = null;
      if (consent.shareWishlist && profile && wish.length) {
        hasSafe = wish.some((w) => {
          const p = programs.find((x) => x.id === w.id);
          return p ? fitForProfile(profile, p).fit?.level === "an-toan" : false;
        });
      }

      // Ẩn danh hóa nếu học sinh không đồng ý chia sẻ tên thật
      const displayName = consent.shareName ? shortName(u.name) : `Học sinh ${id.slice(-4)}`;

      members.push({
        key: memberKey(cls.id, id),
        remindedAt: cls.memberRemindAt?.[id] ?? null,
        name: displayName,
        quizDone: consent.shareProgress ? !!data?.quiz : false,
        riasec: consent.shareRiasec && data?.quiz ? [...data.quiz.result.code] : null,
        hasScore: consent.shareProgress ? !!profile : false,
        wishlistCount: consent.shareWishlist ? wish.length : 0,
        hasSafe: consent.shareWishlist ? hasSafe : null,
      });
    }

    const riasecTop = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as Record<RiasecType, number>;
    for (const m of members) {
      if (m.riasec && m.riasec.length > 0) {
        riasecTop[m.riasec[0]]++;
      }
    }

    // Ghi vết kiểm toán việc giáo viên truy cập báo cáo dữ liệu học sinh
    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      action: "teacher_accessed_class_dashboard",
      targetType: "user",
      targetId: cls.id,
      detail: `Giáo viên truy cập báo cáo lớp ${cls.name} (${cls.school}) gồm ${members.length} học sinh`,
    });

    return {
      cls: toPublicClass(cls),
      members,
      summary: {
        total: members.length,
        quiz: members.filter((m) => m.quizDone).length,
        score: members.filter((m) => m.hasScore).length,
        wishlist: members.filter((m) => m.wishlistCount > 0).length,
        noSafe: members.filter((m) => m.hasSafe === false || (m.wishlistCount > 0 && m.hasSafe === null)).length,
        riasecTop,
      },
    };
  },

  /** Nhắc cả lớp (thông báo trong web). */
  async remind(user: PublicUser, classId: string, input: Record<string, unknown>, now = Date.now()): Promise<{ ok: true; sent: number } | Fail> {
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return { ok: false, status: 403, message: "Chỉ giáo viên đã xác minh mới được thực hiện thao tác này." };
    }
    const cls = await repositories.classes.findById(classId);
    if (!cls || cls.teacherId !== user.id) return { ok: false, status: 404, message: "Không tìm thấy lớp." };
    if (cls.lastRemindAt && now - Date.parse(cls.lastRemindAt) < REMIND_COOLDOWN_HOURS * 3600_000) {
      return { ok: false, status: 429, message: `Mỗi lớp chỉ nhắc ${REMIND_COOLDOWN_HOURS} giờ một lần.` };
    }
    const msg = clean(input.message, 200) || "Nhớ hoàn thành trắc nghiệm sở thích và lập danh sách nguyện vọng trước hạn đăng ký nhé.";
    for (const id of cls.memberIds) {
      await notificationService.notify({ userId: id, kind: "class-reminder", title: `GVCN lớp ${cls.name} nhắc bạn`, body: msg, href: "/moc-tuyen-sinh" });
    }
    await repositories.classes.update(cls.id, { lastRemindAt: new Date(now).toISOString() });
    return { ok: true, sent: cls.memberIds.length };
  },

  /** Nhắc riêng một học sinh (thông báo trong web), tối đa 1 lần / 24 giờ / học sinh. */
  async remindMember(user: PublicUser, classId: string, input: Record<string, unknown>, now = Date.now()): Promise<{ ok: true; sent: 1 } | Fail> {
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return { ok: false, status: 403, message: "Chỉ giáo viên đã xác minh mới được thực hiện thao tác này." };
    }
    const cls = await repositories.classes.findById(classId);
    if (!cls || cls.teacherId !== user.id) return { ok: false, status: 404, message: "Không tìm thấy lớp." };
    const key = typeof input.memberKey === "string" ? input.memberKey : "";
    const memberId = cls.memberIds.find((id) => memberKey(cls.id, id) === key);
    if (!memberId) return { ok: false, status: 404, message: "Học sinh không còn trong lớp." };
    const last = cls.memberRemindAt?.[memberId];
    if (last && now - Date.parse(last) < MEMBER_REMIND_HOURS * 3600_000) return { ok: false, status: 429, message: `Đã nhắc học sinh này trong ${MEMBER_REMIND_HOURS} giờ qua.` };
    const msg = clean(input.message, 200) || "Thầy/cô nhắc em hoàn thành trắc nghiệm sở thích và danh sách nguyện vọng (nhớ có ít nhất 1 nguyện vọng An toàn) nhé.";
    await notificationService.notify({ userId: memberId, kind: "class-reminder", title: `GVCN lớp ${cls.name} nhắc riêng bạn`, body: msg, href: "/da-luu" });
    await repositories.classes.update(cls.id, { memberRemindAt: { ...(cls.memberRemindAt ?? {}), [memberId]: new Date(now).toISOString() } });
    return { ok: true, sent: 1 };
  },

  async remove(user: PublicUser, classId: string) {
    if (user.role !== "teacher" || user.teacherVerificationStatus !== "verified") {
      return false;
    }
    return repositories.classes.delete(classId, user.id);
  },
};
