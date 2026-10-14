/**
 * Kiểm thử đợt cải tiến: báo dữ liệu sai + thông báo, lịch tuyển sinh do quản trị cập nhật, nhắc hạn qua email,
 * từ khoá chatbot, đo phễu ẩn danh + SUS, tính chi phí, nhãn "ước tính", lọc cảm nhận theo ngành/khoá.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { authService } from "../src/services/auth.service";
import { adminService } from "../src/services/admin.service";
import { dataReportService } from "../src/services/data-report.service";
import { notificationService } from "../src/services/notification.service";
import { timelineService } from "../src/services/timeline.service";
import { reminderService } from "../src/services/reminder.service";
import { analyticsService, susScore, susGrade, vnDay } from "../src/services/analytics.service";
import { reviewService } from "../src/services/review.service";
import { answerQuestion, chatbotService } from "../src/services/chatbot.service";
import { cutoffFor } from "../src/services/scoring.service";
import { computeCost, defaultTuition, formatMillion } from "../src/lib/cost";
import { repositories } from "../src/repositories";

process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-improve-")), "db.json");

const must = async <T>(p: Promise<T | null>): Promise<T> => {
  const v = await p;
  assert.ok(v);
  return v;
};

/** Bắt email "gửi" qua mailer demo (mailer in ra console.info). */
async function captureMail<T>(fn: () => Promise<T>): Promise<{ result: T; mails: string[] }> {
  const orig = console.info;
  const mails: string[] = [];
  console.info = (...args: unknown[]) => {
    const s = args.map(String).join(" ");
    if (s.startsWith("[trovio:email]")) mails.push(s);
    else orig(...args);
  };
  try {
    return { result: await fn(), mails };
  } finally {
    console.info = orig;
  }
}

// ---------------------------------------------------------------------------
// Báo dữ liệu sai
// ---------------------------------------------------------------------------

test("báo lỗi: kiểm tra đầu vào, gắn chương trình có thật, email tài khoản mặc định", async () => {
  const an = await must(authService.getUser("u-001"));
  assert.equal((await dataReportService.submit({ detail: "ngắn" }, null)).ok, false);
  const badEmail = await dataReportService.submit({ detail: "Học phí sai so với đề án 2026", email: "khong-phai-email" }, null);
  assert.equal(!badEmail.ok && badEmail.field, "email");
  // Chủ đề lạ → "khac"; programId không tồn tại → bỏ qua; ký tự điều khiển bị lọc.
  const guest = await dataReportService.submit({ detail: "Điểm chuẩn\u0000 2025 sai, nguồn: đề án của trường", topic: "hack", programId: "khong-co", email: "Phu.Huynh@Mail.com" }, null);
  assert.ok(guest.ok);
  const mine = await dataReportService.submit({ detail: "Học phí năm 2026 đã tăng lên 34 triệu", topic: "hoc-phi", programId: "ueh-marketing", page: "Marketing – UEH" }, an);
  assert.ok(mine.ok);
  const list = await dataReportService.list();
  const g = list.find((r) => guest.ok && r.id === guest.id)!;
  assert.equal(g.topic, "khac");
  assert.equal(g.programId, null);
  assert.equal(g.email, "phu.huynh@mail.com");
  assert.doesNotMatch(g.detail, /\u0000/);
  const m = list.find((r) => mine.ok && r.id === mine.id)!;
  assert.equal(m.program?.name, "Marketing – ĐH Kinh tế TP.HCM");
  assert.ok(m.program?.slug);
  assert.equal(m.email, an.email, "đã đăng nhập & xác thực → dùng email tài khoản");
  assert.equal(await dataReportService.openCount(), 2);
});

