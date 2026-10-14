/**
 * Kiểm thử 3 tính năng nội dung: việc làm & thu nhập có nguồn, cảm nhận sinh viên + kiểm duyệt,
 * trợ lý hỏi đáp có kiểm soát (không đưa thông tin sai về tuyển sinh).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { outcomeService, TRUST_BY_KIND } from "../src/services/outcome.service";
import { reviewService, screenReview, displayName, isSchoolEmail, summarize } from "../src/services/review.service";
import { answerQuestion, chatbotService, maskQuestion, norm } from "../src/services/chatbot.service";
import { isFaithful, numbersIn, polishWithLlm, factsOf } from "../src/services/chatbot-llm";
import { safeChatHref } from "../src/domain/chat";
import { REJECT_REASONS } from "../src/domain/reviews";
import { authService } from "../src/services/auth.service";
import { adminService } from "../src/services/admin.service";
import { repositories } from "../src/repositories";
import { dataSources, majorOutcomes, benchmarks, schoolOutcomes } from "../src/data/outcomes";
import { seedReviews } from "../src/data/reviews";
import { majors } from "../src/data/majors";

// Database JSON riêng cho test (repository đọc biến này ở lần truy cập đầu tiên).
process.env.TROVIO_DB_FILE = join(mkdtempSync(join(tmpdir(), "trovio-content-")), "db.json");

const must = async <T>(p: Promise<T | null>): Promise<T> => {
  const v = await p;
  assert.ok(v);
  return v;
};

// ---------------------------------------------------------------------------
// 1. Việc làm & thu nhập — nguồn đáng tin
// ---------------------------------------------------------------------------

test("việc làm: mọi con số trỏ tới nguồn tồn tại; mức tin cậy khớp loại nguồn; nguồn thật có https", () => {
  const ids = new Set(dataSources.map((s) => s.id));
  for (const s of dataSources) {
    assert.equal(s.trust, TRUST_BY_KIND[s.kind], s.id);
    if (s.trust !== "minh-hoa") assert.match(s.url ?? "", /^https:\/\//, s.id);
  }
  for (const o of majorOutcomes) {
    assert.ok(majors.some((m) => m.id === o.majorId), o.majorId);
    for (const m of [o.employmentRate, o.startingSalary, o.experiencedSalary]) if (m) assert.ok(ids.has(m.sourceId), `${o.majorId}:${m.sourceId}`);
  }
  for (const b of benchmarks) assert.ok(ids.has(b.sourceId), b.id);
  for (const s of schoolOutcomes) if (s.employmentRate) assert.ok(ids.has(s.employmentRate.sourceId), s.schoolId);
});

test("việc làm: số liệu chính thức (NSO 2025) và UEH (báo chí dẫn khảo sát) hiển thị đúng mức tin cậy", async () => {
  const bs = await outcomeService.benchmarks();
  const income = bs.find((b) => b.id === "income-2025");
  assert.equal(income?.value, 8.4);
  assert.equal(income?.source.trust, "cao");
  const ueh = await must(outcomeService.getSchool("ueh"));
  assert.equal(ueh.employmentRate?.metric.value, 97);
  assert.equal(ueh.employmentRate?.source.trust, "trung-binh");
  const demo = await must(outcomeService.getMajor("marketing"));
  assert.equal(demo.demoOnly, true, "số liệu theo ngành bản demo phải gắn cờ minh hoạ");
});

test("việc làm: quản trị cập nhật — bắt buộc nguồn, kiểm tra khoảng giá trị, ghi nhật ký, khôi phục được", async () => {
  const admin = await must(authService.getUser("u-000"));
  const y = new Date().getFullYear();
  const bad = [
    { employmentRate: { value: 90, year: 2025 } }, // thiếu nguồn
    { employmentRate: { value: 120, year: 2025, sourceId: "tt-09-2024" } }, // > 100%
    { startingSalary: { value: 10, low: 12, year: 2025, sourceId: "nso-2025" } }, // low > value
    { startingSalary: { value: 10, year: y + 1, sourceId: "nso-2025" } }, // năm tương lai
    { startingSalary: { value: 10, year: 2025, sourceId: "khong-co" } }, // nguồn không tồn tại
  ];
  for (const input of bad) {
    const r = await outcomeService.updateMajor(admin, "marketing", input);
    assert.equal(r.ok, false, JSON.stringify(input));
  }
  const ok = await outcomeService.updateMajor(admin, "marketing", { startingSalary: { value: 11.5, low: 9, high: 15, year: 2025, sourceId: "nso-2025", sampleSize: 500 } });
  assert.deepEqual(ok, { ok: true, changes: 1 });
  const after = await must(outcomeService.getMajor("marketing"));
  assert.equal(after.startingSalary?.metric.value, 11.5);
  assert.equal(after.startingSalary?.source.id, "nso-2025");
  assert.equal(after.demoOnly, false);
  const audit = await adminService.listAudit(50);
  assert.ok(audit.some((a) => a.targetType === "major-outcome" && a.programId === "marketing" && a.action === "update"));
  // Không đổi gì → 0 thay đổi, không ghi nhật ký thừa.
  assert.deepEqual(await outcomeService.updateMajor(admin, "marketing", {}), { ok: true, changes: 0 });
  assert.equal(await outcomeService.resetMajor(admin, "marketing"), true);
  assert.equal((await must(outcomeService.getMajor("marketing"))).demoOnly, true);
  assert.equal((await outcomeService.updateMajor(admin, "khong-co-nganh", {})).ok, false);
});

test("việc làm: thêm nguồn — chỉ https, không cho loại 'minh hoạ', mức tin cậy suy ra từ loại", async () => {
  const admin = await must(authService.getUser("u-000"));
  const base = { title: "Báo cáo khảo sát việc làm 2025", publisher: "Trường ĐH X", year: 2025, kind: "khao-sat-truong", url: "https://x.edu.vn/bao-cao", note: "Khảo sát 1.200 sinh viên tốt nghiệp 2024" };
  assert.equal((await outcomeService.addSource(admin, { ...base, url: "http://x.edu.vn/bao-cao" })).ok, false);
  assert.equal((await outcomeService.addSource(admin, { ...base, url: "javascript:alert(1)" })).ok, false);
  assert.equal((await outcomeService.addSource(admin, { ...base, kind: "minh-hoa" })).ok, false);
  assert.equal((await outcomeService.addSource(admin, { ...base, note: "ngắn" })).ok, false);
  const r = await outcomeService.addSource(admin, { ...base, trust: "cao" /* bị bỏ qua */ });
  assert.ok(r.ok);
  assert.equal(r.source.trust, "trung-binh");
  assert.ok((await outcomeService.listSources()).some((s) => s.id === r.source.id));
});

