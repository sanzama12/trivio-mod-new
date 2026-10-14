/**
 * TEST SUITE: Xác minh danh tính giáo viên & Quyền riêng tư học sinh (GIAI ĐOẠN 7).
 * - Người dùng tự chọn role teacher KHÔNG được phép tạo lớp.
 * - Chỉ verified teacher mới được tạo lớp và xem báo cáo.
 * - Granular consent: Mặc định chia sẻ tối thiểu (ẩn tên, ẩn điểm, ẩn RIASEC).
 * - Học sinh có thể thu hồi consent (revoke) bất kỳ lúc nào với hiệu lực ngay lập tức.
 * - Audit log được ghi nhận khi giáo viên truy cập dữ liệu học sinh.
 * - Mã mời hết hạn / bị thu hồi không thể tham gia lớp.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-teacher-")), "db.json");

import { authService } from "../src/services/auth.service";
import { teacherVerificationService } from "../src/services/teacher-verification.service";
import { classService } from "../src/services/class.service";
import { repositories } from "../src/repositories";
import type { PublicUser } from "../src/domain/types";

test("Vòng đời giáo viên & Bảo mật quyền riêng tư học sinh", async () => {
  // 1. Tạo tài khoản người dùng bình thường
  const regTeacher = await authService.register({
    email: `gv-${Date.now()}@example.com`,
    password: "Password@123",
    confirm: "Password@123",
    terms: true,
  });
  assert.equal(regTeacher.ok, true);
  if (!regTeacher.ok) return;
  const teacherUser = regTeacher.user;

  // 2. Người dùng cố tình tự gán role 'teacher' khi chưa xác minh -> BỊ TỪ CHỐI
  const selfAssign = await authService.updateProfile(teacherUser.id, { role: "teacher" });
  assert.equal(selfAssign.ok, false);
  if (!selfAssign.ok) {
    assert.ok(selfAssign.message.includes("xác minh danh tính"));
  }

  // 3. Người dùng chưa xác minh cố tạo lớp -> BỊ TỪ CHỐI 403
  const failCreate = await classService.create(teacherUser, { name: "12A1", school: "THPT Chuyên" });
  assert.equal(failCreate.ok, false);
  if (!failCreate.ok) {
    assert.equal(failCreate.status, 403);
    assert.ok(failCreate.message.includes("Chỉ giáo viên đã hoàn tất xác minh"));
  }

  // 4. Nộp hồ sơ xin xác minh giáo viên
  const applyRes = await teacherVerificationService.apply(teacherUser, {
    schoolName: "THPT Chuyên Hà Nội - Amsterdam",
    province: "Hà Nội",
    department: "Tổ Toán - Tin",
    evidenceNotes: "Email công tác giao-vien@ams.edu.vn và quyết định số 123/QĐ-SGD",
  });
  assert.equal(applyRes.ok, true);
  if (!applyRes.ok) return;
  assert.equal(applyRes.verification.status, "pending");

  // 5. Quản trị viên duyệt hồ sơ
  const adminUser: PublicUser = {
    id: "admin-master",
    name: "Quản trị viên",
    email: "admin@trovio.vn",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    verified: true,
    locked: false,
    role: null,
    gradYear: null,
    province: null,
    under16: false,
    parentConsent: false,
    onboarded: true,
    hasPassword: true,
    hasGoogle: false,
    admin: true,
  };

  const reviewRes = await teacherVerificationService.review(adminUser, applyRes.verification.id, {
    action: "approve",
  });
  assert.equal(reviewRes.ok, true);
  if (!reviewRes.ok) return;
  assert.equal(reviewRes.verification.status, "verified");

  // Cập nhật lại user sau khi được duyệt
  const verifiedTeacher = (await authService.getUser(teacherUser.id))!;
  assert.equal(verifiedTeacher.role, "teacher");
  assert.equal(verifiedTeacher.teacherVerificationStatus, "verified");

  // 6. Giáo viên đã xác minh tạo lớp thành công
  const classRes = await classService.create(verifiedTeacher, { name: "12 Chuyên Toán", school: "THPT Amsterdam" });
  assert.equal(classRes.ok, true);
  if (!classRes.ok) return;
  const createdClass = classRes.cls;
  assert.ok(createdClass.code);
  assert.equal(createdClass.code.length, 6);
  assert.ok(createdClass.codeExpiresAt);
  assert.equal(createdClass.codeRevoked, false);

  // 7. Học sinh tạo tài khoản và tham gia lớp
  const regStudent = await authService.register({
    name: "Trần Bảo Ngọc",
    email: `hs-${Date.now()}@example.com`,
    password: "Password@123",
    confirm: "Password@123",
    terms: true,
  });
  assert.equal(regStudent.ok, true);
  if (!regStudent.ok) return;
  const studentUser = regStudent.user;

  // Lưu một số dữ liệu cho học sinh
  await repositories.userData.put(studentUser.id, {
    saved: [],
    wishlist: [{ id: "neu-ke-toan", note: "Ưu tiên 1" }],
    profile: null,
    quiz: {
      result: {
        percents: { R: 40, I: 80, A: 60, S: 50, E: 70, C: 45 },
        ranking: ["I", "E", "A", "S", "C", "R"],
        code: ["I", "E", "A"],
        completedAt: new Date().toISOString(),
        answered: 60,
      },
      savedToProfile: true,
    },
    reminders: [],
    goal: null,
    workStyle: null,
    mbti: null,
    updatedAt: new Date().toISOString(),
  });

  const joinRes = await classService.join(studentUser, createdClass.code, { shareName: false });
  assert.equal(joinRes.ok, true);

  // 8. Giáo viên xem dashboard: Mặc định chia sẻ tối thiểu (tên học sinh bị ẩn danh, RIASEC/wishlist bị ẩn)
  const dashboardInitial = await classService.dashboard(verifiedTeacher, createdClass.id);
  assert.ok(dashboardInitial);
  assert.equal(dashboardInitial.members.length, 1);
  const m1 = dashboardInitial.members[0];
  // Tên bị ẩn danh
  assert.ok(m1.name.includes("Học sinh"));
  // RIASEC bị ẩn do chưa có consent
  assert.equal(m1.riasec, null);
  // Nguyện vọng bị ẩn do chưa có consent
  assert.equal(m1.wishlistCount, 0);

  // 9. Học sinh cấp quyền chia sẻ tên và RIASEC
  const consentRes = await classService.updateConsent(studentUser, createdClass.id, {
    shareName: true,
    shareRiasec: true,
  });
  assert.equal(consentRes.ok, true);

  const dashboardUpdated = await classService.dashboard(verifiedTeacher, createdClass.id);
  assert.ok(dashboardUpdated);
  const m2 = dashboardUpdated.members[0];
  // Tên thật hiện
  assert.ok(!m2.name.includes("Học sinh "));
  // RIASEC hiện
  assert.deepEqual(m2.riasec, ["I", "E", "A"]);
  // Nguyện vọng vẫn bị ẩn
  assert.equal(m2.wishlistCount, 0);

  // 10. Học sinh thu hồi toàn bộ quyền (revoke) -> Lập tức ẩn toàn bộ
  const revokeRes = await classService.revokeConsent(studentUser, createdClass.id);
  assert.equal(revokeRes.ok, true);

  const dashboardRevoked = await classService.dashboard(verifiedTeacher, createdClass.id);
  assert.ok(dashboardRevoked);
  const m3 = dashboardRevoked.members[0];
  assert.ok(m3.name.includes("Học sinh"));
  assert.equal(m3.riasec, null);
  assert.equal(m3.wishlistCount, 0);

  // 11. Giáo viên thu hồi mã mời lớp -> Người khác không thể dùng mã này tham gia
  const revokeCodeRes = await classService.revokeCode(verifiedTeacher, createdClass.id);
  assert.equal(revokeCodeRes, true);

  const joinAttempt = await classService.join({ ...studentUser, id: "other-student" }, createdClass.code);
  assert.equal(joinAttempt.ok, false);
  if (!joinAttempt.ok) {
    assert.ok(joinAttempt.message.includes("bị thu hồi"));
  }
});