test("báo lỗi: xử lý cần ghi chú, báo lại cho người gửi (thông báo + email), ghi nhật ký", async () => {
  const admin = await must(authService.getUser("u-000"));
  const reports = await dataReportService.list();
  const mine = reports.find((r) => r.userId === "u-001")!;
  const guest = reports.find((r) => r.userId === null)!;
  assert.equal((await dataReportService.update(admin, mine.id, { status: "xoa-het" })).ok, false);
  const noNote = await dataReportService.update(admin, mine.id, { status: "da-xu-ly" });
  assert.equal(!noNote.ok && noNote.field, "note");
  assert.ok((await dataReportService.update(admin, mine.id, { status: "dang-xu-ly" })).ok);
  assert.equal((await notificationService.list("u-001")).items.length, 0, "chưa kết luận thì chưa báo");

  const { mails } = await captureMail(() => dataReportService.update(admin, mine.id, { status: "da-xu-ly", note: "Đã cập nhật học phí theo đề án 2026." }));
  const inbox = await notificationService.list("u-001");
  assert.equal(inbox.unread, 1);
  assert.equal(inbox.items[0].kind, "report-update");
  assert.match(inbox.items[0].body, /Đã cập nhật học phí/);
  assert.equal(mails.length, 1);

  const guestMail = await captureMail(() => dataReportService.update(admin, guest.id, { status: "khong-hop-le", note: "Số liệu trên web khớp đề án chính thức." }));
  assert.equal(guestMail.mails.length, 1);
  assert.match(guestMail.mails[0], /phu\.huynh@mail\.com/);
  assert.equal(await dataReportService.openCount(), 0);
  // Lưu lại cùng trạng thái → không gửi lại lần nữa.
  const again = await captureMail(() => dataReportService.update(admin, mine.id, { status: "da-xu-ly", note: "Đã cập nhật học phí theo đề án 2026." }));
  assert.equal(again.mails.length, 0);
  const audit = await adminService.listAudit(50);
  assert.ok(audit.filter((a) => a.targetType === "report").length >= 3);
});

// ---------------------------------------------------------------------------
// Thông báo
// ---------------------------------------------------------------------------

test("thông báo: chỉ link nội bộ, đánh dấu đã đọc theo người dùng, giới hạn số lượng", async () => {
  const n = await must(notificationService.notify({ userId: "u-002", kind: "reminder", title: "x", body: "y", href: "https://evil.example" }));
  assert.equal(n.href, null);
  const n2 = await must(notificationService.notify({ userId: "u-002", kind: "reminder", title: "x", body: "y", href: "//evil.example" }));
  assert.equal(n2.href, null);
  assert.equal(await notificationService.notify({ userId: "khong-co", kind: "reminder", title: "x", body: "y" }), null);
  // Người khác không đánh dấu được thông báo của u-002.
  assert.equal(await notificationService.markRead("u-001", [n.id]), 0);
  assert.equal(await notificationService.markRead("u-002", [n.id]), 1);
  assert.equal((await notificationService.list("u-002")).unread, 1);
  for (let i = 0; i < 60; i++) await notificationService.notify({ userId: "u-002", kind: "reminder", title: `t${i}`, body: "b" });
  const all = await repositories.notifications.listByUser("u-002", 1000);
  assert.ok(all.length <= 50, `giữ tối đa 50, đang có ${all.length}`);
  assert.equal(all[0].title, "t59", "mới nhất lên đầu");
  await notificationService.markRead("u-002");
  assert.equal((await notificationService.list("u-002")).unread, 0);
});

// ---------------------------------------------------------------------------
// Lịch tuyển sinh + nhắc hạn
// ---------------------------------------------------------------------------

const EVENTS = [
  { id: "t27-dang-ky", title: "Đăng ký nguyện vọng", start: "2027-07-16", end: "2027-07-28", category: "dang-ky", desc: "Đăng ký trên hệ thống của Bộ." },
  { id: "t27-thi", title: "Thi tốt nghiệp THPT", start: "2027-06-25", end: "2027-06-26", category: "thi", desc: "Kỳ thi tốt nghiệp." },
];

