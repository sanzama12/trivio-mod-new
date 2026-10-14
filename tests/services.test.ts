import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeAdmissionScore, computeComboTotal, computeFit } from "../src/services/scoring.service";
import { parseProgramFilters, serializeProgramFilters } from "../src/services/program.filters";
import { programService } from "../src/services/program.service";
import { riasecService, scoreAnswers } from "../src/services/riasec.service";
import { authService } from "../src/services/auth.service";
import { checkPassword } from "../src/services/password.rules";
import { createSessionToken, readSessionToken } from "../src/services/session.service";
import { hashPassword, verifyPassword } from "../src/services/password.hash";
import { mergeUserData, sanitizeUserData, userDataService } from "../src/services/user-data.service";
import { buildGoogleAuthUrl, fetchGoogleProfile } from "../src/services/google-oauth.service";
import { riasecQuestions } from "../src/data/riasec";
import { programs } from "../src/data/programs";
import { majors } from "../src/data/majors";
import { schools } from "../src/data/schools";

// Database JSON riêng cho test (repository đọc biến này ở lần truy cập đầu tiên).
process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-test-")), "db.json");

test("dữ liệu: mọi chương trình trỏ tới trường/ngành tồn tại, slug duy nhất", () => {
  for (const p of programs) {
    assert.ok(schools.some((s) => s.id === p.schoolId), p.id);
    assert.ok(majors.some((m) => m.id === p.majorId), p.id);
  }
  assert.equal(new Set(programs.map((p) => p.slug)).size, programs.length);
  assert.equal(new Set(programs.map((p) => p.id)).size, programs.length);
  assert.equal(riasecQuestions.length, 60);
});

test("tổng điểm tổ hợp", () => {
  assert.equal(computeComboTotal({ toan: 8.5, ly: 7, hoa: 8 }, { code: "A00", subjects: ["toan", "ly", "hoa"] }), 23.5);
  assert.equal(computeComboTotal({ toan: 8.5, ly: 11, hoa: 8 }, { code: "A00", subjects: ["toan", "ly", "hoa"] }), null);
});

test("điểm ưu tiên giảm dần khi tổng ≥ 22.5", () => {
  const low = computeAdmissionScore(20, "KV1", "none");
  assert.equal(low.priorityApplied, 0.75);
  assert.equal(low.total, 20.75);
  const high = computeAdmissionScore(23.5, "KV1", "none");
  assert.equal(high.reduced, true);
  assert.equal(high.priorityApplied, 0.65); // (30-23.5)/7.5*0.75
  assert.equal(high.total, 24.15);
  assert.equal(computeAdmissionScore(29.9, "KV1", "UT1").total <= 30, true);
});

test("mức độ phù hợp", () => {
  const p = programs.find((x) => x.id === "neu-marketing")!;
  assert.equal(computeFit(28, p)?.level, "an-toan");
  assert.equal(computeFit(26.5, p)?.level, "vua-suc");
  assert.equal(computeFit(25, p)?.level, "thu-suc");
  assert.equal(computeFit(null, p), null);
});

test("parse/serialize bộ lọc", () => {
  const f = parseProgramFilters({ q: "marketing", score: "26.5", combos: "A00,D01", tuition: "15-30", regions: "bac,xx", page: "2" });
  assert.deepEqual(f.regions, ["bac"]);
  assert.equal(f.score, 26.5);
  assert.equal(serializeProgramFilters(f), "?q=marketing&score=26.5&combos=A00%2CD01&tuition=15-30&regions=bac&page=2");
});

test("tìm kiếm + gợi ý khi rỗng", async () => {
  const r = await programService.search({ q: "marketing" });
  assert.ok(r.total >= 4);
  const empty = await programService.search({ q: "marketing", tuition: "duoi-15", regions: ["trung"] });
  assert.equal(empty.total, 0);
  assert.ok(empty.suggestions.length > 0);
  const scored = await programService.search({ score: 26.5, combos: ["A00"] });
  assert.equal(scored.items[0].fit?.level, "vua-suc");
});

