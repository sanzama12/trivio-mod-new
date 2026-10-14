/**
 * Kiểm thử đầu-cuối (E2E) trên server Next.js THẬT: trang, API, đăng nhập, phân quyền, chatbot, kiểm duyệt…
 *
 * Chạy (nên dùng database riêng để không lẫn dữ liệu thật):
 *   npx next build
 *   TROVIO_DEMO=true TROVIO_DB_FILE=/tmp/trovio-e2e.json CRON_SECRET=e2e-secret npx next start -p 3100
 *   BASE_URL=http://localhost:3100 CRON_SECRET=e2e-secret node tests/e2e/smoke.mjs
 *
 * Script GHI dữ liệu thử (báo lỗi, cảm nhận, phiếu khảo sát…) — không chạy trên server có dữ liệu người dùng thật.
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
let pass = 0;
const fails = [];

class Client {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
    this.ip = `10.0.0.${Math.floor(Math.random() * 200) + 20}`;
  }
  async req(path, { method = "GET", json, headers = {}, raw } = {}) {
    const h = { "x-forwarded-for": this.ip, ...headers };
    if (method !== "GET" && !("origin" in h)) h.origin = ORIGIN;
    if (json !== undefined) h["content-type"] = "application/json";
    if (this.cookies.size) h.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { method, headers: h, body: raw ?? (json !== undefined ? JSON.stringify(json) : undefined), redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (!v || /max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body, text, headers: res.headers };
  }
}

async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    fails.push([name, e.message]);
    console.log(`  ✘ ${name} — ${e.message}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const eq = (a, b, msg = "") => expect(a === b, `${msg} mong đợi ${JSON.stringify(b)}, nhận ${JSON.stringify(a)}`);

const guest = new Client("guest");
const an = new Client("an");
const admin = new Client("admin");

console.log(`E2E → ${BASE}\n`);

// ---------------------------------------------------------------- 1. Trang
console.log("1. Trang công khai");
const PAGES = [
  ["/", "Trovio"],
  ["/chuong-trinh", "chương trình"],
  ["/chuong-trinh?q=marketing&method=hocba", "Ước tính"],
  ["/chuong-trinh/marketing-ksa", "Báo dữ liệu sai"],
  ["/truong/dai-hoc-kinh-te-quoc-dan", "Cảm nhận SV"],
  ["/nganh", "ngành"],
  ["/nganh/cong-nghe-thong-tin", "Việc làm"],
  ["/diem-cua-toi", "điểm"],
  ["/trac-nghiem", "RIASEC"],
  ["/so-sanh", "So sánh"],
  ["/da-luu", "Đã lưu"],
  ["/moc-tuyen-sinh", "Mốc tuyển sinh"],
  ["/viec-lam", "Việc làm"],
  ["/chi-phi", "chi phí"],
  ["/khao-sat", "Bạn thấy Trovio dễ dùng"],
  ["/tro-giup", "Báo dữ liệu sai"],
  ["/tro-giup?ct=marketing-ksa", "Marketing"],
  ["/cach-goi-y", "Dành cho bạn"],
  ["/chinh-sach-rieng-tu", "Thống kê sử dụng ẩn danh"],
  ["/dieu-khoan", "Điều khoản"],
  ["/dang-nhap", "Đăng nhập"],
  ["/dang-ky", "Đăng ký"],
  ["/quen-mat-khau", "mật khẩu"],
  ["/goi-y", "Gợi ý dành cho bạn"],
  ["/muc-tieu", "Đặt mục tiêu cùng trợ lý"],
  ["/chon-mon", "lớp 10"],
  ["/chon-mon?huong=nganh-mon", "lớp 10"],
  ["/so-sanh?tab=ma-tran", "Ma trận quyết định"],
  ["/mua-diem", "Mùa công bố điểm"],
  ["/mua-diem?ngay=2027-08-26", "Đang xem mô phỏng"],
  ["/chi-phi", "vay vốn"],
  ["/phan-hoi-nganh", "Đăng nhập để gửi phản hồi"],
  ["/lop-hoc", "Đăng nhập để tham gia"],
  ["/nhe", "bản nhẹ"],
  ["/nhe?q=marketing&diem=26", "Marketing"],
  ["/chuong-trinh/marketing-kha", "Hỏi sinh viên đang học"],
  ["/chuong-trinh/marketing-kha", "Trường đã xác nhận"],
  ["/chuong-trinh/marketing-kha", "Người đi trước nói gì"],
];
for (const [p, text] of PAGES) {
  await check(`GET ${p}`, async () => {
    const r = await guest.req(p);
    eq(r.status, 200, "status");
    expect(r.text.toLowerCase().includes(text.toLowerCase()), `thiếu chữ "${text}"`);
    expect(!/Application error|Unhandled Runtime Error|Internal Server Error/.test(r.text), "trang báo lỗi");
  });
}
await check("Trang không tồn tại → 404", async () => eq((await guest.req("/khong-co-trang-nay")).status, 404));
for (const p of ["/chuong-trinh/khong-co", "/truong/khong-co", "/nganh/khong-co", "/chia-se/khong-ton-tai-khong-ton-tai"]) {
  await check(`${p} → 404 hoặc thông báo hết hiệu lực`, async () => {
    const r = await guest.req(p);
    expect(r.status === 404 || (p.startsWith("/chia-se") && r.text.includes("không còn hiệu lực")), `status ${r.status}`);
  });
}
for (const p of ["/ho-so", "/quan-tri", "/quan-tri/bao-loi", "/quan-tri/thong-ke", "/quan-tri/hoi-dap"]) {
  await check(`Khách mở ${p} → chuyển tới đăng nhập`, async () => {
    const r = await guest.req(p);
    expect([307, 308].includes(r.status), `status ${r.status}`);
    expect((r.headers.get("location") ?? "").includes("/dang-nhap"), "không chuyển tới /dang-nhap");
  });
}

// ---------------------------------------------------------------- 2. Bảo mật chung
console.log("2. Bảo mật chung");
await check("POST khác nguồn gốc bị chặn (CSRF)", async () => eq((await guest.req("/api/chat", { method: "POST", json: { message: "hi" }, headers: { origin: "https://evil.example" } })).status, 403));
await check("Header bảo mật", async () => {
  const r = await guest.req("/");
  eq(r.headers.get("x-frame-options"), "DENY");
  eq(r.headers.get("x-content-type-options"), "nosniff");
});
await check("API quản trị: khách 401", async () => eq((await guest.req("/api/admin/timeline", { method: "DELETE" })).status, 401));
await check("Cron không có bí mật → 401/503", async () => expect([401, 503].includes((await guest.req("/api/cron/reminders")).status), "không bị chặn"));
await check("Body quá lớn → 413", async () => eq((await guest.req("/api/chat", { method: "POST", raw: "x".repeat(20000), headers: { "content-type": "application/json" } })).status, 413));

// ---------------------------------------------------------------- 3. Đăng nhập
console.log("3. Đăng nhập & phiên");
await check("Sai mật khẩu → 401", async () => expect([400, 401].includes((await guest.req("/api/auth/login", { method: "POST", json: { email: "an@trovio.vn", password: "sai-mat-khau" } })).status), "không từ chối"));
await check("Đăng nhập học sinh demo", async () => {
  const r = await an.req("/api/auth/login", { method: "POST", json: { email: "an@trovio.vn", password: "Trovio@2026" } });
  eq(r.status, 200, "status");
  expect(an.cookies.size > 0, "không có cookie phiên");
  const me = await an.req("/api/auth/me");
  eq(me.body?.user?.email, "an@trovio.vn");
});
await check("Đăng nhập quản trị demo", async () => eq((await admin.req("/api/auth/login", { method: "POST", json: { email: "admin@trovio.vn", password: "Trovio@2026" } })).status, 200));
const newbie = new Client("newbie");
const email = `e2e.${Date.now()}@example.com`;
await check("Đăng ký → xác thực OTP → có phiên", async () => {
  eq((await newbie.req("/api/auth/register", { method: "POST", json: { name: "Người Thử", email, password: "Abcdefg1", confirm: "Abcdefg1", terms: false } })).status, 400, "chưa đồng ý điều khoản");
  eq((await newbie.req("/api/auth/register", { method: "POST", json: { name: "Người Thử", email, password: "yeu", confirm: "yeu", terms: true } })).status, 400, "mật khẩu yếu");
  eq((await newbie.req("/api/auth/register", { method: "POST", json: { name: "Người Thử", email, password: "Abcdefg1", confirm: "Abcdefg1", terms: true } })).status, 201);
  eq((await newbie.req("/api/auth/verify-email", { method: "POST", json: { email, code: "000000" } })).status, 400, "sai OTP");
  eq((await newbie.req("/api/auth/verify-email", { method: "POST", json: { email, code: "592841" } })).status, 200, "OTP demo");
  eq((await newbie.req("/api/auth/me")).body?.user?.email, email);
});
await check("Đổi mật khẩu → phiên cũ trên thiết bị khác mất hiệu lực", async () => {
  const other = new Client("other");
  eq((await other.req("/api/auth/login", { method: "POST", json: { email, password: "Abcdefg1" } })).status, 200);
  eq((await newbie.req("/api/account/password", { method: "POST", json: { current: "Abcdefg1", password: "Moi12345x", confirm: "Moi12345x" } })).status, 200);
  eq((await other.req("/api/account/data")).status, 401, "phiên cũ");
  eq((await newbie.req("/api/account/data")).status, 200, "phiên hiện tại");
});
await check("Xoá tài khoản", async () => {
  eq((await newbie.req("/api/account", { method: "DELETE", json: {} })).status, 200);
  eq((await newbie.req("/api/account/data")).status, 401);
});
await check("Học sinh mở /quan-tri → 404", async () => eq((await an.req("/quan-tri")).status, 404));
await check("Quản trị mở các trang quản trị", async () => {
  for (const p of ["/quan-tri", "/quan-tri/cam-nhan", "/quan-tri/bao-loi", "/quan-tri/moc-tuyen-sinh", "/quan-tri/chatbot", "/quan-tri/thong-ke", "/quan-tri/viec-lam", "/quan-tri/chuong-trinh/hust-cong-nghe-thong-tin"]) {
    const r = await admin.req(p);
    eq(r.status, 200, p);
  }
});

// ---------------------------------------------------------------- 4. Chatbot
console.log("4. Trợ lý hỏi đáp");
const QUESTIONS = [
  "Tôi nên học ngành gì?",
  "tôi nên học ngành gì",
  "Ngành Luật ra trường làm gì?",
  "Điểm chuẩn Marketing NEU",
  "Học phí Bách khoa Hà Nội",
  "Mình được 25 điểm thì có đỗ không?",
  "Điểm chuẩn năm sau có tăng không",
  "Ngành IT học gì",
  "Lương ngành Kế toán",
  "Khi nào đăng ký nguyện vọng",
  "So sánh CNTT Bách khoa và NEU",
  "xin chào",
  "asdfgh qwerty",
  "Ngành này có hợp với mình không?",
  "😀😀😀 ngành marketing",
  "<script>alert(1)</script> điểm chuẩn",
  "Trường nào xét học bạ ngành Marketing",
  "Tổ hợp D01 học ngành gì",
  "Chỉ tiêu ngành Công nghệ thông tin Bách khoa",
  "Ngành Y khoa học mấy năm",
];
for (const q of QUESTIONS) {
  await check(`Hỏi: ${q}`, async () => {
    const c = new Client("chat"); // IP riêng mỗi câu để không chạm giới hạn 20 câu/phút
    const r = await c.req("/api/chat", { method: "POST", json: { message: q, context: { page: "/" } } });
    eq(r.status, 200, "status");
    expect(r.body?.ok && r.body.answer?.text, "không có câu trả lời");
    const links = [...(r.body.answer.sources ?? []), ...(r.body.answer.items ?? [])].map((x) => x.href).filter(Boolean);
    for (const h of links) expect(h.startsWith("/") || h.startsWith("https://"), `link không an toàn ${h}`);
    expect(!/<script>/i.test(JSON.stringify(r.body)), "phản hồi chứa script");
  });
}
await check("Câu hỏi rỗng → 400", async () => eq((await new Client().req("/api/chat", { method: "POST", json: { message: " " } })).status, 400));
await check("Ngữ cảnh RIASEC giả mạo không làm lỗi", async () => {
  const r = await new Client().req("/api/chat", { method: "POST", json: { message: "Tôi nên học ngành gì", context: { riasec: { percents: { R: "x" }, code: ["Z"] } } } });
  eq(r.status, 200);
});
await check("Đánh giá câu trả lời", async () => {
  const c = new Client();
  const r = await c.req("/api/chat", { method: "POST", json: { message: "Học phí NEU" } });
  eq((await c.req("/api/chat/feedback", { method: "POST", json: { logId: r.body.logId, helpful: true } })).status, 200);
});

// ---------------------------------------------------------------- 5. Dữ liệu tài khoản, gợi ý, trắc nghiệm, chia sẻ
console.log("5. Dữ liệu tài khoản & chia sẻ");
await check("Trắc nghiệm 60 câu → kết quả", async () => {
  const q = await guest.req("/api/quiz/questions");
  const answers = Object.fromEntries(q.body.questions.map((x, i) => [x.id, (i % 5) + 1]));
  const r = await guest.req("/api/quiz/result", { method: "POST", json: { answers } });
  eq(r.status, 200);
  expect(r.body.result?.code?.length === 3, "không có mã RIASEC");
  eq((await guest.req("/api/quiz/result", { method: "POST", json: { answers: { 1: 3 } } })).status, 422, "thiếu câu");
});
await check("Tìm kiếm & so sánh chương trình", async () => {
  const s = await guest.req("/api/programs?q=marketing&method=hocba&score=27");
  expect(s.body.items?.length > 0, "không có kết quả");
  const c = await guest.req("/api/programs/compare?ids=neu-marketing,hust-cong-nghe-thong-tin");
  eq(c.body.items?.length, 2);
});
await check("Gợi ý Dành cho bạn", async () => {
  const r = await guest.req("/api/recommendations", { method: "POST", json: { riasec: { percents: { R: 20, I: 90, A: 40, S: 30, E: 50, C: 70 }, code: ["I", "C", "E"] }, score: { method: "thpt", total: 26, combo: "A00" }, budgetMax: 30 } });
  expect(r.body.items?.length > 0, "không có gợi ý");
});
await check("Đồng bộ đã lưu / nguyện vọng", async () => {
  const data = { saved: ["neu-marketing", "hust-cong-nghe-thong-tin"], wishlist: [{ id: "neu-marketing", note: "NV1" }], profile: null, quiz: null, reminders: ["dang-ky-nguyen-vong"] };
  eq((await an.req("/api/account/data", { method: "PUT", json: data })).status, 200);
  const g = await an.req("/api/account/data");
  eq(g.body.data.wishlist[0].id, "neu-marketing");
  eq((await guest.req("/api/account/data")).status, 401, "khách");
});
let shareUrl = "";
await check("Tạo link chia sẻ phụ huynh + góp ý công khai", async () => {
  const r = await an.req("/api/account/share", { method: "POST", json: { days: 7, showNotes: true, showScore: false } });
  eq(r.status, 201);
  shareUrl = new URL(r.body.share.url).pathname;
  const page = await guest.req(shareUrl);
  eq(page.status, 200, "trang chia sẻ");
  expect(page.text.includes("Marketing"), "không thấy nguyện vọng");
  eq(page.headers.get("referrer-policy"), "no-referrer");
  const id = shareUrl.split("/").pop();
  eq((await new Client().req(`/api/share/${id}/comments`, { method: "POST", json: { name: "Mẹ", message: "Con cân nhắc thêm trường gần nhà nhé" } })).status, 201);
  const cm = await an.req("/api/account/share/comments");
  expect(cm.body.comments?.some((c) => c.name === "Mẹ"), "không thấy góp ý");
});

// ---------------------------------------------------------------- 6. Cảm nhận + kiểm duyệt + thông báo
console.log("6. Cảm nhận, kiểm duyệt, thông báo");
let reviewId = "";
await check("Học sinh gửi cảm nhận → chờ duyệt", async () => {
  const r = await an.req("/api/schools/hust/reviews", {
    method: "POST",
    json: { relation: "sinh-vien", cohort: 2023, majorId: "cong-nghe-thong-tin", ratings: { teaching: 5, facilities: 4, activities: 4, career: 5 }, title: "Học nặng nhưng xứng đáng", content: "Chương trình nhiều bài tập lớn, giảng viên hỗ trợ nhiệt tình, thư viện rộng và câu lạc bộ học thuật hoạt động đều đặn trong năm học.", anonymous: false },
  });
  eq(r.status, 201, JSON.stringify(r.body).slice(0, 120));
  const mine = await an.req("/api/schools/hust/reviews");
  reviewId = mine.body.mine?.id;
  eq(mine.body.mine?.status, "pending");
  expect(!mine.body.items.some((i) => i.id === reviewId), "hiện công khai khi chưa duyệt");
});
await check("Học sinh không duyệt được (403)", async () => eq((await an.req(`/api/admin/reviews/${reviewId}`, { method: "PATCH", json: { action: "approve" } })).status, 403));
await check("Quản trị duyệt → hiện công khai + thông báo cho người viết", async () => {
  eq((await admin.req(`/api/admin/reviews/${reviewId}`, { method: "PATCH", json: { action: "approve" } })).status, 200);
  const pub = await guest.req("/api/schools/hust/reviews");
  expect(pub.body.items.some((i) => i.id === reviewId), "chưa hiện công khai");
  const n = await an.req("/api/notifications");
  expect(n.body.items.some((x) => x.kind === "review-approved"), "không có thông báo");
});
await check("Lọc cảm nhận theo ngành/khoá", async () => {
  const r = await guest.req("/api/schools/hust/reviews?major=cong-nghe-thong-tin&cohort=2023");
  expect(r.body.filtered && r.body.items.every((i) => i.cohort === 2023), "lọc sai");
});

// ---------------------------------------------------------------- 7. Báo dữ liệu sai
console.log("7. Báo dữ liệu sai");
await check("Gửi báo lỗi (đăng nhập) → quản trị xử lý → thông báo", async () => {
  const r = await an.req("/api/reports", { method: "POST", json: { detail: "Học phí 2026 là 34 triệu theo đề án của trường", topic: "hoc-phi", programId: "ueh-marketing", page: "Marketing – UEH" } });
  eq(r.status, 201);
  eq((await admin.req(`/api/admin/reports/${r.body.id}`, { method: "PATCH", json: { status: "da-xu-ly" } })).status, 400, "thiếu ghi chú");
  eq((await admin.req(`/api/admin/reports/${r.body.id}`, { method: "PATCH", json: { status: "da-xu-ly", note: "Đã cập nhật theo đề án 2026." } })).status, 200);
  const n = await an.req("/api/notifications");
  expect(n.body.items.some((x) => x.kind === "report-update"), "không có thông báo");
  eq((await an.req("/api/notifications/read", { method: "POST", json: {} })).status, 200);
  eq((await an.req("/api/notifications")).body.unread, 0);
});
await check("Báo lỗi: bẫy bot, mô tả ngắn", async () => {
  const c = new Client();
  eq((await c.req("/api/reports", { method: "POST", json: { detail: "ngắn" } })).status, 400);
  const bot = await c.req("/api/reports", { method: "POST", json: { detail: "spam spam spam spam", website: "x" } });
  expect(bot.status === 200 && !bot.body.id, "bẫy bot không hoạt động");
});

// ---------------------------------------------------------------- 8. Mốc tuyển sinh, từ khoá chatbot, nhắc hạn
console.log("8. Mốc tuyển sinh, từ khoá chatbot, nhắc hạn");
await check("Lưu lịch chính thức cần nguồn https", async () => {
  const events = [{ id: "e2e-dk", title: "Đăng ký nguyện vọng", start: "2027-07-16", end: "2027-07-28", category: "dang-ky", desc: "Trên hệ thống của Bộ" }];
  eq((await admin.req("/api/admin/timeline", { method: "PUT", json: { season: "2027", official: true, events } })).status, 400);
  eq((await admin.req("/api/admin/timeline", { method: "PUT", json: { season: "2027", official: true, sourceUrl: "https://moet.gov.vn/x", events } })).status, 200);
  const p = await guest.req("/moc-tuyen-sinh");
  expect(p.text.includes("Đăng ký nguyện vọng"), "trang chưa cập nhật");
  eq((await admin.req("/api/admin/timeline", { method: "DELETE" })).status, 200);
});
await check("Thêm từ khoá → chatbot hiểu → xoá", async () => {
  eq((await admin.req("/api/admin/chat-aliases", { method: "POST", json: { alias: "ngành", kind: "major", targetId: "cong-nghe-thong-tin" } })).status, 400);
  eq((await admin.req("/api/admin/chat-aliases", { method: "POST", json: { alias: "dân code", kind: "major", targetId: "cong-nghe-thong-tin" } })).status, 201);
  const r = await new Client().req("/api/chat", { method: "POST", json: { message: "ngành dân code lương bao nhiêu" } });
  eq(r.body.answer?.context?.majorId, "cong-nghe-thong-tin");
});
await check("Bật nhắc email + chạy nhắc hạn", async () => {
  eq((await an.req("/api/account", { method: "PATCH", json: { emailReminders: true } })).status, 200);
  eq((await admin.req("/api/admin/reminders", { method: "POST" })).status, 200);
  if (process.env.CRON_SECRET) eq((await guest.req("/api/cron/reminders", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).status, 200, "cron");
});

// ---------------------------------------------------------------- 9. Thống kê & khảo sát
console.log("9. Thống kê & khảo sát");
await check("Sự kiện phễu hợp lệ / không hợp lệ", async () => {
  eq((await guest.req("/api/events", { method: "POST", json: { event: "visit", anon: "e2e-anon-12345" } })).status, 200);
  eq((await guest.req("/api/events", { method: "POST", json: { event: "drop_table", anon: "e2e-anon-12345" } })).status, 400);
});
await check("Phiếu SUS + xuất CSV", async () => {
  const r = await new Client().req("/api/survey", { method: "POST", json: { answers: [4, 2, 5, 1, 4, 2, 4, 2, 4, 1], role: "hoc-sinh" } });
  eq(r.body.score, 82.5);
  eq((await an.req("/api/admin/survey/export")).status, 403);
  const csv = await admin.req("/api/admin/survey/export");
  eq(csv.status, 200);
  expect(csv.text.includes("diem_sus"), "CSV thiếu cột");
  const page = await admin.req("/quan-tri/thong-ke");
  expect(page.text.includes("Phễu hành vi"), "trang thống kê");
});

// ---------------------------------------------------------------- 11. Tính năng đợt 10/2026
console.log("11. Gợi ý, ma trận, kế hoạch B, hỏi sinh viên, khảo sát, lớp học, xác nhận dữ liệu");
const linh = new Client("linh");
const gv = new Client("gv");
await check("Gợi ý: tiêu chí, cảnh báo mục tiêu, Chưa đủ dữ liệu", async () => {
  const r = await guest.req("/api/recommendations", {
    method: "POST",
    json: { riasec: { percents: { R: 80, I: 90, A: 10, S: 15, E: 10, C: 70 }, code: ["I", "R", "C"] }, goalMajorId: "marketing", limit: 12 },
  });
  eq(r.status, 200);
  expect(r.body.items.length > 0, "không có gợi ý");
  expect(r.body.items.every((x) => x.criteria?.length === 4 && x.fitGap === "no-score"), "thiếu tiêu chí / fitGap");
  expect(typeof r.body.goal?.warning === "string", "thiếu cảnh báo mục tiêu");
});
await check("Ma trận quyết định: API dữ liệu công khai", async () => {
  const r = await guest.req("/api/decision?ids=neu-marketing,ftu-marketing");
  eq(r.status, 200);
  eq(r.body.rows.length, 2, "số dòng");
  const many = await guest.req(`/api/decision?ids=${Array.from({ length: 9 }, () => "neu-marketing").join(",")}`);
  expect(many.status === 200 && many.body.rows.length <= 6, "không giới hạn 6");
});
await check("Xét bổ sung: danh sách + kiểm tra cần đăng nhập", async () => {
  const r = await guest.req("/api/supplementary");
  eq(r.status, 200);
  expect(r.body.rounds.length >= 8, "thiếu đợt");
  eq((await guest.req("/api/supplementary/check", { method: "POST", json: {} })).status, 401);
  eq((await an.req("/api/supplementary/check", { method: "POST", json: { today: "2027-08-26" } })).status, 200);
});
let qid = null;
await check("Hỏi sinh viên: đọc công khai, hỏi ẩn danh chờ duyệt", async () => {
  eq((await guest.req("/api/qa?programId=../x")).status, 400);
  const r = await guest.req("/api/qa?programId=neu-marketing");
  eq(r.status, 200);
  expect(r.body.items.length >= 2 && r.body.canAnswer === false, "dữ liệu hỏi đáp");
  expect(!r.text.includes("userId"), "lộ userId");
  const a = await an.req("/api/qa", { method: "POST", json: { programId: "neu-marketing", text: "E2E: Ngành này năm nhất học những môn gì ạ?" } });
  eq(a.status, 200);
  qid = a.body.id;
  const pub = await guest.req("/api/qa?programId=neu-marketing");
  expect(!pub.body.items.some((q) => q.id === qid), "câu hỏi chưa duyệt bị lộ");
});
await check("Hỏi sinh viên: chỉ email trường trả lời, quản trị duyệt", async () => {
  eq((await an.req("/api/admin/qa")).status, 403);
  const ok = await admin.req("/api/admin/qa", { method: "POST", json: { questionId: qid, action: "approve" } });
  eq(ok.status, 200);
  eq((await an.req(`/api/qa/${qid}/answers`, { method: "POST", json: { text: "Mình không học ở đây nhưng nghĩ là học đại cương." } })).status, 403);
  eq((await linh.req("/api/auth/login", { method: "POST", json: { email: "linh@st.neu.edu.vn", password: "Trovio@2026" } })).status, 200);
  const perm = await linh.req("/api/qa?programId=neu-marketing");
  eq(perm.body.canAnswer, true, "canAnswer");
  eq((await linh.req(`/api/qa/${qid}/answers`, { method: "POST", json: { text: "Năm nhất chủ yếu học đại cương: Kinh tế vi mô, Toán cao cấp, Marketing căn bản." } })).status, 200);
  const q = (await admin.req("/api/admin/qa")).body.items.find((x) => x.id === qid);
  const ans = q.answers.find((x) => x.status === "pending");
  eq((await admin.req("/api/admin/qa", { method: "POST", json: { questionId: qid, answerId: ans.id, action: "approve" } })).status, 200);
  const pub = await guest.req("/api/qa?programId=neu-marketing");
  eq(pub.body.items.find((x) => x.id === qid)?.answers.length, 1, "câu trả lời");
  const page = await admin.req("/quan-tri/hoi-dap");
  expect(page.text.includes("Kiểm duyệt hỏi đáp"), "trang kiểm duyệt");
});
await check("Khảo sát sau 1 năm: đăng nhập, 1 lần / chương trình", async () => {
  eq((await guest.req("/api/outcome-survey", { method: "POST", json: { programId: "neu-marketing", satisfaction: 4, chooseAgain: "yes" } })).status, 401);
  eq((await an.req("/api/outcome-survey", { method: "POST", json: { programId: "neu-marketing", satisfaction: 4, chooseAgain: "yes", wish: "E2E" } })).status, 200);
  eq((await an.req("/api/outcome-survey", { method: "POST", json: { programId: "neu-marketing", satisfaction: 5, chooseAgain: "yes" } })).status, 409);
});
await check("Lớp học: giáo viên tạo lớp, học sinh nhập mã, chỉ thấy tiến độ, nhắc có giới hạn", async () => {
  eq((await gv.req("/api/auth/login", { method: "POST", json: { email: "gv@trovio.vn", password: "Trovio@2026" } })).status, 200);
  eq((await an.req("/api/classes", { method: "POST", json: { name: "12X" } })).status, 403);
  const c = await gv.req("/api/classes", { method: "POST", json: { name: "12E2E", school: "THPT E2E" } });
  eq(c.status, 200);
  const { id, code } = c.body.cls;
  eq((await an.req("/api/classes/join", { method: "POST", json: { code: code.toLowerCase() } })).status, 200);
  eq((await an.req(`/api/classes/${id}`)).status, 404, "học sinh xem bảng lớp");
  const d = await gv.req(`/api/classes/${id}`);
  eq(d.status, 200);
  eq(d.body.summary.total, 1, "sĩ số");
  expect(!d.text.includes("memberIds") && !d.text.includes("an@trovio.vn") && !d.text.includes("u-001"), "lộ dữ liệu học sinh");
  eq((await gv.req(`/api/classes/${id}/remind`, { method: "POST", json: {} })).status, 200);
  eq((await gv.req(`/api/classes/${id}/remind`, { method: "POST", json: {} })).status, 429);
  const n = await an.req("/api/notifications");
  expect(JSON.stringify(n.body).includes("12E2E"), "học sinh chưa nhận lời nhắc");
  const page = await gv.req("/lop-hoc");
  expect(page.text.includes("Lớp của tôi"), "trang giáo viên");
  eq((await an.req(`/api/classes/${id}?leave=1`, { method: "DELETE" })).status, 200);
  eq((await gv.req(`/api/classes/${id}`, { method: "DELETE" })).status, 200);
});
await check("Trường đã xác nhận: chỉ quản trị viên gắn huy hiệu", async () => {
  eq((await an.req("/api/admin/programs/ftu-marketing", { method: "POST", json: { action: "school-verify", verified: true, note: "x" } })).status, 403);
  eq((await admin.req("/api/admin/programs/ftu-marketing", { method: "POST", json: { action: "school-verify", verified: true, note: "" } })).status, 400);
  eq((await admin.req("/api/admin/programs/ftu-marketing", { method: "POST", json: { action: "school-verify", verified: true, note: "Email phòng tuyển sinh (E2E)" } })).status, 200);
  const page = await guest.req("/chuong-trinh/marketing-nth");
  expect(page.text.includes("Trường đã xác nhận"), "chưa hiện huy hiệu");
  eq((await admin.req("/api/admin/programs/ftu-marketing", { method: "POST", json: { action: "school-verify", verified: false } })).status, 200);
});

// ---------------------------------------------------------------- 12. Quản trị A01–A09, cổng trường, Mini App
console.log("12. Quản trị theo Figma (A01–A09), kiểm duyệt viên, cổng trường, /zalo");
const mod = new Client("mod");
const staff = new Client("staff");
await check("Trang quản trị mới (thanh bên) mở được", async () => {
  for (const [p, text] of [
    ["/quan-tri", "Vấn đề dữ liệu cần xử lý"],
    ["/quan-tri/truong", "Thêm trường mới"],
    ["/quan-tri/nganh", "Thêm ngành mới"],
    ["/quan-tri/chuong-trinh", "Thêm chương trình"],
    ["/quan-tri/diem-hoc-phi", "Điểm chuẩn theo năm"],
    ["/quan-tri/trac-nghiem", "Ngân hàng câu hỏi trắc nghiệm"],
    ["/quan-tri/nhap-du-lieu", "Tải lên tệp dữ liệu tuyển sinh"],
    ["/quan-tri/nguoi-dung", "Thêm người dùng"],
    ["/quan-tri/quy-tac-goi-y", "Kiểm thử Quy tắc"],
  ]) {
    const r = await admin.req(p);
    eq(r.status, 200, p);
    expect(r.text.includes(text), `${p} thiếu "${text}"`);
    expect(r.text.includes("Quy tắc gợi ý") && r.text.includes("Bài test RIASEC"), `${p} thiếu thanh bên`);
  }
  eq((await an.req("/quan-tri/truong")).status, 404);
});
await check("API quản trị: học sinh bị chặn, kiểm tra dữ liệu đầu vào", async () => {
  eq((await an.req("/api/admin/catalog", { method: "POST", json: { entity: "school", action: "save", data: {} } })).status, 403);
  const bad = await admin.req("/api/admin/catalog", { method: "POST", json: { entity: "school", action: "save", data: { name: "ĐH E2E", code: "", type: "cong-lap", city: "" } } });
  eq(bad.status, 400);
  eq(bad.body.field, "code");
  const csv = await admin.req("/api/admin/scores");
  eq(csv.status, 200);
  expect(csv.text.includes("ma_xet_tuyen"), "CSV điểm");
  const sim = await admin.req("/api/admin/rules", { method: "POST", json: { kind: "simulate", code: "IRC", score: "26", weights: { interest: 45, fit: 35, place: 10, group: 10 } } });
  eq(sim.status, 200);
  expect(sim.body.items.length > 0, "chạy thử không có kết quả");
  const imp = await admin.req("/api/admin/import", { method: "POST", json: { step: "preview", fileName: "e2e.csv", content: "ma_xet_tuyen,ma_truong,nam,diem_chuan\nMKT01,KHA,2026,31\n" } });
  eq(imp.status, 200);
  expect(imp.body.preview.summary.errors === 1, "dòng điểm > 30 phải lỗi");
});
await check("Kiểm duyệt viên: vào mục kiểm duyệt, không vào dữ liệu tuyển sinh", async () => {
  eq((await mod.req("/api/auth/login", { method: "POST", json: { email: "kiemduyet@trovio.vn", password: "Trovio@2026" } })).status, 200);
  eq((await mod.req("/quan-tri/cam-nhan")).status, 200);
  eq((await mod.req("/quan-tri/truong")).status, 404);
  eq((await mod.req("/api/admin/qa")).status, 200);
  eq((await mod.req("/api/admin/catalog", { method: "POST", json: { entity: "school", action: "hide", id: "neu" } })).status, 403);
});
await check("Cổng trường: cán bộ tuyển sinh xác nhận số liệu, học sinh không vào được", async () => {
  eq((await staff.req("/api/auth/login", { method: "POST", json: { email: "tuyensinh@neu.edu.vn", password: "Trovio@2026" } })).status, 200);
  const page = await staff.req("/cong-truong");
  eq(page.status, 200);
  expect(page.text.includes("Cổng trường") && page.text.includes("số liệu đã xác nhận"), "trang cổng trường");
  eq((await staff.req("/api/school-portal", { method: "POST", json: { action: "confirm", programId: "ftu-marketing", field: "cutoff" } })).status, 404);
  eq((await staff.req("/api/school-portal", { method: "POST", json: { action: "confirm", programId: "neu-marketing", field: "cutoff" } })).status, 200);
  eq((await an.req("/api/school-portal", { method: "POST", json: { action: "confirm", programId: "neu-marketing", field: "cutoff" } })).status, 403);
});
await check("Mini App /zalo + thẻ kết quả chia sẻ", async () => {
  const r = await guest.req("/zalo?ma=ICE&ten=An");
  eq(r.status, 200);
  expect(r.text.includes("Chọn ngành hợp với bạn") && r.text.includes("Làm trắc nghiệm giống An"), "nội dung /zalo");
  const xss = await guest.req("/zalo?ma=ICE&ten=%3Cscript%3E");
  expect(!xss.text.includes("<script>alert") && !xss.text.includes("&lt;script"), "tên chia sẻ phải được lọc");
});

// ---------------------------------------------------------------- 13. Phong cách làm việc + MBTI (10/2026)
console.log("13. Mini-test Phong cách làm việc, MBTI tham khảo, câu hỏi RIASEC theo tình huống");
await check("Trang mini-test & lối vào từ trang trắc nghiệm", async () => {
  const r = await guest.req("/trac-nghiem/phong-cach");
  eq(r.status, 200);
  expect(r.text.includes("Mini-test Phong cách làm việc"), "tiêu đề trang mini-test");
  const intro = await guest.req("/trac-nghiem");
  expect(intro.text.includes("/trac-nghiem/phong-cach") && intro.text.includes("60 câu hỏi"), "lối vào mini-test / số câu");
  const lam = await guest.req("/trac-nghiem/lam-bai");
  expect(lam.text.includes("Quạt ở nhà bị hỏng"), "câu RIASEC viết lại theo tình huống");
});
await check("Đồng bộ mini-test + MBTI theo tài khoản, lọc dữ liệu xấu, không đổi gợi ý", async () => {
  const before = (await an.req("/api/account/data")).body.data;
  const ws = { scores: { social: 3, stability: 1, hands: -1, detail: 3 }, completedAt: new Date().toISOString() };
  const put = await an.req("/api/account/data", { method: "PUT", json: { ...before, workStyle: ws, mbti: { code: "ISFJ", updatedAt: new Date().toISOString() } } });
  eq(put.status, 200);
  const got = (await an.req("/api/account/data")).body.data;
  eq(got.workStyle?.scores?.detail, 3, "workStyle");
  eq(got.mbti?.code, "ISFJ", "mbti");
  const bad = await an.req("/api/account/data", { method: "PUT", json: { ...before, workStyle: { scores: { social: 99 }, completedAt: "x" }, mbti: { code: "<img>", updatedAt: "x" } } });
  eq(bad.body.data.workStyle, null, "workStyle xấu");
  eq(bad.body.data.mbti, null, "mbti xấu");
  const body = { riasec: { percents: { R: 40, I: 70, A: 30, S: 55, E: 60, C: 80 }, code: ["C", "I", "E"] }, limit: 6 };
  const a = await an.req("/api/recommendations", { method: "POST", json: body });
  const b = await an.req("/api/recommendations", { method: "POST", json: { ...body, workStyle: ws, mbti: { code: "ISFJ" } } });
  eq(JSON.stringify(b.body.items.map((x) => [x.view.program.id, x.score])), JSON.stringify(a.body.items.map((x) => [x.view.program.id, x.score])), "điểm gợi ý");
  eq((await an.req("/api/account/data", { method: "PUT", json: before })).status, 200);
});

// ---------------------------------------------------------------- 10. Đăng xuất
console.log("10. Đăng xuất");
await check("Đăng xuất → phiên hết hiệu lực", async () => {
  await an.req("/api/auth/logout", { method: "POST" });
  eq((await an.req("/api/account/data")).status, 401);
});

console.log(`\nKẾT QUẢ: ${pass} đạt, ${fails.length} lỗi`);
for (const [n, m] of fails) console.log(`  ✘ ${n}: ${m}`);
process.exit(fails.length ? 1 : 0);