// ---------------------------------------------------------------------------
// 2. Cảm nhận sinh viên — kiểm duyệt
// ---------------------------------------------------------------------------

test("cảm nhận: bộ lọc tự động gắn cờ đúng loại, không gắn cờ nội dung sạch", () => {
  assert.deepEqual(screenReview("Trải nghiệm tốt", "Giảng viên nhiệt tình, thư viện rộng, nhiều câu lạc bộ học thuật cho sinh viên năm nhất."), []);
  assert.ok(screenReview("Liên hệ", "Gọi mình 0912 345 678 nhé").includes("lien-he"));
  assert.ok(screenReview("Liên hệ", "mail: abc@gmail.com").includes("lien-he"));
  assert.ok(screenReview("Link", "xem thêm tại www.abc.xyz").includes("lien-he"));
  assert.ok(screenReview("Tài liệu", "Bán tài liệu giá rẻ, ib mình").includes("quang-cao"));
  assert.ok(screenReview("Tệ", "trường này vcl luôn").includes("ngon-tu"));
  assert.ok(screenReview("Tố", "Phòng đào tạo lừa đảo sinh viên").includes("cong-kich"));
  assert.ok(screenReview("Giảng viên", "Thầy Nam dạy rất khó hiểu").includes("nhac-ten"));
  assert.ok(screenReview("TIÊU ĐỀ", "TRƯỜNG NÀY RẤT TỆ KHÔNG NÊN HỌC").includes("viet-hoa"));
  assert.ok(screenReview("Hay", "Tuyệt vờiiiiiiii").includes("lap-ky-tu"));
});