test("mốc tuyển sinh: kiểm tra dữ liệu, 'chính thức' bắt buộc nguồn https, ghi nhật ký, khôi phục mặc định", async () => {
  const admin = await must(authService.getUser("u-000"));
  const base = await timelineService.list();
  assert.equal(base.official, false, "mặc định là lịch minh hoạ");
  const bad: Record<string, unknown>[] = [
    { season: "27", events: EVENTS },
    { season: "2027", official: true, events: EVENTS },
    { season: "2027", sourceUrl: "http://moet.gov.vn/x", events: EVENTS },
    { season: "2027", sourceUrl: "javascript:alert(1)", events: EVENTS },
    { season: "2027", events: [] },
    { season: "2027", events: Array.from({ length: 41 }, (_, i) => ({ ...EVENTS[0], id: `e-${i}0` })) },
    { season: "2027", events: [{ ...EVENTS[0], category: "khac-la" }] },
    { season: "2027", events: [{ ...EVENTS[0], start: "2027-02-30" }] },
    { season: "2027", events: [{ ...EVENTS[0], end: "2027-07-01" }] },
    { season: "2027", events: [EVENTS[0], EVENTS[0]] },
  ];
  for (const input of bad) assert.equal((await timelineService.save(admin, input)).ok, false, JSON.stringify(input).slice(0, 90));
  const ok = await timelineService.save(admin, { season: "2027", official: true, sourceUrl: "https://moet.gov.vn/huong-dan-2027", events: EVENTS });
  assert.deepEqual(ok, { ok: true });
  const v = await timelineService.list();
  assert.equal(v.season, "2027");
  assert.equal(v.official, true);
  assert.deepEqual(v.events.map((e) => e.id), ["t27-thi", "t27-dang-ky"], "sắp xếp theo ngày");
  assert.ok((await adminService.listAudit(50)).some((a) => a.targetType === "timeline"));
});

test("nhắc hạn: chỉ gửi cho người bật email + bật nhắc mốc đó, đúng 7 và 1 ngày trước, không gửi trùng", async () => {
  // u-001 bật nhắc email + nhắc mốc đăng ký; u-002 bật nhắc mốc nhưng không bật email.
  assert.ok((await authService.updateProfile("u-001", { emailReminders: true })).ok);
  const base = { saved: [], wishlist: [], profile: null, quiz: null, updatedAt: new Date().toISOString() };
  await repositories.userData.put("u-001", { ...base, reminders: ["t27-dang-ky"] });
  await repositories.userData.put("u-002", { ...base, reminders: ["t27-dang-ky"] });

  assert.deepEqual(await reminderService.sendDue("2027-07-01"), { checked: 0, sent: 0 }, "không có mốc đến hạn");
  const seven = await captureMail(() => reminderService.sendDue("2027-07-09"));
  assert.deepEqual(seven.result, { checked: 1, sent: 1 });
  assert.equal(seven.mails.length, 1);
  const inbox = await notificationService.list("u-001");
  assert.match(inbox.items[0].title, /Còn 7 ngày: Đăng ký nguyện vọng/);
  assert.equal(inbox.items[0].href, "/moc-tuyen-sinh");
  assert.equal((await notificationService.list("u-002")).items.some((n) => n.kind === "reminder" && /Đăng ký/.test(n.title)), false);
  // Chạy lại cùng ngày (cron chạy 2 lần) → không gửi trùng.
  assert.deepEqual(await reminderService.sendDue("2027-07-09"), { checked: 1, sent: 0 });
  const one = await reminderService.sendDue("2027-07-15");
  assert.equal(one.sent, 1);
  assert.match((await notificationService.list("u-001")).items[0].title, /Ngày mai/);
  // Tắt nhắc email → không gửi nữa.
  await authService.updateProfile("u-001", { emailReminders: false });
  const admin = await must(authService.getUser("u-000"));
  await timelineService.save(admin, { season: "2027", events: [{ ...EVENTS[0], id: "t27-dk-2", start: "2027-08-08", end: undefined }] });
  await repositories.userData.put("u-001", { ...base, reminders: ["t27-dk-2"] });
  assert.equal((await reminderService.sendDue("2027-08-01")).sent, 0);
  // Khôi phục lịch mặc định.
  assert.equal(await timelineService.reset(admin), true);
  assert.equal((await timelineService.list()).official, false);
  assert.equal(await timelineService.reset(admin), false);
});

// ---------------------------------------------------------------------------
// Chatbot: từ khoá do quản trị thêm + câu trả lời có nút hành động
// ---------------------------------------------------------------------------

