/**
 * SERVICE LAYER — Quy trình xác minh danh tính giáo viên (GIAI ĐOẠN 7).
 * - Người dùng nộp hồ sơ xin cấp quyền Giáo viên.
 * - Quản trị viên thẩm định bằng chứng, duyệt hoặc từ chối có lý do.
 * - Chỉ khi trạng thái là 'verified' thì người dùng mới được kích hoạt quyền tạo lớp và cấp mã tham gia.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, TeacherVerification, TeacherVerificationStatus } from "../domain/types";
import { PROVINCES } from "../domain/provinces";
import { repositories } from "@database/repositories";
import { auditService } from "./audit.service";

export interface TeacherApplyInput {
  schoolName: string;
  province: string;
  department?: string;
  evidenceNotes: string;
}

export interface TeacherReviewInput {
  action: "approve" | "reject" | "revoke";
  rejectionReason?: string;
}

export const teacherVerificationService = {
  /** Người dùng nộp hồ sơ xin xác minh danh tính giáo viên */
  async apply(user: PublicUser, input: TeacherApplyInput): Promise<{ ok: true; verification: TeacherVerification } | { ok: false; field?: string; message: string }> {
    const schoolName = (input.schoolName ?? "").trim();
    if (schoolName.length < 3 || schoolName.length > 100) {
      return { ok: false, field: "schoolName", message: "Tên trường công tác cần từ 3 đến 100 ký tự." };
    }

    const province = (input.province ?? "").trim();
    if (!(PROVINCES as readonly string[]).includes(province)) {
      return { ok: false, field: "province", message: "Vui lòng chọn tỉnh/thành phố hợp lệ." };
    }

    const evidenceNotes = (input.evidenceNotes ?? "").trim();
    if (evidenceNotes.length < 10 || evidenceNotes.length > 1000) {
      return { ok: false, field: "evidenceNotes", message: "Thông tin minh chứng công tác (email trường, liên kết website, quyết định phân công) cần từ 10 đến 1000 ký tự." };
    }

    const existing = await repositories.teacherVerifications.findByUserId(user.id);
    const now = new Date().toISOString();

    const verification: TeacherVerification = {
      id: existing ? existing.id : `tv-${randomUUID()}`,
      userId: user.id,
      schoolName,
      province,
      department: (input.department ?? "").trim().slice(0, 100) || undefined,
      evidenceNotes,
      status: "pending",
      requestedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    if (existing) {
      await repositories.teacherVerifications.update(existing.id, verification);
    } else {
      await repositories.teacherVerifications.create(verification);
    }

    await repositories.users.update(user.id, {
      teacherVerificationStatus: "pending",
      teacherVerificationId: verification.id,
    });

    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      action: "teacher_verification_applied",
      targetType: "user",
      targetId: user.id,
      detail: `Nộp hồ sơ xác minh giáo viên tại trường: ${schoolName} (${province})`,
    });

    return { ok: true, verification };
  },

  /** Quản trị viên phê duyệt hoặc từ chối hồ sơ xác minh giáo viên */
  async review(adminUser: PublicUser, verificationId: string, input: TeacherReviewInput): Promise<{ ok: true; verification: TeacherVerification } | { ok: false; message: string }> {
    if (!adminUser.admin) {
      return { ok: false, message: "Yêu cầu quyền quản trị viên để duyệt hồ sơ giáo viên." };
    }

    const verification = await repositories.teacherVerifications.findById(verificationId);
    if (!verification) {
      return { ok: false, message: "Không tìm thấy hồ sơ xác minh." };
    }

    const now = new Date().toISOString();
    let nextStatus: TeacherVerificationStatus = "pending";
    let rejectionReason: string | null = null;

    if (input.action === "approve") {
      nextStatus = "verified";
    } else if (input.action === "reject") {
      nextStatus = "rejected";
      rejectionReason = (input.rejectionReason ?? "").trim() || "Chưa đủ thông tin minh chứng hợp lệ";
    } else if (input.action === "revoke") {
      nextStatus = "revoked";
      rejectionReason = (input.rejectionReason ?? "").trim() || "Thu hồi quyền theo quyết định quản trị";
    }

    const updatedVerification = await repositories.teacherVerifications.update(verification.id, {
      status: nextStatus,
      reviewedAt: now,
      reviewedBy: adminUser.id,
      rejectionReason,
    });

    // Cập nhật trạng thái người dùng
    if (nextStatus === "verified") {
      await repositories.users.update(verification.userId, {
        role: "teacher",
        teacherVerificationStatus: "verified",
      });
    } else {
      // Bị từ chối hoặc thu hồi: hạ quyền role giáo viên
      await repositories.users.update(verification.userId, {
        role: "student",
        teacherVerificationStatus: nextStatus,
      });
    }

    await auditService.log({
      actorId: adminUser.id,
      actorName: adminUser.name,
      action: `teacher_verification_${input.action}`,
      targetType: "user",
      targetId: verification.userId,
      detail: `Quản trị viên ${input.action} hồ sơ giáo viên ${verification.id}. Lý do: ${rejectionReason ?? "Đạt yêu cầu"}`,
    });

    return { ok: true, verification: updatedVerification! };
  },

  /** Xem trạng thái xác minh của người dùng hiện tại */
  async getByUserId(userId: string): Promise<TeacherVerification | null> {
    return repositories.teacherVerifications.findByUserId(userId);
  },

  /** Danh sách hồ sơ xác minh cho trang quản trị */
  async list(filter?: { status?: TeacherVerificationStatus }): Promise<TeacherVerification[]> {
    return repositories.teacherVerifications.list(filter);
  },
};
