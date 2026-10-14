/**
 * Kiểm thử các tính năng: nhiều phương thức xét tuyển, kiểm tra chiến lược nguyện vọng, mô phỏng điểm,
 * gợi ý "Dành cho bạn", chia sẻ cho phụ huynh, quản trị dữ liệu, mốc tuyển sinh, bảo mật phiên/OTP.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StoredProfile } from "../src/domain/types";
import { computeAdmissionScore, computeFit, cutoffFor, fitForProfile, pointsToSafe, profileScore } from "../src/services/scoring.service";
import { parseProgramFilters, serializeProgramFilters } from "../src/services/program.filters";
import { programService } from "../src/services/program.service";
import { analyzeWishlist, simulateDelta, type StrategyItem } from "../src/services/wishlist-strategy";
import { recommendationService } from "../src/services/recommendation.service";
import { shareService } from "../src/services/share.service";
import { adminService, validateProgramEdit } from "../src/services/admin.service";
import { authService } from "../src/services/auth.service";
import { userDataService, sanitizeUserData, mergeUserData } from "../src/services/user-data.service";
import { applyProgramPatch } from "../src/models/program.model";
import { buildIcs, upcomingReminders, daysUntil } from "../src/lib/timeline";
import { rateLimit } from "../src/lib/rate-limit";
import { createSessionToken, readSessionToken } from "../src/services/session.service";
import { programs } from "../src/data/programs";
import { admissionTimeline } from "../src/data/admission-timeline";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-feat-")), "db.json");

const baseProfile = (over: Partial<StoredProfile> = {}): StoredProfile => ({
  method: "thpt",
  combo: "A00",
  scores: { toan: 9, ly: 8.5, hoa: 8.5 },
  priorityRegion: "KV3",
  priorityGroup: "none",
  regions: [],
  budgetMax: null,
  schoolTypes: [],
  groupIds: [],
  admission: computeAdmissionScore(26, "KV3", "none"),
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});
const P = (id: string) => programs.find((p) => p.id === id)!;
const item = (id: string): StrategyItem => ({ id, label: id, program: P(id) });

test("phương thức: quy đổi ưu tiên & ngưỡng theo thang điểm", () => {
  // ĐGNL HCM thang 1200: ưu tiên KV1 0.75 → 30 điểm; ngưỡng giảm dần 900
  const low = computeAdmissionScore(800, "KV1", "none", "dgnl-hcm");
  assert.equal(low.priorityApplied, 30);
  assert.equal(low.total, 830);
  const high = computeAdmissionScore(1000, "KV1", "none", "dgnl-hcm");
  assert.equal(high.reduced, true);
  assert.equal(high.priorityApplied, 20); // (1200-1000)/300*30
  assert.equal(computeAdmissionScore(149, "KV1", "UT1", "dgnl-hn").total <= 150, true);
  // THPT giữ nguyên như cũ
  assert.equal(computeAdmissionScore(23.5, "KV1", "none").priorityApplied, 0.65);

  const hcmus = P("hcmus-khoa-hoc-may-tinh");
  const cut = cutoffFor(hcmus, "dgnl-hcm")!;
  assert.ok(cut.score > 550 && cut.score <= 1050);
  assert.equal(computeFit(cut.score + 40, hcmus, "dgnl-hcm")!.level, "an-toan");
  assert.equal(computeFit(cut.score - 20, hcmus, "dgnl-hcm")!.level, "vua-suc");
  assert.equal(computeFit(cut.score - 21, hcmus, "dgnl-hcm")!.level, "thu-suc");
  assert.equal(cutoffFor(P("hust-cong-nghe-thong-tin"), "dgnl-hcm"), null);
});

test("phương thức: lý do không xét (tổ hợp / phương thức) và điểm cần thêm", () => {
  const hust = P("hust-cong-nghe-thong-tin");
  assert.equal(fitForProfile(baseProfile({ combo: "D01" }), hust).reason, "combo");
  const dgnl = baseProfile({ method: "dgnl-hcm", combo: "", scores: {}, admission: computeAdmissionScore(900, "KV3", "none", "dgnl-hcm") });
  assert.equal(fitForProfile(dgnl, hust).reason, "method");
  assert.equal(fitForProfile(dgnl, P("ueh-marketing")).reason, null); // ĐGNL không cần tổ hợp
  assert.equal(profileScore(dgnl).total, 900);
  // Hồ sơ cũ (không có method) = THPT
  const legacy = baseProfile();
  delete (legacy as Partial<StoredProfile>).method;
  assert.equal(profileScore(legacy).method, "thpt");
  assert.equal(pointsToSafe(26, hust), 3.45); // 28.45 + 1 − 26
});

test("tìm kiếm theo phương thức: lọc chương trình có điểm chuẩn phương thức đó", async () => {
  const f = parseProgramFilters({ method: "dgnl-hcm", score: "900" });
  assert.equal(f.method, "dgnl-hcm");
  assert.equal(f.score, 900); // > 30 hợp lệ vì thang 1200
  assert.equal(parseProgramFilters({ score: "900" }).score, undefined); // THPT không nhận 900
  assert.equal(parseProgramFilters({ method: "abc" }).method, undefined);
  assert.equal(serializeProgramFilters(f), "?method=dgnl-hcm&score=900");
  const r = await programService.search({ ...f, pageSize: 100 });
  assert.ok(r.total > 0);
  assert.ok(r.items.every((v) => v.cutoffMethod === "dgnl-hcm" && v.latestCutoff != null && v.fit != null));
});

test("kiểm tra chiến lược: thiếu an toàn, thứ tự ngược, sai tổ hợp, vượt ngân sách", () => {
  const profile = baseProfile({ budgetMax: 30 }); // 26 điểm THPT, A00
  // hust IT (28.45 → thử sức), vnua CNTP (20.5 → an toàn), neu CNTT (26.3 → vừa sức), fpt SE (21, học phí 54 → an toàn nhưng vượt ngân sách)
  const items = ["vnua-cong-nghe-thuc-pham", "hust-cong-nghe-thong-tin", "neu-cong-nghe-thong-tin", "fpt-ky-thuat-phan-mem"].map(item);
  const r = analyzeWishlist(items, profile);
  const ids = r.checks.map((c) => c.id);
  assert.ok(ids.includes("order"));
  assert.ok(ids.includes("budget"));
  assert.equal(r.status, "warning");
  assert.deepEqual(r.suggestedOrder, ["hust-cong-nghe-thong-tin", "neu-cong-nghe-thong-tin", "vnua-cong-nghe-thuc-pham", "fpt-ky-thuat-phan-mem"]);
  // Sau khi sắp theo gợi ý thì không còn cảnh báo thứ tự
  const again = analyzeWishlist(r.suggestedOrder!.map(item), profile);
  assert.ok(!again.checks.some((c) => c.id === "order"));

  const noSafe = analyzeWishlist(["hust-cong-nghe-thong-tin", "neu-cong-nghe-thong-tin"].map(item), profile);
  assert.equal(noSafe.status, "danger");
  assert.ok(noSafe.checks.some((c) => c.id === "no-safe"));

  const combo = analyzeWishlist(["ussh-quan-he-cong-chung"].map(item), profile); // không xét A00
  assert.ok(combo.checks.some((c) => c.id === "combo" && c.level === "danger"));

  const noProfile = analyzeWishlist(items, null);
  assert.equal(noProfile.status, "incomplete");
  assert.equal(analyzeWishlist([], profile).checks.length, 0);
});

test("mô phỏng: +2 điểm làm chương trình chuyển mức", () => {
  const profile = baseProfile(); // 26
  const sim = simulateDelta(["hust-cong-nghe-thong-tin", "neu-cong-nghe-thong-tin"].map(item), profile, 2);
  const neu = sim.find((x) => x.id === "neu-cong-nghe-thong-tin")!;
  assert.equal(neu.before, "vua-suc");
  assert.equal(neu.after, "an-toan");
  assert.equal(neu.changed, true);
  assert.equal(simulateDelta([item("neu-cong-nghe-thong-tin")], profile, 0)[0].changed, false);
});

test("gợi ý Dành cho bạn: có lý do, đúng ngân sách, đa dạng", async () => {
  const none = await recommendationService.recommend({});
  assert.equal(none.items.length, 0);
  assert.deepEqual(none.missing, ["quiz", "score"]);

  const riasec = { percents: { R: 20, I: 90, A: 40, S: 30, E: 50, C: 70 }, code: ["I", "C", "E"] as ["I", "C", "E"] };
  const r = await recommendationService.recommend({ riasec, score: { method: "thpt", total: 26, combo: "A00" }, budgetMax: 30, province: "Hà Nội" });
  assert.ok(r.items.length > 0 && r.items.length <= 6);
  for (const x of r.items) {
    assert.ok(x.view.program.tuitionMin <= 30);
    assert.ok(x.view.program.combos.includes("A00"));
    assert.ok(x.reasons.length >= 1 && x.reasons.length <= 3);
  }
  const perSchool = new Map<string, number>();
  for (const x of r.items) perSchool.set(x.view.school.id, (perSchool.get(x.view.school.id) ?? 0) + 1);
  assert.ok([...perSchool.values()].every((n) => n <= 2));
});

test("chia sẻ phụ huynh: tạo, xem, góp ý, giới hạn, thu hồi", async () => {
  const uid = "u-001";
  await userDataService.replace(uid, {
    saved: ["neu-marketing", "hust-cong-nghe-thong-tin"],
    wishlist: [{ id: "neu-marketing", note: "Ghi chú riêng" }, { id: "hust-cong-nghe-thong-tin", note: "" }],
    profile: baseProfile(),
    quiz: null,
    reminders: [],
  });
  const share = await shareService.create(uid, { days: 7, showNotes: false, showScore: false });
  assert.match(share.id, /^[A-Za-z0-9_-]{24}$/);
  const view = await shareService.view(share.id);
  assert.ok(view);
  assert.equal(view.items.length, 2);
  assert.equal(view.items[0].note, null); // ẩn ghi chú
  assert.equal(view.profile, null); // ẩn điểm
  assert.ok(!JSON.stringify(view).includes("@trovio.vn")); // không lộ email

  assert.equal((await shareService.addComment(share.id, { name: "", message: "Ok" })).ok, false);
  assert.equal((await shareService.addComment(share.id, { name: "Mẹ", message: "Con xem thêm trường gần nhà", programId: "khong-co" })).ok, false);
  assert.equal((await shareService.addComment(share.id, { name: "Mẹ\u0000", message: "Con xem thêm trường gần nhà", programId: "neu-marketing" })).ok, true);
  const comments = await shareService.listComments(uid);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].name, "Mẹ"); // đã bỏ ký tự điều khiển
  assert.equal(comments[0].read, false);

  // Tạo link mới thu hồi link cũ
  const second = await shareService.create(uid, { days: 30, showNotes: true, showScore: true });
  assert.equal(await shareService.view(share.id), null);
  const v2 = await shareService.view(second.id);
  assert.equal(v2?.items[0].note, "Ghi chú riêng");
  assert.ok(v2?.scoreLabel?.includes("26.00"));
  await shareService.revoke(uid);
  assert.equal(await shareService.view(second.id), null);
  assert.equal(await shareService.view("../../etc/passwd"), null);
  assert.equal((await shareService.addComment(second.id, { name: "Bố", message: "abc" })).ok, false);
});

test("quản trị: kiểm tra dữ liệu nhập, ghi đè, nhật ký, khôi phục", async () => {
  assert.equal(validateProgramEdit({ cutoffs: [{ year: 2025, score: 31 }] }).ok, false);
  assert.equal(validateProgramEdit({ altCutoffs: [{ method: "dgnl-hn", year: 2025, score: 151 }] }).ok, false);
  assert.equal(validateProgramEdit({ quota: -1 }).ok, false);
  assert.equal(validateProgramEdit({ source: "x" }).ok, false);

  const admin = (await authService.getUser("u-000"))!;
  assert.equal(admin.admin, true);
  assert.equal((await authService.getUser("u-001"))!.admin, false);

  const id = "hust-cong-nghe-thong-tin";
  const bad = await adminService.updateProgram(admin, id, { tuitionMin: 50, tuitionMax: 40 });
  assert.equal(bad.ok, false);
  const r = await adminService.updateProgram(admin, id, {
    cutoffs: [{ year: 2025, score: 28.9 }, { year: 2024, score: 28.53 }, { year: 2023, score: 29.42 }],
    altCutoffs: [{ method: "hocba", year: 2025, score: 29.5 }],
    source: "Đề án tuyển sinh 2026 – ĐHBK Hà Nội (đã kiểm tra)",
  });
  assert.deepEqual(r, { ok: true, changes: 3 });
  const detail = await programService.getBySlug(P(id).slug);
  assert.equal(detail!.program.cutoffs[0].score, 28.9);
  assert.equal(detail!.program.updatedAt, new Date().toISOString().slice(0, 7));
  assert.ok(detail!.program.methods.some((m) => m.key === "hocba")); // tự thêm phương thức học bạ
  const audit = await adminService.listAudit(5);
  assert.equal(audit[0].actorEmail, "admin@trovio.vn");
  assert.ok(audit[0].changes.some((c) => c.field === "cutoffs" && c.before.includes("28.45") && c.after.includes("28.9")));
  assert.deepEqual(await adminService.updateProgram(admin, id, { source: "Đề án tuyển sinh 2026 – ĐHBK Hà Nội (đã kiểm tra)" }), { ok: true, changes: 0 });
  assert.equal(await adminService.reset(admin, id), true);
  assert.equal((await programService.getBySlug(P(id).slug))!.program.cutoffs[0].score, 28.45);

  // applyProgramPatch bỏ phương thức không còn điểm chuẩn
  const p = applyProgramPatch(P("ueh-marketing"), { altCutoffs: [] });
  assert.ok(!p.methods.some((m) => m.key === "hocba" || m.key === "dgnl-hcm"));
});

test("bảo mật: đổi mật khẩu thu hồi phiên cũ, OTP thật khi tắt chế độ demo", async () => {
  const reg = await authService.register({ name: "Lê Test", email: "otp@test.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.ok(reg.ok);
  const uid = reg.ok ? reg.user.id : "";

  const prev = process.env.TROVIO_DEMO;
  process.env.TROVIO_DEMO = "false";
  const logs: string[] = [];
  const orig = console.info;
  console.info = (...a: unknown[]) => void logs.push(a.join(" "));
  try {
    assert.equal((await authService.verifyEmail("otp@test.vn", "592841")).ok, false); // mã demo bị từ chối
    await authService.resendEmailOtp("otp@test.vn");
  } finally {
    console.info = orig;
    process.env.TROVIO_DEMO = prev;
  }
  const code = logs.join("\n").match(/là (\d{6})/)?.[1];
  assert.ok(code, "mailer phải gửi mã");
  process.env.TROVIO_DEMO = "false";
  try {
    assert.equal((await authService.verifyEmail("otp@test.vn", code!)).ok, true);
    assert.equal((await authService.verifyEmail("otp@test.vn", code!)).ok, false); // mã dùng 1 lần
  } finally {
    process.env.TROVIO_DEMO = prev;
  }

  const sv0 = await authService.getSessionVersion(uid);
  const token = createSessionToken(uid, Date.now(), sv0);
  const sess = readSessionToken(token)!;
  assert.ok(await authService.getUserForSession(sess.uid, sess.sv));
  await authService.setPassword(uid, { current: "Abcdefg1", password: "Moimoi123", confirm: "Moimoi123" });
  assert.equal(await authService.getUserForSession(sess.uid, sess.sv), null); // phiên cũ hết hiệu lực
  assert.ok(await authService.getUserForSession(uid, await authService.getSessionVersion(uid)));
  await authService.revokeSessions(uid);
  assert.equal(await authService.getUserForSession(uid, sv0 + 1), null);
});

test("mốc tuyển sinh: .ics hợp lệ, nhắc trong 14 ngày", () => {
  const ev = admissionTimeline[0];
  const ics = buildIcs([{ ...ev, title: "A, B; C" }]);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes("BEGIN:VEVENT") && ics.trim().endsWith("END:VCALENDAR"));
  assert.ok(ics.includes("SUMMARY:A\\, B\; C"));
  assert.ok(ics.includes(`DTSTART;VALUE=DATE:${ev.start.replaceAll("-", "")}`));
  const tenDaysBefore = Date.parse(`${ev.start}T00:00:00+07:00`) - 10 * 86_400_000;
  assert.equal(daysUntil(ev, tenDaysBefore), 10);
  assert.equal(upcomingReminders(admissionTimeline, [ev.id], 14, tenDaysBefore).length, 1);
  assert.equal(upcomingReminders(admissionTimeline, [], 14, tenDaysBefore).length, 0);
  assert.equal(upcomingReminders(admissionTimeline, [ev.id], 5, tenDaysBefore).length, 0);
});

test("đồng bộ nhắc hạn & dữ liệu cũ; giới hạn tần suất", () => {
  const legacy = sanitizeUserData({ saved: ["a"], wishlist: [] }); // dữ liệu cũ chưa có reminders
  assert.deepEqual(legacy.reminders, []);
  const m = mergeUserData(sanitizeUserData({ reminders: ["x-1"] }), sanitizeUserData({ reminders: ["x-2", "x-1", "<bad>"] }));
  assert.deepEqual(m.reminders, ["x-1", "x-2"]);
  assert.equal(sanitizeUserData({ profile: { ...baseProfile(), method: "hack" } }).profile, null);

  const t = 1_000_000;
  assert.equal(rateLimit("t:key", 2, 60, t), 0);
  assert.equal(rateLimit("t:key", 2, 60, t + 1), 0);
  assert.ok(rateLimit("t:key", 2, 60, t + 2) > 0);
  assert.equal(rateLimit("t:key", 2, 60, t + 61_000), 0);
});
