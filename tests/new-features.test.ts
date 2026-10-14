/**
 * Kiểm thử các tính năng đợt 10/2026: gợi ý có giải thích + mục tiêu, chọn môn lớp 10, ma trận quyết định,
 * kế hoạch B & xét bổ sung, hỏi sinh viên, khảo sát sau 1 năm, kênh giáo viên, huy hiệu "Trường đã xác nhận",
 * đăng ký không bắt buộc tên.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { combos } from "../src/data/combos";
import { programService } from "../src/services/program.service";
import { toLiteProgram, type LiteProgram } from "../src/services/lite";
import { bestSwap, comboStates, planForTargets, programStates, requiredFor, sanitizeElectives } from "../src/services/grade10";
import { DEFAULT_WEIGHTS, rankRows, rateRow, sanitizeWeights, weightedTotal, type DecisionRow } from "../src/services/decision";
import { hasSafe, matchRounds, reEvaluate, roundStatus, suggestPlanB } from "../src/services/plan-b";
import type { SupplementaryRound } from "../src/domain/types";
import { sanitizeGoal } from "../src/services/user-data.service";
import { GOAL_INTEREST_WARNING, RECOMMEND_WEIGHTS, recommendationService } from "../src/services/recommendation.service";
import { authService } from "../src/services/auth.service";
import { verifiedStatus } from "../src/services/verification";
import { adminService } from "../src/services/admin.service";
import { outcomeSurveyService, qaService, redactContacts, summarizeSurveys } from "../src/services/community.service";
import { classService, normalizeCode } from "../src/services/class.service";
import { repositories } from "../src/repositories";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-new-")), "db.json");

const supplementaryRounds: SupplementaryRound[] = [
  { id: "bs-2027-ctu-cntt", programId: "ctu-cong-nghe-thong-tin", quota: 20, minScore: 24.5, combos: ["A00"], opens: "2027-08-20", closes: "2027-08-31", note: "Test fixture" },
];

const must = async <T>(p: Promise<T | null>): Promise<T> => {
  const v = await p;
  assert.ok(v);
  return v;
};
let liteCache: LiteProgram[] | null = null;
const lite = async () => (liteCache ??= (await programService.listAll()).map(toLiteProgram));

test("chọn môn lớp 10: tổ hợp mở/khoá theo môn đã chọn, cả hai chiều", async () => {
  const st = comboStates(combos, ["ly", "hoa", "sinh", "tin"]);
  const by = (c: string) => st.find((s) => s.code === c)!;
  assert.equal(by("A00").ok, true);
  assert.equal(by("B00").ok, true);
  assert.equal(by("D01").ok, true); // toàn môn bắt buộc
  assert.deepEqual(by("C00").missing, ["dia"]);
  assert.equal(by("V00").aptitude, true);
  assert.deepEqual(sanitizeElectives(["ly", "ly", "khong-co", 1, "hoa"]), ["ly", "hoa"]);

  const programs = await lite();
  const states = programStates(programs, combos, ["dia", "ktpl", "amnhac", "mythuat"]);
  assert.ok(states.some((s) => s.status === "locked" && s.need && s.need.missing.length > 0));
  const swap = bestSwap(programs, combos, ["dia", "ktpl", "amnhac", "mythuat"]);
  assert.ok(swap && swap.gain > 0);

  // Chiều ngược lại: muốn học Y khoa → bộ môn phải có Hoá + Sinh.
  assert.deepEqual(requiredFor("y-khoa", programs, combos).sort(), ["hoa", "sinh"]);
  const plan = planForTargets(["y-khoa"], programs, combos);
  assert.equal(plan.electives.length, 4);
  assert.ok(plan.electives.includes("hoa") && plan.electives.includes("sinh"));
  assert.equal(plan.targets[0].open, true);
});

const row = (over: Partial<DecisionRow> = {}): DecisionRow => ({
  programId: "p",
  slug: "p",
  name: "P",
  schoolName: "S",
  schoolCode: "S",
  city: "Hà Nội",
  region: "bac",
  majorRiasec: ["I", "R", "C"],
  cutoffs: { thpt: 25 },
  tuitionMin: 20,
  tuitionMax: 30,
  salaryStart: null,
  salaryDemo: false,
  reviewAvg: null,
  reviewCount: 0,
  ...over,
});

test("ma trận quyết định: trọng số, dữ liệu thiếu = trung tính, xếp hạng", () => {
  const w = sanitizeWeights({ interest: 9, admission: -2, tuition: "x", career: 2.6 });
  assert.equal(w.interest, 5);
  assert.equal(w.admission, 0);
  assert.equal(w.tuition, DEFAULT_WEIGHTS.tuition);
  assert.equal(w.career, 3);

  const r = rateRow(row(), {});
  assert.equal(r.interest.missing, true);
  assert.equal(r.interest.score, 3);
  assert.equal(r.reviews.missing, true);
  const allZero = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0])) as typeof DEFAULT_WEIGHTS;
  assert.equal(weightedTotal(r, allZero), 0);

  const ctx = { score: { method: "thpt" as const, total: 26.5 } };
  assert.equal(rateRow(row({ cutoffs: { thpt: 25 } }), ctx).admission.score, 5); // dư 1,5 điểm
  assert.equal(rateRow(row({ cutoffs: { thpt: 28 } }), ctx).admission.score, 2);

  const ranked = rankRows([row({ programId: "a", cutoffs: { thpt: 24 } }), row({ programId: "b", cutoffs: { thpt: 28 } }), row({ programId: "c", cutoffs: { thpt: 24 } })], ctx, DEFAULT_WEIGHTS);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[2].rank, 1); // đồng hạng
  assert.equal(ranked[1].rank, 3);
});

test("kế hoạch B: chấm lại với điểm thật, chỉ gợi ý An toàn/Vừa sức, xét bổ sung", async () => {
  assert.equal(roundStatus({ opens: "2027-08-25", closes: "2027-09-05" }, "2027-08-24"), "sap-mo");
  assert.equal(roundStatus({ opens: "2027-08-25", closes: "2027-09-05" }, "2027-08-25"), "dang-nhan");
  assert.equal(roundStatus({ opens: "2027-08-25", closes: "2027-09-05" }, "2027-09-06"), "da-dong");

  const programs = await lite();
  const neu = programs.find((p) => p.id === "neu-marketing")!;
  const ev = reEvaluate([neu], { method: "thpt", total: 20, combo: "B00" });
  assert.equal(ev[0].reason, neu.combos.includes("B00") ? null : "combo");
  const low = reEvaluate([neu], { method: "thpt", total: 15, combo: neu.combos[0] });
  assert.equal(hasSafe(low), false);

  const score = { method: "thpt" as const, total: 24, combo: "A00" };
  const plan = suggestPlanB(programs, { score, majorIds: ["cong-nghe-thong-tin"], groupIds: ["cntt"], excludeIds: ["hust-cong-nghe-thong-tin"] }, 20);
  assert.ok(plan.length > 0);
  for (const o of plan) {
    assert.notEqual(o.level, "thu-suc");
    assert.notEqual(o.program.id, "hust-cong-nghe-thong-tin");
    assert.ok(o.program.combos.includes("A00"));
  }

  const m = matchRounds(supplementaryRounds, programs, "2027-08-26", { method: "thpt", total: 24.6, combo: "A00" }, ["cong-nghe-thong-tin"], ["cntt"]);
  const ctu = m.find((x) => x.round.id === "bs-2027-ctu-cntt")!;
  assert.equal(ctu.status, "dang-nhan");
  assert.equal(ctu.eligible, true);
  assert.equal(ctu.relevant, true);
  const low2 = matchRounds(supplementaryRounds, programs, "2027-08-26", { method: "thpt", total: 24.4, combo: "A00" }, [], []);
  assert.equal(low2.find((x) => x.round.id === "bs-2027-ctu-cntt")!.eligible, false);
});

test("mục tiêu: làm sạch dữ liệu client gửi lên", () => {
  assert.equal(sanitizeGoal(null), null);
  assert.equal(sanitizeGoal({ majorId: "marketing" }), null); // thiếu updatedAt
  const g = sanitizeGoal({ majorId: "marketing", method: "thpt", combo: "D01", targetScore: 31, regions: ["bac", "x"], budgetMax: -5, updatedAt: "2026-10-01T00:00:00Z" })!;
  assert.equal(g.majorId, "marketing");
  assert.equal(g.targetScore, null); // vượt thang 30
  assert.deepEqual(g.regions, ["bac"]);
  assert.equal(g.budgetMax, null);
  const dg = sanitizeGoal({ majorId: "<script>", method: "dgnl-hn", combo: "A00", targetScore: 95, updatedAt: "2026-10-01T00:00:00Z" })!;
  assert.equal(dg.majorId, null);
  assert.equal(dg.combo, null); // ĐGNL không có tổ hợp
  assert.equal(dg.targetScore, 95);
});

test("gợi ý có giải thích: tiêu chí + trọng số, cảnh báo mục tiêu lệch, Chưa đủ dữ liệu khi thiếu điểm", async () => {
  const sum = Object.values(RECOMMEND_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const riasec = { percents: { R: 80, I: 90, A: 10, S: 15, E: 10, C: 70 }, code: ["I", "R", "C"] as ["I", "R", "C"] };
  const r = await recommendationService.recommend({ riasec, goalMajorId: "marketing" });
  assert.ok(r.goal && r.goal.interest !== null && r.goal.interest < GOAL_INTEREST_WARNING);
  assert.ok(r.goal!.warning && r.goal!.warning.includes("Marketing"));
  assert.ok(r.items.length > 0);
  for (const it of r.items) {
    assert.equal(it.criteria.length, 4);
    assert.equal(it.fitGap, "no-score");
    assert.equal(it.view.fit, null);
  }
  assert.ok(r.items.some((it) => it.goalMatch === "match"));
});

test("đăng ký: tên gọi không bắt buộc, không hỏi SĐT/ngày sinh", async () => {
  const ok = await authService.register({ email: "khongten@x.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.equal(ok.ok, true);
  const u = await must(repositories.users.findByEmail("khongten@x.vn"));
  assert.equal(u.name, "khongten");
  const bad = await authService.register({ name: "A", email: "motchu@x.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.equal(bad.ok, false);
});

test("huy hiệu Trường đã xác nhận: hiệu lực 12 tháng, quản trị viên gắn/gỡ có nhật ký", async () => {
  const now = new Date("2026-10-03T00:00:00Z");
  assert.equal(verifiedStatus({ schoolVerifiedAt: "2026-09-15" }, now).active, true);
  assert.equal(verifiedStatus({ schoolVerifiedAt: "2025-09-01" }, now).expired, true);
  assert.equal(verifiedStatus({ schoolVerifiedAt: null }, now).active, false);

  const admin = await must(authService.getUser("u-000"));
  const id = "ftu-kinh-doanh-quoc-te";
  const prog = await repositories.programs.findById(id);
  if (!prog) return; // dữ liệu không có chương trình này → bỏ qua
  assert.equal((await adminService.setSchoolVerified(admin, id, true, "")).ok, false); // thiếu căn cứ
  assert.equal((await adminService.setSchoolVerified(admin, id, true, "Email phòng tuyển sinh 12/9")).ok, true);
  const after = await must(repositories.programs.findById(id));
  assert.equal(after.schoolVerifiedAt, new Date().toISOString().slice(0, 10));
  assert.ok((await adminService.listAudit(5)).some((a) => a.programId === id && a.action === "verify"));
  assert.equal((await adminService.setSchoolVerified(admin, id, false, "")).ok, true);
  assert.equal((await must(repositories.programs.findById(id))).schoolVerifiedAt, null);
  // dữ liệu demo
  assert.equal((await must(repositories.programs.findById("neu-marketing"))).schoolVerifiedAt, "2026-09-15");
});

test("hỏi sinh viên: ẩn danh, kiểm duyệt, chỉ email trường được trả lời", async () => {
  assert.equal(redactContacts("gọi 0912 345 678 hoặc a.b@gmail.com, xem https://x.vn"), "gọi [đã ẩn số điện thoại] hoặc [đã ẩn email], xem [đã ẩn đường dẫn]");
  const student = await must(authService.getUser("u-001"));
  const linh = await must(authService.getUser("u-004"));
  const admin = await must(authService.getUser("u-000"));

  assert.equal((await qaService.ask(student, "neu-marketing", { text: "ngắn" })).ok, false);
  const asked = await qaService.ask(student, "neu-marketing", { text: "Học Marketing ở NEU có cần giỏi tiếng Anh không ạ?" });
  assert.ok(asked.ok);
  const qid = asked.ok ? asked.id : "";
  assert.ok(!(await qaService.listForProgram("neu-marketing", null)).some((q) => q.id === qid)); // chưa duyệt → người khác không thấy
  assert.ok((await qaService.listForProgram("neu-marketing", student.id)).some((q) => q.id === qid && q.status === "pending"));
  assert.equal((await qaService.answer(linh, qid, { text: "Trả lời trước khi câu hỏi được duyệt nhé bạn." })).ok, false);
  assert.ok((await qaService.moderate(admin, { questionId: qid, action: "approve" })).ok);

  assert.equal((await qaService.canAnswer(student, "neu-marketing")).ok, false);
  assert.equal((await qaService.canAnswer(linh, "neu-marketing")).ok, true);
  const denied = await qaService.answer(student, qid, { text: "Mình không phải sinh viên NEU nhưng nghĩ là cần." });
  assert.equal(denied.ok ? 0 : denied.status, 403);
  assert.ok((await qaService.answer(linh, qid, { text: "Có bạn ạ, nhiều môn chuyên ngành dùng giáo trình tiếng Anh, liên hệ mình qua 0912345678." })).ok);
  const pend = (await qaService.pending()).find((q) => q.id === qid)!;
  const ans = pend.answers.find((a) => a.status === "pending")!;
  assert.ok(ans.text.includes("[đã ẩn số điện thoại]"));
  assert.ok((await qaService.moderate(admin, { questionId: qid, answerId: ans.id, action: "approve" })).ok);
  const pub = (await qaService.listForProgram("neu-marketing", null)).find((q) => q.id === qid)!;
  assert.equal(pub.answers.length, 1);
  assert.equal(pub.answers[0].schoolDomain, "st.neu.edu.vn");
  assert.ok(!("userId" in pub.answers[0]));
  const notes = await repositories.notifications.listByUser(student.id);
  assert.ok(notes.some((n) => n.kind === "qa-answer"));
});

test("khảo sát sau 1 năm: ẩn khi < 20 phản hồi, lọc lời nhắn, mỗi tài khoản 1 lần", async () => {
  const base = { satisfaction: 5 as const, chooseAgain: "yes" as const, trovioRight: "yes" as const, wish: "", demo: false };
  const few = summarizeSurveys(Array.from({ length: 19 }, () => base));
  assert.equal(few.hidden, true);
  const many = summarizeSurveys([{ ...base, wish: "Liên hệ mình qua zalo 0912345678" }, { ...base, wish: "Năm nhất học nhiều Toán" }, ...Array.from({ length: 20 }, () => base)]);
  assert.equal(many.hidden, false);
  assert.equal(many.satisfied, 100);
  assert.equal(many.topWish, "Năm nhất học nhiều Toán");

  const user = await must(authService.getUser("u-001"));
  assert.equal((await outcomeSurveyService.submit(user, { programId: "neu-marketing", satisfaction: 7, chooseAgain: "yes" })).ok, false);
  assert.ok((await outcomeSurveyService.submit(user, { programId: "neu-marketing", satisfaction: 4, chooseAgain: "unsure", wish: "ok" })).ok);
  const again = await outcomeSurveyService.submit(user, { programId: "neu-marketing", satisfaction: 4, chooseAgain: "yes" });
  assert.equal(again.ok ? 0 : again.status, 409);
  const stats = await outcomeSurveyService.stats("neu-marketing");
  assert.ok(stats.n >= 20 && !stats.hidden);
});

test("kênh giáo viên: tạo lớp, học sinh nhập mã, chỉ thấy tiến độ, nhắc có giới hạn", async () => {
  const teacher = await must(authService.getUser("u-003"));
  const student = await must(authService.getUser("u-001"));
  assert.equal(teacher.role, "teacher");
  const denied = await classService.create(student, { name: "12A9" });
  assert.equal(denied.ok ? 0 : denied.status, 403);
  const created = await classService.create(teacher, { name: "12A2", school: "THPT Thử nghiệm" });
  assert.ok(created.ok);
  const cls = created.ok ? created.cls : null!;
  assert.match(cls.code, /^[A-Z2-9]{6}$/);
  assert.ok(!("memberIds" in cls));

  assert.equal(normalizeCode(` ${cls.code.slice(0, 3).toLowerCase()}-${cls.code.slice(3)} `), cls.code);
  assert.ok((await classService.join(student, cls.code.toLowerCase())).ok);
  assert.equal((await classService.join(teacher, cls.code)).ok, false);
  assert.equal(await classService.dashboard(student, cls.id), null); // học sinh không xem được bảng lớp

  const dash = await must(classService.dashboard(teacher, cls.id));
  assert.equal(dash.summary.total, 1);
  assert.ok(!("memberIds" in dash.cls));
  const m = dash.members[0];
  // "key" là mã mờ (HMAC) để nhắc riêng — không lộ id; vẫn không có điểm, trường hay email.
  assert.deepEqual(Object.keys(m).sort(), ["hasSafe", "hasScore", "key", "name", "quizDone", "remindedAt", "riasec", "wishlistCount"]);
  assert.equal(m.name, "An N.");

  const t0 = Date.now();
  const r1 = await classService.remind(teacher, cls.id, { message: "Hạn đăng ký nguyện vọng sắp tới nhé" }, t0);
  assert.ok(r1.ok && r1.sent === 1);
  const r2 = await classService.remind(teacher, cls.id, {}, t0 + 3600_000);
  assert.equal(r2.ok ? 0 : r2.status, 429);
  assert.ok((await repositories.notifications.listByUser(student.id)).some((n) => n.kind === "class-reminder"));

  assert.ok((await classService.joined(student)).some((c) => c.id === cls.id));
  assert.equal(await classService.leave(student, cls.id), true);
  assert.equal(await classService.remove(teacher, cls.id), true);
  // lớp minh hoạ có sẵn
  assert.ok(await repositories.classes.findByCode("DEMO12"));
});