test("cảm nhận: tên hiển thị rút gọn, nhận diện email trường, tổng hợp điểm", () => {
  assert.equal(displayName("Nguyễn Văn An"), "An N.");
  assert.equal(displayName("  "), "Người dùng");
  assert.equal(isSchoolEmail("sv@st.ueh.edu.vn", "https://www.ueh.edu.vn"), true);
  assert.equal(isSchoolEmail("sv@ueh.edu.vn.evil.com", "https://www.ueh.edu.vn"), false);
  assert.equal(isSchoolEmail("sv@gmail.com", "https://www.ueh.edu.vn"), false);
  const s = summarize([{ ratings: { teaching: 5, facilities: 4, activities: 4, career: 5 } }, { ratings: { teaching: 3, facilities: 3, activities: 3, career: 3 } }]);
  assert.equal(s.count, 2);
  assert.equal(s.overall, 3.8);
  assert.equal(summarize([]).overall, null);
});

test("cảm nhận: quy trình gửi → chờ duyệt → duyệt/từ chối → sửa quay lại hàng chờ → rút lại", async () => {
  const admin = await must(authService.getUser("u-000"));
  const an = await must(authService.getUser("u-001"));
  const valid = {
    ratings: { teaching: 4, facilities: 4, activities: 5, career: 4 },
    title: "Môi trường năng động",
    content: "Chương trình học thực tế, nhiều hoạt động ngoại khoá và hội thảo doanh nghiệp. Cơ sở vật chất ổn, thư viện mở cửa muộn, phù hợp để tự học buổi tối.",
    relation: "sinh-vien",
    cohort: 2024,
    majorId: "kinh-doanh-quoc-te",
  };
  // Chưa xác thực email → 403
  const reg = await authService.register({ name: "Chưa Xác Thực", email: "chua.xt@x.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.ok(reg.ok);
  const unverified = await must(authService.getUser(reg.user.id));
  const r403 = await reviewService.submit(unverified, "ftu", valid);
  assert.equal(r403.ok, false);
  assert.equal(!r403.ok && r403.status, 403);
  // Kiểm tra đầu vào
  for (const input of [
    { ...valid, ratings: { ...valid.ratings, career: 6 } },
    { ...valid, title: "Ngắn" },
    { ...valid, content: "Quá ngắn." },
    { ...valid, relation: "phu-huynh" },
    { ...valid, cohort: 1900 },
    { ...valid, majorId: "y-khoa" }, // FTU không đào tạo Y khoa
  ]) {
    const r = await reviewService.submit(an, "ftu", input);
    assert.equal(r.ok, false, JSON.stringify(input).slice(0, 80));
  }
  assert.equal((await reviewService.submit(an, "khong-co-truong", valid)).ok, false);

  const sent = await reviewService.submit(an, "ftu", { ...valid, content: `${valid.content} <script>alert(1)</script>` });
  assert.deepEqual(sent, { ok: true, status: "pending", updated: false });
  const pub0 = await reviewService.listPublic("ftu");
  assert.equal(pub0.items.some((i) => i.title === valid.title), false, "chưa duyệt thì không hiển thị");
  const queued = (await reviewService.queue()).find((q) => q.title === valid.title);
  assert.ok(queued);
  assert.equal((await must(reviewService.mine("u-001", "ftu"))).status, "pending");

  // Từ chối bắt buộc có lý do hợp lệ
  assert.equal((await reviewService.moderate(admin, queued.id, "reject")).ok, false);
  assert.equal((await reviewService.moderate(admin, queued.id, "delete-all")).ok, false);
  assert.ok((await reviewService.moderate(admin, queued.id, "reject", "quang-cao")).ok);
  const mineRejected = await must(reviewService.mine("u-001", "ftu"));
  assert.equal(mineRejected.status, "rejected");
  assert.ok(mineRejected.rejectReason);

  // Sửa → quay lại hàng chờ, duyệt → hiển thị công khai (tên rút gọn, không lộ email)
  assert.deepEqual(await reviewService.submit(an, "ftu", { ...valid, anonymous: true }), { ok: true, status: "pending", updated: true });
  assert.ok((await reviewService.moderate(admin, queued.id, "approve")).ok);
  const pub = await reviewService.listPublic("ftu", { viewerId: "u-002" });
  const shown = pub.items.find((i) => i.id === queued.id);
  assert.ok(shown);
  assert.equal(shown.authorName, "Ẩn danh");
  assert.ok(!JSON.stringify(pub).includes("an@trovio.vn"));
  assert.ok(pub.summary.count >= 1);
  const audit = await adminService.listAudit(50);
  assert.ok(audit.some((a) => a.targetType === "review" && a.action === "approve" && a.programId === queued.id));
  assert.ok(audit.some((a) => a.targetType === "review" && a.action === "reject" && a.programId === queued.id));

  // Hữu ích: không tự đánh dấu cho mình; bật/tắt được
  assert.equal((await reviewService.toggleHelpful("u-001", queued.id)).ok, false);
  const h1 = await reviewService.toggleHelpful("u-000", queued.id);
  assert.ok(h1.ok && h1.helpful && h1.count === 1);
  const h2 = await reviewService.toggleHelpful("u-000", queued.id);
  assert.ok(h2.ok && !h2.helpful && h2.count === 0);

  // Rút lại
  assert.equal(await reviewService.withdraw("u-001", "ftu"), true);
  assert.equal(await reviewService.mine("u-001", "ftu"), null);
});

test("cảm nhận: báo cáo cần tài khoản đã xác thực; 3 tài khoản khác nhau → tự ẩn; báo cáo trùng không tính; duyệt lại xoá báo cáo", async () => {
  const admin = await must(authService.getUser("u-000"));
  const an = await must(authService.getUser("u-001"));
  const mk = async (email: string, verify: boolean) => {
    const reg = await authService.register({ name: "Người Báo Cáo", email, password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
    assert.ok(reg.ok);
    if (verify) await authService.verifyEmail(email, "592841");
    return must(authService.getUser(reg.user.id));
  };
  const [v1, v2, unverified] = [await mk("rp1@x.vn", true), await mk("rp2@x.vn", true), await mk("rp3@x.vn", false)];
  const id = "r-demo-01";
  assert.equal((await reviewService.report(id, unverified, "spam")).ok, false, "chưa xác thực email");
  assert.equal((await reviewService.report(id, an, "khong-co-ly-do")).ok, false);
  const r1 = await reviewService.report(id, an, "spam");
  assert.ok(r1.ok && !r1.hidden);
  const dup = await reviewService.report(id, an, "spam");
  assert.ok(dup.ok && !dup.hidden);
  assert.ok((await reviewService.report(id, v1, "xuc-pham")).ok);
  const r3 = await reviewService.report(id, v2, "sai-su-that");
  assert.ok(r3.ok && r3.hidden, "đủ 3 tài khoản khác nhau thì ẩn");
  assert.equal((await reviewService.listPublic("hust")).items.some((i) => i.id === id), false);
  const q = (await reviewService.queue()).find((x) => x.id === id);
  assert.ok(q && q.status === "hidden" && q.flags.includes("bi-bao-cao"));
  assert.ok(!JSON.stringify(q).includes(v1.id), "không lộ người báo cáo cho giao diện");
  assert.equal((await reviewService.report(id, admin, "spam")).ok, false, "đang ẩn thì không báo cáo tiếp");
  assert.ok((await reviewService.moderate(admin, id, "approve")).ok);
  assert.equal((await must(repositories.reviews.findById(id))).reports.length, 0);
  assert.ok((await reviewService.listPublic("hust")).items.some((i) => i.id === id));
});

test("cảm nhận: xoá tài khoản xoá luôn cảm nhận và lượt hữu ích của người đó", async () => {
  const reg = await authService.register({ name: "Tạm Thời", email: "tam.thoi@x.vn", password: "Abcdefg1", confirm: "Abcdefg1", terms: true });
  assert.ok(reg.ok);
  await authService.verifyEmail("tam.thoi@x.vn", "592841");
  const u = await must(authService.getUser(reg.user.id));
  assert.ok(
    (
      await reviewService.submit(u, "hust", {
        ratings: { teaching: 3, facilities: 3, activities: 3, career: 3 },
        title: "Cảm nhận tạm",
        content: "Nội dung đủ dài để hợp lệ, mô tả trải nghiệm học tập trong hai năm đầu tại trường với nhiều môn cơ sở ngành.",
        relation: "cuu-sinh-vien",
      })
    ).ok,
  );
  assert.ok((await reviewService.toggleHelpful(u.id, "r-demo-02")).ok);
  assert.equal(await authService.deleteAccount(u.id), true);
  assert.equal(await reviewService.mine(u.id, "hust"), null);
  assert.equal((await must(repositories.reviews.findById("r-demo-02"))).helpful.includes(u.id), false);
});

test("cảm nhận: dữ liệu minh hoạ được gắn cờ demo", async () => {
  assert.ok(seedReviews.every((r) => r.demo === true));
  const pub = await reviewService.listPublic("neu");
  assert.ok(pub.items.length > 0 && pub.items.every((i) => i.demo));
});

// ---------------------------------------------------------------------------
// 3. Trợ lý hỏi đáp — không đưa thông tin sai
// ---------------------------------------------------------------------------

test("chatbot: từ chối gian lận, dự đoán điểm chuẩn, cam kết đỗ", async () => {
  for (const q of ["Làm sao mua điểm thi?", "Có cách nào hack điểm không", "Dự đoán điểm chuẩn ngành Marketing năm 2027", "Điểm chuẩn NEU năm sau có tăng không?", "Mình được 25 điểm thì có đỗ không?", "Chắc chắn đỗ FTU không?"]) {
    const a = await answerQuestion(q);
    assert.equal(a.kind, "refusal", q);
    assert.equal(a.items.length, 0, q);
  }
  // Không từ chối nhầm câu hỏi quy chế có năm
  const pri = await answerQuestion("Điểm ưu tiên khu vực năm 2026 tính thế nào?");
  assert.equal(pri.kind, "answer");
  assert.equal(pri.intent, "rules-priority");
  assert.ok(pri.note, "câu trả lời quy chế phải nhắc kiểm tra quy chế từng năm");
});

test("chatbot: nhận diện viết tắt không nhầm với từ tiếng Việt thông dụng", async () => {
  assert.equal((await answerQuestion("Điểm chuẩn NEU")).context.schoolId, "neu");
  assert.notEqual((await answerQuestion("nếu mình thích vẽ thì học ngành gì")).context.schoolId, "neu");
  assert.equal((await answerQuestion("ngành IT học gì")).context.majorId, "cong-nghe-thong-tin");
  assert.notEqual((await answerQuestion("học phí ít nhất là trường nào")).context.majorId, "cong-nghe-thong-tin");
  assert.equal((await answerQuestion("Điểm chuẩn Kinh doanh quốc tế")).context.majorId, "kinh-doanh-quoc-te");
  assert.equal(norm("Đại học  Bách-khoa!"), " dai hoc bach khoa ");
});

test("chatbot: câu trả lời điểm chuẩn/học phí kèm năm, nguồn và cảnh báo minh hoạ; không có dữ liệu thì nói rõ", async () => {
  const cut = await answerQuestion("Điểm chuẩn ngành Marketing");
  assert.equal(cut.kind, "answer");
  assert.ok(cut.items.length > 0 && cut.items.every((i) => /năm 20\d\d/.test(i.meta ?? "")));
  assert.match(cut.note ?? "", /không dự đoán/);
  const hocba = await answerQuestion("Điểm chuẩn học bạ Bách khoa Hà Nội");
  assert.equal(hocba.kind, "unknown");
  assert.match(hocba.text, /chưa có/);
  const fee = await answerQuestion("Học phí NEU");
  assert.equal(fee.intent, "tuition");
  assert.doesNotMatch(fee.text, /của tại/);
  const unknown = await answerQuestion("Thời tiết Hà Nội hôm nay thế nào?");
  assert.equal(unknown.kind, "unknown");
  assert.equal(unknown.items.length, 0);
});

test("chatbot: lương theo ngành gắn nhãn MINH HOẠ; việc làm UEH dẫn nguồn báo chí thật", async () => {
  const sal = await answerQuestion("Lương ngành Kế toán");
  assert.equal(sal.intent, "salary");
  assert.ok(sal.items.some((i) => /MINH HOẠ/.test(i.meta ?? "")));
  assert.ok(sal.items.some((i) => /8,4/.test(i.meta ?? "")), "mốc thu nhập bình quân chính thức");
  assert.match(sal.note ?? "", /MINH HOẠ/);
  const ueh = await answerQuestion("Tỷ lệ việc làm sinh viên UEH");
  assert.match(`${ueh.text} ${ueh.items.map((i) => i.meta).join(" ")}`, /97/);
  assert.ok(ueh.sources.some((s) => s.external && s.href.startsWith("https://tuoitre.vn/")));
});

test("chatbot: ngữ cảnh hội thoại, ngữ cảnh trang, câu hỏi mốc thời gian & trường theo phương thức", async () => {
  const first = await answerQuestion("Ngành Luật học gì?");
  const follow = await answerQuestion("còn học phí thì sao?", first.context);
  assert.equal(follow.intent, "tuition");
  assert.equal(follow.context.majorId, "luat");
  const onPage = await answerQuestion("Ngành này học gì?", { page: "/nganh/marketing" });
  assert.equal(onPage.context.majorId, "marketing");
  const onSchool = await answerQuestion("Học phí trường này?", { page: "/truong/dai-hoc-kinh-te-quoc-dan" });
  assert.equal(onSchool.context.schoolId, "neu");
  const bad = await answerQuestion("Ngành này học gì?", { page: "/nganh/../../etc/passwd", majorId: { $ne: 1 } });
  assert.equal(bad.context.majorId, undefined);
  assert.equal((await answerQuestion("Khi nào đăng ký nguyện vọng?")).intent, "timeline");
  const dgnl = await answerQuestion("Trường nào xét ĐGNL HCM?");
  assert.equal(dgnl.intent, "methods-schools");
  assert.ok(dgnl.items.length > 0);
});

test("chatbot: điểm chuẩn theo năm — năm cũ tra lịch sử, năm chưa có dữ liệu nói rõ, năm tương lai từ chối", async () => {
  const y2024 = await answerQuestion("Điểm chuẩn ngành Luật năm 2024");
  assert.equal(y2024.kind, "answer");
  assert.ok(y2024.items.every((i) => /năm 2024/.test(i.meta ?? "")), "phải lấy đúng năm được hỏi");
  const thisYear = new Date().getFullYear();
  const now = await answerQuestion("Điểm chuẩn năm nay của NEU");
  assert.equal(now.kind, "unknown");
  assert.match(now.text, new RegExp(`chưa cập nhật điểm chuẩn năm ${thisYear}`));
  assert.ok(now.sources.some((s) => s.external));
  assert.equal((await answerQuestion(`Điểm chuẩn ${thisYear + 1} ngành Luật`)).kind, "refusal");
  const hocba = await answerQuestion("Điểm chuẩn học bạ ngành Marketing năm 2024");
  assert.equal(hocba.kind, "unknown", "không lấy nhầm điểm học bạ của năm khác");
});

test("chatbot: hỏi khả năng đỗ (có dấu, không có cụm cố định) vẫn bị từ chối; câu có chữ 'đồ/đó/độ' không bị từ chối nhầm", async () => {
  assert.equal((await answerQuestion("Mình 27 điểm khối A00 đỗ Bách khoa không")).kind, "refusal");
  assert.equal((await answerQuestion("25 điểm vào được NEU ko?")).kind, "refusal");
  assert.notEqual((await answerQuestion("Ngành đồ họa có tốt không")).kind, "refusal");
  assert.notEqual((await answerQuestion("Học phí ở đó có cao không")).kind, "refusal");
  const advice = await answerQuestion("Mình 25 điểm thì vào trường nào");
  assert.equal(advice.intent, "score-advice");
  assert.ok(advice.sources.some((s) => s.href === "/diem-cua-toi"));
});

test("chatbot: tổ hợp, chỉ tiêu, thời gian đào tạo, so sánh, chủ đề chưa có dữ liệu, lương không nêu ngành", async () => {
  const d01 = await answerQuestion("Tổ hợp D01 gồm những môn nào");
  assert.match(d01.text, /Toán, Ngữ văn, Tiếng Anh/);
  assert.ok((await answerQuestion("Khối D01 học ngành nào")).items.length > 0);
  assert.equal((await answerQuestion("Tổ hợp X99 là gì")).kind, "unknown");
  const quota = await answerQuestion("chỉ tiêu ngành Kinh doanh quốc tế FTU");
  assert.equal(quota.intent, "quota");
  assert.match(quota.items[0].meta ?? "", /chỉ tiêu/);
  const dur = await answerQuestion("Ngành Y khoa học mấy năm?");
  assert.equal(dur.intent, "duration");
  assert.match(dur.items[0].meta ?? "", /6 năm/);
  const cmp = await answerQuestion("So sánh ngành Marketing và Kinh doanh quốc tế");
  assert.equal(cmp.intent, "compare");
  assert.deepEqual(cmp.items.map((i) => i.title), ["Ngành Marketing", "Ngành Kinh doanh quốc tế"], "giữ thứ tự người dùng nhắc");
  assert.equal((await answerQuestion("So sánh NEU và FTU")).items.length, 2);
  const ktx = await answerQuestion("ctu có ký túc xá không");
  assert.equal(ktx.kind, "unknown");
  assert.ok(ktx.sources.some((s) => s.external), "chỉ tới website chính thức");
  const top = await answerQuestion("Ngành nào lương cao nhất");
  assert.equal(top.kind, "clarify");
  assert.equal(top.items.length, 1, "chỉ đưa mốc chính thức, không xếp hạng số liệu minh hoạ");
  const nv = await answerQuestion("Hạn chót đăng ký nguyện vọng");
  assert.equal(nv.intent, "timeline");
  assert.ok(nv.items.length >= 1 && nv.items.every((i) => /nguyện vọng/i.test(i.title)));
  const fit = await answerQuestion("Mình thích vẽ, có nên học Thiết kế đồ họa không", { riasec: { percents: { R: 30, I: 20, A: 95, S: 40, E: 60, C: 10 }, code: ["A", "E", "S"] } });
  assert.equal(fit.intent, "evaluate");
  assert.ok(fit.items.some((i) => /mức phù hợp với bạn: \d+%/.test(i.meta ?? "")));
});

test("chatbot: gợi ý ngành dùng kết quả RIASEC hợp lệ, bỏ qua dữ liệu RIASEC giả mạo", async () => {
  const riasec = { percents: { R: 20, I: 90, A: 30, S: 20, E: 40, C: 60 }, code: ["I", "C", "E"] };
  const withQuiz = await answerQuestion("Tôi nên học ngành gì?", { riasec });
  assert.equal(withQuiz.intent, "recommend");
  assert.equal(withQuiz.items.length, 3);
  const forged = await answerQuestion("Tôi nên học ngành gì?", { riasec: { percents: { R: 999 }, code: ["X"] } });
  assert.equal(forged.items.length, 0);
});

test("chatbot: mọi link trả về đều an toàn (nội bộ hoặc https)", async () => {
  const qs = ["Điểm chuẩn ngành Công nghệ thông tin", "Lương ngành Marketing", "Cảm nhận sinh viên NEU", "Trường nào đào tạo ngành Luật?", "Học bổng FPT", "Thứ tự nguyện vọng quan trọng thế nào?", "Khi nào thi tốt nghiệp?"];
  for (const q of qs) {
    const a = await answerQuestion(q);
    for (const href of [...a.sources.map((s) => s.href), ...a.items.flatMap((i) => (i.href ? [i.href] : []))]) assert.ok(safeChatHref(href), `${q}: ${href}`);
  }
  assert.equal(safeChatHref("javascript:alert(1)"), null);
  assert.equal(safeChatHref("//evil.com"), null);
  assert.equal(safeChatHref("http://a.vn"), null);
  assert.equal(safeChatHref("https://a.vn/x?y=1"), "https://a.vn/x?y=1");
  assert.equal(safeChatHref("/nganh/marketing"), "/nganh/marketing");
});

test("chatbot: kiểm tra đầu vào, che thông tin cá nhân trong nhật ký, đánh giá & thống kê", async () => {
  assert.equal((await chatbotService.ask("")).ok, false);
  assert.equal((await chatbotService.ask({ toString: () => "hack" })).ok, false);
  assert.equal((await chatbotService.ask("a".repeat(301))).ok, false);
  assert.equal(maskQuestion("email an@gmail.com sđt 0912 345 678"), "email [email] sđt [số]");
  const r = await chatbotService.ask("Học phí ngành Y khoa, liên hệ mình qua an@gmail.com");
  assert.ok(r.ok);
  const logs = await repositories.chatLogs.list(5);
  assert.ok(logs[0].question.includes("[email]") && !logs[0].question.includes("an@gmail.com"));
  assert.equal(await chatbotService.feedback(r.logId, false), true);
  assert.equal(await chatbotService.feedback("khong-ton-tai", true), false);
  await chatbotService.ask("thời tiết hôm nay");
  const stats = await chatbotService.stats();
  assert.ok(stats.total >= 2);
  assert.ok(stats.negative >= 1);
  assert.ok(stats.needsReview.some((l) => l.id === r.logId));
});

test("chatbot LLM (tuỳ chọn): chỉ nhận câu diễn đạt lại không thêm số/link; lỗi thì dùng bản gốc", async () => {
  const facts = "Học phí ngành Y khoa: 55–65 triệu/năm (năm 2025). Thu nhập bình quân 8,4 triệu.";
  assert.equal(isFaithful("Học phí khoảng 55–65 triệu mỗi năm.", facts), true);
  assert.equal(isFaithful("Thu nhập trung bình 8,4 triệu.", facts), true);
  assert.equal(isFaithful("Học phí khoảng 70 triệu.", facts), false);
  assert.equal(isFaithful("Xem https://x.vn", facts), false);
  assert.equal(isFaithful("", facts), false);
  assert.ok(numbersIn("1.200 điểm").has("1200"));

  const answer = await answerQuestion("Học phí ngành Y khoa");
  const env = { ...process.env };
  try {
    delete process.env.CHATBOT_LLM;
    assert.equal(await polishWithLlm("q", answer, async () => { throw new Error("không được gọi"); }), null);
    Object.assign(process.env, { CHATBOT_LLM: "anthropic", ANTHROPIC_API_KEY: "test", ANTHROPIC_MODEL: "test-model" });
    const reply = (text: string, status = 200) => async () => new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status });
    const firstNum = factsOf(answer).match(/\d+/)?.[0] ?? "";
    assert.equal(await polishWithLlm("q", answer, reply(`Học phí từ ${firstNum} triệu mỗi năm.`)), `Học phí từ ${firstNum} triệu mỗi năm.`);
    assert.equal(await polishWithLlm("q", answer, reply("Học phí chỉ 1 triệu thôi, chắc chắn đỗ 99%!")), null);
    assert.equal(await polishWithLlm("q", answer, reply("ok", 500)), null);
    assert.equal(await polishWithLlm("q", answer, async () => { throw new Error("mạng lỗi"); }), null);
  } finally {
    process.env = env;
  }
});

test("dữ liệu cũ (DB phiên bản 2) được nâng cấp: thêm cảm nhận minh hoạ, giữ nguyên dữ liệu người dùng", async () => {
  const dir = mkdtempSync(join(tmpdir(), "trovio-v2-"));
  const file = join(dir, "db.json");
  const current = JSON.parse(readFileSync(process.env.TROVIO_DB_FILE!, "utf8"));
  const v2 = { version: 2, users: current.users, userData: { "u-001": { saved: ["neu-marketing"], wishlist: [], profile: null, quiz: null, reminders: [], updatedAt: "2026-09-01" } }, shares: [], comments: [], programOverrides: {}, audit: [], seeded: ["u-000", "u-001", "u-002"] };
  writeFileSync(file, JSON.stringify(v2));
  const prev = process.env.TROVIO_DB_FILE;
  process.env.TROVIO_DB_FILE = file;
  try {
    const pub = await reviewService.listPublic("hust");
    assert.ok(pub.items.length > 0);
    const migrated = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(migrated.version, 8);
    assert.ok(Array.isArray(migrated.dataReports) && Array.isArray(migrated.notifications) && migrated.timelineConfig === null);
    assert.deepEqual(migrated.userData["u-001"].saved, ["neu-marketing"]);
    assert.ok(Array.isArray(migrated.chatLogs) && Array.isArray(migrated.customSources));
    assert.ok(migrated.seeded.includes("r-demo-01"));
  } finally {
    process.env.TROVIO_DB_FILE = prev;
  }
});
