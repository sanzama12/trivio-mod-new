/**
 * Kiểm thử hồi quy cho 2 lỗi phát hiện khi chạy trên server thật (29/09/2026):
 * 1. Dev server đang chạy khi cập nhật code: DB phiên bản cũ còn trong bộ nhớ → chatbot lỗi 500 ("Trợ lý đang bận").
 * 2. Lần đầu tạo DB, nhiều request song song cùng migrate/ghi file → lỗi ENOENT khi đổi tên file tạm (trang chủ 500).
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const originalDbFile = process.env.TROVIO_DB_FILE;
const file = join(mkdtempSync(join(tmpdir(), "trovio-regress-")), "db.json");
process.env.TROVIO_DB_FILE = file;

const g = globalThis as unknown as { __trovioDb?: unknown };
const originalDb = g.__trovioDb;

after(() => {
  if (originalDbFile !== undefined) {
    process.env.TROVIO_DB_FILE = originalDbFile;
  } else {
    delete process.env.TROVIO_DB_FILE;
  }
  g.__trovioDb = originalDb;
});

test("DB mới: 30 lượt đọc song song ngay lần đầu không lỗi, chỉ còn 1 file, không sót file tạm", async () => {
  const { repositories } = await import("../src/repositories");
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      i % 3 === 0 ? repositories.users.list() : i % 3 === 1 ? repositories.chatAliases.list() : repositories.notifications.listByUser("u-001"),
    ),
  );
  assert.equal(results.length, 30);
  const db = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(db.version, 8);
  assert.deepEqual(readdirSync(dirname(file)).filter((f) => f.endsWith(".tmp")), []);
});

test("Code mới gặp DB cũ còn trong bộ nhớ (hot-reload): tự nâng cấp, chatbot vẫn trả lời", async () => {
  const v3 = { users: [], userData: {}, shares: [], comments: [], programOverrides: {}, audit: [], reviews: [], outcomeOverrides: {}, customSources: [], chatLogs: [], seeded: ["u-000", "u-001", "u-002"], version: 3 };
  writeFileSync(file, JSON.stringify(v3));
  g.__trovioDb = { file, mtime: statSync(file).mtimeMs, data: structuredClone(v3) };
  const { chatbotService } = await import("../src/services/chatbot.service");
  const r = await chatbotService.ask("Tôi nên học ngành gì?", {});
  assert.equal(r.ok, true);
  assert.equal(JSON.parse(readFileSync(file, "utf8")).version, 8);
  const { repositories } = await import("../src/repositories");
  assert.deepEqual(await repositories.chatAliases.list(), []);
});

test("Chatbot trả lời được mọi kiểu câu hỏi, không ném lỗi", async () => {
  const { answerQuestion } = await import("../src/services/chatbot.service");
  const qs = [
    "Tôi nên học ngành gì?", "nen hoc nganh gi", "Ngành Luật ra trường làm gì?", "Điểm chuẩn Marketing NEU", "Học phí Bách khoa",
    "Mình được 25 điểm thì có đỗ không?", "xin chào", "asdfgh", "😀", "<script>alert(1)</script>", "Ngành này có hợp với mình không?",
    "So sánh CNTT Bách khoa và NEU", "Khi nào đăng ký nguyện vọng", "Tổ hợp D01 học ngành gì", "Ngành Y khoa học mấy năm", "?", "ngành",
    "trường", "điểm chuẩn", "học phí", "lương", "a".repeat(300),
  ];
  for (const q of qs) {
    const a = await answerQuestion(q, { page: "/nganh/marketing", riasec: { percents: { R: 1, I: 2, A: 3, S: 4, E: 5, C: 6 }, code: ["C", "E", "S"] } });
    assert.ok(a.text && a.text.length > 0, q);
  }
});