test("chatbot: quản trị thêm từ khoá → hiểu cách gọi mới; chặn từ quá chung / trùng; xoá được", async () => {
  const admin = await must(authService.getUser("u-000"));
  const before = await answerQuestion("ngành dân code ra trường lương bao nhiêu");
  assert.notEqual(before.context.majorId, "cong-nghe-thong-tin");
  for (const input of [
    { alias: "ngành", kind: "major", targetId: "cong-nghe-thong-tin" },
    { alias: "x", kind: "major", targetId: "cong-nghe-thong-tin" },
    { alias: "dân code", kind: "major", targetId: "khong-co" },
    { alias: "dân code", kind: "lop", targetId: "cong-nghe-thong-tin" },
  ]) {
    assert.equal((await chatbotService.addAlias(admin, input)).ok, false, JSON.stringify(input));
  }
  assert.deepEqual(await chatbotService.addAlias(admin, { alias: "Dân code", kind: "major", targetId: "cong-nghe-thong-tin" }), { ok: true });
  const clash = await chatbotService.addAlias(admin, { alias: "dân code", kind: "major", targetId: "marketing" });
  assert.equal(!clash.ok && clash.field, "alias");
  const after = await answerQuestion("ngành dân code ra trường lương bao nhiêu");
  assert.equal(after.context.majorId, "cong-nghe-thong-tin");
  const list = await chatbotService.listAliases();
  const a = list.find((x) => x.label === "Dân code")!;
  assert.equal(a.targetName, "Công nghệ thông tin");
  assert.equal(await chatbotService.deleteAlias(admin, a.id), true);
  assert.notEqual((await answerQuestion("ngành dân code ra trường lương bao nhiêu")).context.majorId, "cong-nghe-thong-tin");
});

test("chatbot: thẻ chương trình trong câu trả lời có programId để lưu/so sánh ngay", async () => {
  const ans = await answerQuestion("Điểm chuẩn ngành Marketing");
  const withId = ans.items.filter((i) => i.programId);
  assert.ok(withId.length > 0);
  for (const i of withId) assert.ok(await repositories.programs.findById(i.programId!), i.programId);
});

// ---------------------------------------------------------------------------
// Đo phễu ẩn danh + SUS
// ---------------------------------------------------------------------------

test("phễu: chỉ nhận sự kiện & mã hợp lệ, mỗi mã tính 1 lần/bước, tỉ lệ đúng", async () => {
  assert.equal(await analyticsService.track("hack", "abcdef12"), false);
  assert.equal(await analyticsService.track("visit", "ngắn"), false);
  assert.equal(await analyticsService.track("visit", "<script>alert(1)</script>"), false);
  assert.equal(await analyticsService.track("visit", 123), false);
  const ids = ["aaaaaaaa-1", "bbbbbbbb-2", "cccccccc-3", "dddddddd-4"];
  for (const id of ids) {
    await analyticsService.track("visit", id);
    await analyticsService.track("visit", id.toUpperCase()); // trùng (không phân biệt hoa thường)
  }
  await analyticsService.track("quiz_done", ids[0]);
  await analyticsService.track("quiz_done", ids[1]);
  await analyticsService.track("score_saved", ids[0]);
  await analyticsService.track("chat_asked", ids[3]);
  const r = await analyticsService.report(30);
  const step = (e: string) => r.steps.find((s) => s.event === e)!;
  assert.equal(step("visit").users, 4);
  assert.equal(step("quiz_done").users, 2);
  assert.equal(step("quiz_done").ofVisit, 50);
  assert.equal(step("score_saved").fromPrev, 50);
  assert.equal(step("program_saved").users, 0);
  assert.equal(step("wishlist_added").fromPrev, 0);
  assert.equal(r.chat, 1);
  assert.equal(r.to, vnDay());
  const today = r.daily.find((d) => d.day === vnDay())!;
  assert.equal(today.counts.visit, 4);
  // Dữ liệu lưu không chứa gì ngoài mã ẩn danh.
  const raw = JSON.stringify(await repositories.analytics.daily("2000-01-01", "2999-12-31"));
  assert.doesNotMatch(raw, /u-00|@/);
});

