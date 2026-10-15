/** Gửi email chăm sóc tới khách hàng tiềm năng đã đồng ý nhận thông tin. */
import { randomUUID } from "node:crypto";
import type { PublicUser } from "../domain/types";
import { leadEmailHtmlToText, sanitizeLeadEmailHtml } from "../lib/email-html";
import { isMailerConfigured, sendMail } from "./mailer";

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const MAX_LEAD_EMAIL_RECIPIENTS = 20;

type Fail = { ok: false; status: number; field?: "recipients" | "subject" | "message" | "consent"; message: string };
export type ValidLeadEmail = { recipients: string[]; subject: string; message: string; messageHtml?: string };

const cleanSubject = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanMessage = (value: unknown) =>
  String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

export function validateLeadEmail(input: Record<string, unknown>): { ok: true; value: ValidLeadEmail } | Fail {
  const source = Array.isArray(input.recipients) ? input.recipients.join("\n") : String(input.recipients ?? "");
  if (source.length > 5_000) return { ok: false, status: 400, field: "recipients", message: "Danh sách email quá dài." };
  const recipients = [...new Set(source.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) return { ok: false, status: 400, field: "recipients", message: "Nhập ít nhất một địa chỉ email." };
  if (recipients.length > MAX_LEAD_EMAIL_RECIPIENTS) {
    return { ok: false, status: 400, field: "recipients", message: `Mỗi lần gửi tối đa ${MAX_LEAD_EMAIL_RECIPIENTS} địa chỉ email.` };
  }
  const invalid = recipients.find((email) => email.length > 254 || !EMAIL_RE.test(email));
  if (invalid) return { ok: false, status: 400, field: "recipients", message: `Email không hợp lệ: ${invalid}` };

  const subject = cleanSubject(input.subject);
  if (subject.length < 3 || subject.length > 150) return { ok: false, status: 400, field: "subject", message: "Tiêu đề phải có từ 3 đến 150 ký tự." };

  const rawHtml = String(input.messageHtml ?? "");
  if (rawHtml.length > 50_000) return { ok: false, status: 400, field: "message", message: "Nội dung định dạng quá lớn." };
  const messageHtml = rawHtml.trim() ? sanitizeLeadEmailHtml(rawHtml) : "";
  const message = cleanMessage(messageHtml ? leadEmailHtmlToText(messageHtml) : input.message);
  if (message.length < 10 || message.length > 5_000) return { ok: false, status: 400, field: "message", message: "Nội dung phải có từ 10 đến 5.000 ký tự." };
  if (input.consent !== true) return { ok: false, status: 400, field: "consent", message: "Cần xác nhận người nhận đã đồng ý nhận email." };
  return { ok: true, value: { recipients, subject, message, ...(messageHtml ? { messageHtml } : {}) } };
}

export const leadEmailService = {
  async send(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; sent: number; failed: number; failedEmails: string[]; delivery: "provider" | "preview" } | Fail> {
    if (!actor.admin) return { ok: false, status: 403, message: "Chỉ quản trị viên được gửi email khách hàng." };
    const checked = validateLeadEmail(input);
    if (!checked.ok) return checked;

    const campaignId = randomUUID();
    const text = `${checked.value.message}\n\n—\nTrovio\nEmail này được gửi vì bạn đã đồng ý nhận thông tin từ Trovio.`;
    const html = checked.value.messageHtml
      ? `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">${checked.value.messageHtml}<hr style="border:0;border-top:1px solid #e2e8f0"><p style="color:#64748b;font-size:12px">—<br>Trovio<br>Email này được gửi vì bạn đã đồng ý nhận thông tin từ Trovio.</p></div>`
      : undefined;
    const failedEmails: string[] = [];
    let sent = 0;
    for (const [index, recipient] of checked.value.recipients.entries()) {
      try {
        await sendMail({
          to: recipient,
          subject: checked.value.subject,
          text,
          html,
          idempotencyKey: `lead-email/${campaignId}/${index}`,
        });
        sent += 1;
      } catch {
        failedEmails.push(recipient);
      }
    }
    if (sent === 0) return { ok: false, status: 502, message: "Dịch vụ email chưa gửi được thư. Vui lòng kiểm tra cấu hình và thử lại." };
    return { ok: true, sent, failed: failedEmails.length, failedEmails, delivery: isMailerConfigured() ? "provider" : "preview" };
  },
};
