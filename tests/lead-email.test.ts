import assert from "node:assert/strict";
import test from "node:test";
import { leadEmailHtmlToText, sanitizeLeadEmailHtml } from "../src/lib/email-html";
import { MAX_LEAD_EMAIL_RECIPIENTS, validateLeadEmail } from "../src/services/lead-email.service";

test("email khách hàng: chuẩn hoá, loại trùng và giữ nội dung nhiều dòng", () => {
  const result = validateLeadEmail({
    recipients: " An@Example.com,binh@example.com\nan@example.com ",
    subject: "  Thông tin tuyển sinh 2027  ",
    message: "Chào bạn,\r\nTrovio gửi thông tin mới nhất.",
    consent: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.recipients, ["an@example.com", "binh@example.com"]);
  assert.equal(result.value.subject, "Thông tin tuyển sinh 2027");
  assert.equal(result.value.message, "Chào bạn,\nTrovio gửi thông tin mới nhất.");
});

test("email khách hàng: bắt buộc consent và chặn dữ liệu không hợp lệ", () => {
  const noConsent = validateLeadEmail({ recipients: "an@example.com", subject: "Thông báo", message: "Nội dung đủ dài" });
  assert.deepEqual(noConsent.ok ? null : noConsent.field, "consent");

  const badEmail = validateLeadEmail({ recipients: "khong-phai-email", subject: "Thông báo", message: "Nội dung đủ dài", consent: true });
  assert.deepEqual(badEmail.ok ? null : badEmail.field, "recipients");

  const tooMany = validateLeadEmail({
    recipients: Array.from({ length: MAX_LEAD_EMAIL_RECIPIENTS + 1 }, (_, index) => `lead-${index}@example.com`).join(","),
    subject: "Thông báo",
    message: "Nội dung đủ dài",
    consent: true,
  });
  assert.deepEqual(tooMany.ok ? null : tooMany.field, "recipients");
});

test("email khách hàng: giữ định dạng Word an toàn và tạo bản text dự phòng", () => {
  const result = validateLeadEmail({
    recipients: "lead@example.com",
    subject: "Thông tin mới",
    messageHtml: '<p style="font-family:Arial;color:#ff0000" onclick="alert(1)">Chào <strong>bạn</strong>.</p><ul><li>Hồ sơ 2027</li></ul><script>alert(1)</script>',
    consent: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.value.messageHtml ?? "", /font-family:Arial/);
  assert.match(result.value.messageHtml ?? "", /<strong>bạn<\/strong>/);
  assert.doesNotMatch(result.value.messageHtml ?? "", /onclick|script|alert/i);
  assert.equal(result.value.message, "Chào bạn.\n\n• Hồ sơ 2027");
});

test("email khách hàng: bảng, phông chữ và liên kết được lọc theo danh sách an toàn", () => {
  const html = sanitizeLeadEmailHtml('<table style="border-collapse:collapse;width:100%"><tr><td style="border:1px solid #cbd5e1;padding:8px"><font face="Times New Roman" size="4">Nội dung</font></td></tr></table><a href="javascript:alert(1)">xấu</a><a href="https://trovio.vn">tốt</a>');
  assert.match(html, /<table style="border-collapse:collapse;width:100%">/);
  assert.match(html, /face="Times New Roman" size="4"/);
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, /href="https:\/\/trovio.vn"/);
  assert.equal(leadEmailHtmlToText("<p>Dòng 1<br>Dòng 2</p>"), "Dòng 1\nDòng 2");
});