test("SUS: công thức chuẩn, xếp loại, kiểm tra phiếu, thống kê", async () => {
  assert.equal(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.equal(susScore([4, 2, 5, 1, 4, 2, 4, 2, 4, 1]), 82.5, "ví dụ trong tài liệu kịch bản test");
  assert.equal(susGrade(90), "Xuất sắc");
  assert.equal(susGrade(75), "Tốt");
  assert.equal(susGrade(68), "Trên trung bình");
  assert.equal(susGrade(55), "Tạm được");
  assert.equal(susGrade(30), "Kém");
  for (const answers of [[], [1, 2, 3], [1, 2, 3, 4, 5, 1, 2, 3, 4, 6], [1, 2, 3, 4, 5, 1, 2, 3, 4, 2.5], "1111111111"]) {
    assert.equal((await analyticsService.submitSurvey({ answers })).ok, false, JSON.stringify(answers));
  }
  const a = await analyticsService.submitSurvey({ answers: [4, 2, 5, 1, 4, 2, 4, 2, 4, 1], role: "hoc-sinh", comment: "Dễ dùng\u0007 nhưng chữ hơi nhỏ" });
  assert.deepEqual(a, { ok: true, score: 82.5, grade: "Tốt" });
  await analyticsService.submitSurvey({ answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], role: "vai-tro-la" });
  const rep = await analyticsService.surveyReport();
  assert.equal(rep.n, 2);
  assert.equal(rep.mean, 66.3);
  assert.equal(rep.median, 66.25);
  assert.equal(rep.byRole.find((r) => r.role === "Học sinh")?.n, 1);
  assert.equal(rep.comments.length, 1);
  assert.doesNotMatch(rep.comments[0].comment, /\u0007/);
  const stored = await repositories.surveys.list();
  assert.equal(stored[1].role, null, "vai trò lạ không được lưu");
});

// ---------------------------------------------------------------------------
// Chi phí, số ước tính, lọc cảm nhận
// ---------------------------------------------------------------------------

test("chi phí: tính theo năm, tăng học phí, học bổng, chặn giá trị vô lý", () => {
  const r = computeCost({ tuitionPerYear: 30, years: 4, tuitionIncreasePct: 10, scholarshipPct: 0, livingPerMonth: 4, monthsPerYear: 10, oneTime: 15 });
  assert.deepEqual(r.years.map((y) => y.tuition), [30, 33, 36.3, 39.9]);
  assert.equal(r.living, 160);
  assert.equal(r.total, Math.round((30 + 33 + 36.3 + 39.93 + 160 + 15) * 10) / 10);
  const half = computeCost({ tuitionPerYear: 30, years: 4, tuitionIncreasePct: 0, scholarshipPct: 50, livingPerMonth: 0, monthsPerYear: 12, oneTime: 0 });
  assert.equal(half.tuition, 60);
  const weird = computeCost({ tuitionPerYear: -5, years: 99, tuitionIncreasePct: NaN, scholarshipPct: 500, livingPerMonth: 1e9, monthsPerYear: 40, oneTime: -1 });
  assert.equal(weird.years.length, 8);
  assert.equal(weird.tuition, 0);
  assert.equal(weird.living, 100 * 12 * 8);
  assert.equal(weird.oneTime, 0);
  assert.equal(defaultTuition(28, 34), 31);
  assert.equal(formatMillion(1250), "1,25 tỷ");
  assert.equal(formatMillion(31.5), "31,5 triệu");
});

test("điểm chuẩn học bạ / ĐGNL được gắn cờ ước tính, THPT thì không", async () => {
  const p = await must(repositories.programs.findById("ueh-marketing"));
  assert.equal(cutoffFor(p, "thpt")?.estimated, undefined);
  assert.equal(cutoffFor(p, "hocba")?.estimated, true);
  assert.equal(cutoffFor(p, "dgnl-hcm")?.estimated, true);
  // Mọi điểm chuẩn phương thức khác trong dữ liệu mẫu đều là ước tính.
  for (const x of await repositories.programs.findAll()) for (const c of x.altCutoffs ?? []) assert.equal(c.estimated, true, x.id);
});