test("RIASEC: chấm điểm và gợi ý", async () => {
  const answers: Record<number, number> = {};
  for (const q of riasecQuestions) answers[q.id] = q.type === "E" ? 5 : q.type === "A" ? 4 : q.type === "S" ? 4 : 2;
  answers[31] = 5; // 1 câu S lên 5 để S > A
  const r = scoreAnswers(riasecQuestions, answers);
  assert.deepEqual(r.code, ["E", "S", "A"]);
  assert.equal(r.percents.E, 100);
  const recs = await riasecService.recommendMajors(r);
  assert.ok(["marketing", "quan-he-cong-chung", "quan-tri-du-lich", "quan-tri-dich-vu-du-lich-va-lu-hanh"].includes(recs[0].major.id), recs[0].major.id);
});

test("xác thực: sai mật khẩu, khoá, đăng ký trùng email", async () => {
  const bad = await authService.login("an@trovio.vn", "sai");
  assert.equal(bad.ok, false);
  assert.equal(!bad.ok && bad.reason, "invalid");
  const good = await authService.login("an@trovio.vn", "Trovio@2026");
  assert.equal(good.ok, true);
  const locked = await authService.login("binh.locked@trovio.vn", "Trovio@2026");
  assert.equal(!locked.ok && locked.reason, "locked");
  const dup = await authService.register({ name: "A B", email: "an@trovio.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.equal(!dup.ok && dup.field, "email");
  assert.equal(checkPassword("abc").every((c) => c.passed), false);
});

test("session token có chữ ký và hết hạn", () => {
  const t = createSessionToken("u-001", 0);
  assert.equal(readSessionToken(t, 1000)?.uid, "u-001");
  assert.equal(readSessionToken(t + "x", 1000), null);
  assert.equal(readSessionToken(t, 1000 * 60 * 60 * 24 * 8), null);
});

test("băm mật khẩu scrypt", async () => {
  const h = await hashPassword("Trovio@2026");
  assert.match(h, /^scrypt\$/);
  assert.notEqual(h, await hashPassword("Trovio@2026")); // salt ngẫu nhiên
  assert.equal(await verifyPassword("Trovio@2026", h), true);
  assert.equal(await verifyPassword("sai", h), false);
  assert.equal(await verifyPassword("x", null), false);
});

test("đặt lại mật khẩu: token ký, dùng 1 lần", async () => {
  const { token } = await authService.requestPasswordReset("an@trovio.vn");
  assert.equal((await authService.resetPassword("reset-u-001", "Moi@12345")).ok, false); // token kiểu cũ không còn hợp lệ
  assert.equal((await authService.resetPassword(token, "Moi@12345")).ok, true);
  assert.deepEqual(await authService.resetPassword(token, "Khac@12345"), { ok: false, reason: "expired" }); // đã dùng
  assert.equal((await authService.login("an@trovio.vn", "Moi@12345")).ok, true);
});

test("Google: tạo mới, liên kết theo email, xung đột, gỡ liên kết", async () => {
  const g = { sub: "g-111", email: "moi@gmail.com", emailVerified: true, name: "Lê Minh", picture: null };
  const created = await authService.loginWithGoogle(g);
  assert.ok(created.ok && created.isNew && created.user.hasGoogle && !created.user.hasPassword && created.user.verified);
  const again = await authService.loginWithGoogle(g);
  assert.ok(again.ok && !again.isNew && again.user.id === (created.ok ? created.user.id : ""));
  // Tài khoản chỉ có Google đăng nhập bằng mật khẩu → báo google_only
  assert.equal(((await authService.login("moi@gmail.com", "x")) as { reason: string }).reason, "google_only");
  // Chưa có mật khẩu thì không được gỡ Google
  const uid = created.ok ? created.user.id : "";
  assert.equal((await authService.unlinkGoogle(uid)).ok, false);
  assert.equal((await authService.setPassword(uid, { password: "Abcdefg1", confirm: "Abcdefg1" })).ok, true);
  assert.equal((await authService.login("moi@gmail.com", "Abcdefg1")).ok, true);
  assert.equal((await authService.unlinkGoogle(uid)).ok, true);

  // Trùng email với tài khoản mật khẩu → tự liên kết
  const linked = await authService.loginWithGoogle({ ...g, sub: "g-222", email: "an@trovio.vn" });
  assert.ok(linked.ok && !linked.isNew && linked.user.id === "u-001" && linked.user.hasGoogle && linked.user.hasPassword);
  // Google đã gắn với tài khoản khác → xung đột khi liên kết
  assert.deepEqual(await authService.loginWithGoogle({ ...g, sub: "g-222" }, { linkToUserId: uid }), { ok: false, reason: "conflict" });
  assert.deepEqual(await authService.loginWithGoogle({ ...g, emailVerified: false }), { ok: false, reason: "email_unverified" });
});

test("hồ sơ: dưới 16 tuổi cần phụ huynh đồng ý", async () => {
  const bad = await authService.updateProfile("u-001", { under16: true });
  assert.equal(bad.ok, false);
  const ok = await authService.updateProfile("u-001", { under16: true, parentConsent: true, province: "Huế", gradYear: 2028, role: "student" });
  assert.ok(ok.ok && ok.user.province === "Huế");
  assert.equal((await authService.updateProfile("u-001", { province: "Không tồn tại" })).ok, false);
});

test("đồng bộ: gộp dữ liệu khách vào tài khoản", async () => {
  const quiz = (at: string, saved = false) => ({ result: { percents: {}, ranking: [], code: ["R", "I", "A"], completedAt: at }, savedToProfile: saved });
  const server = sanitizeUserData({ saved: ["a", "b"], wishlist: [{ id: "a", note: "" }], quiz: quiz("2026-01-01", true) });
  const local = sanitizeUserData({ saved: ["c", "a"], wishlist: [{ id: "a", note: "ghi chú" }, { id: "c", note: "x" }], quiz: quiz("2026-02-01") });
  const m = mergeUserData(server, local);
  assert.deepEqual(m.saved, ["a", "b", "c"]);
  assert.deepEqual(m.wishlist, [{ id: "a", note: "ghi chú" }, { id: "c", note: "x" }]);
  assert.equal(m.quiz?.result.completedAt, "2026-02-01");
  assert.deepEqual(sanitizeUserData({ saved: ["<script>", 1, "ok-id"] }).saved, ["ok-id"]);

  const id = programs[0].id;
  const r = await userDataService.mergeLocal("u-001", { saved: [id, "khong-ton-tai"], wishlist: [{ id, note: "" }] });
  assert.deepEqual(r.data.saved, [id]);
  assert.equal(r.added, 2);
  assert.equal((await userDataService.mergeLocal("u-001", { saved: [id] })).added, 0);
});

test("Google OAuth: URL xin quyền tối thiểu & đọc userinfo", async () => {
  process.env.GOOGLE_CLIENT_ID = "cid";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  const url = new URL(buildGoogleAuthUrl({ redirectUri: "http://localhost:3000/api/auth/google/callback", state: "s1" }));
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("state"), "s1");
  const calls: string[] = [];
  const fakeFetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    if (String(input).includes("token")) return Response.json({ access_token: "at" });
    return Response.json({ sub: "123", email: "HS@Gmail.com", email_verified: true, name: "Học Sinh", picture: "https://x/y.png" });
  }) as typeof fetch;
  const p = await fetchGoogleProfile("code", "http://localhost:3000/api/auth/google/callback", fakeFetch);
  assert.deepEqual(p, { sub: "123", email: "hs@gmail.com", emailVerified: true, name: "Học Sinh", picture: "https://x/y.png" });
  assert.equal(calls.length, 2);
});