test("cảm nhận: lọc theo ngành & khoá, danh sách lựa chọn chỉ gồm giá trị có dữ liệu", async () => {
  const now = Date.now();
  const mk = (i: number, majorId: string | null, cohort: number | null, status: "approved" | "pending" = "approved") => ({
    id: `r-flt-${i}`,
    schoolId: "neu",
    userId: `u-flt-${i}`,
    authorName: `Người ${i}`,
    anonymous: false,
    relation: "sinh-vien" as const,
    cohort,
    majorId,
    ratings: { teaching: i % 2 ? 5 : 3, facilities: 4, activities: 4, career: 4 },
    title: `Cảm nhận số ${i}`,
    content: "Nội dung đủ dài để hợp lệ. ".repeat(5),
    status,
    rejectReason: null,
    helpful: [],
    reports: [],
    schoolEmail: false,
    demo: false,
    flags: [],
    createdAt: new Date(now - i * 60_000).toISOString(),
    updatedAt: new Date(now - i * 60_000).toISOString(),
    moderatedAt: null,
    moderatedBy: null,
  });
  const before = await reviewService.listPublic("neu");
  const rows = [mk(1, "marketing", 2022), mk(2, "marketing", 2023), mk(3, "kinh-te", 2022), mk(4, null, null), mk(5, "marketing", 2022, "pending")];
  for (const r of rows) await repositories.reviews.create(r);
  const all = await reviewService.listPublic("neu");
  assert.equal(all.summary.count, before.summary.count + 4);
  assert.equal(all.filtered, null);
  const mkt = all.facets.majors.find((m) => m.id === "marketing")!;
  assert.equal(mkt.count, 2 + before.items.filter((i) => i.majorName === mkt.name).length, "không đếm cảm nhận chờ duyệt");
  assert.ok(all.facets.cohorts.some((c) => c.year === 2022));
  assert.ok(all.facets.cohorts.every((c, i, xs) => i === 0 || xs[i - 1].year > c.year), "khoá mới nhất lên đầu");

  const f1 = await reviewService.listPublic("neu", { majorId: "marketing", cohort: 2022 });
  assert.deepEqual(f1.items.filter((i) => i.id.startsWith("r-flt")).map((i) => i.id), ["r-flt-1"]);
  assert.ok(f1.items.every((i) => i.majorName === mkt.name && i.cohort === 2022));
  assert.equal(f1.filtered?.count, f1.items.length);
  assert.equal(f1.summary.count, all.summary.count, "tổng hợp cả trường không đổi khi lọc");
  const f2 = await reviewService.listPublic("neu", { cohort: 2022 });
  assert.ok(f2.items.every((i) => i.cohort === 2022));
  // Mã ngành không tồn tại → bỏ qua bộ lọc, không lỗi.
  const f3 = await reviewService.listPublic("neu", { majorId: "khong-co-nganh" });
  assert.equal(f3.filtered, null);
  assert.equal(f3.items.length, all.items.length);
});

test("cảm nhận: người viết (không phải dữ liệu minh hoạ) nhận thông báo khi được duyệt / từ chối", async () => {
  const admin = await must(authService.getUser("u-000"));
  const an = await must(authService.getUser("u-001"));
  const sent = await reviewService.submit(an, "hust", {
    ratings: { teaching: 4, facilities: 4, activities: 4, career: 4 },
    title: "Học nặng nhưng đáng",
    content: "Chương trình nhiều bài tập lớn, giảng viên hỗ trợ nhiệt tình, thư viện rộng, câu lạc bộ học thuật hoạt động đều đặn cả năm học.",
    relation: "sinh-vien",
    cohort: 2023,
    majorId: null,
  });
  assert.ok(sent.ok);
  const q = (await reviewService.queue()).find((x) => x.title === "Học nặng nhưng đáng")!;
  const before = (await notificationService.list("u-001")).items.length;
  assert.ok((await reviewService.moderate(admin, q.id, "approve")).ok);
  const inbox = await notificationService.list("u-001");
  assert.equal(inbox.items.length, before + 1);
  assert.equal(inbox.items[0].kind, "review-approved");
  assert.match(inbox.items[0].href ?? "", /^\/truong\//);
});
