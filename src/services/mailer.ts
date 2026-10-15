/**
 * SERVICE LAYER — gửi email.
 * Khi có RESEND_API_KEY + MAIL_FROM, email được gửi qua Resend REST API.
 * Nếu chưa cấu hình, chế độ phát triển vẫn in nội dung ra terminal để kiểm thử luồng.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Nội dung HTML đã được làm sạch; text luôn được giữ làm bản dự phòng. */
  html?: string;
  /** Khoá chống gửi lặp khi nhà cung cấp nhận lại cùng một request. */
  idempotencyKey?: string;
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export async function sendMail(msg: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, ...(msg.html ? { html: msg.html } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new Error(`Không gửi được email (${response.status})${detail ? `: ${detail}` : "."}`);
    }
    return;
  }
  console.info(`[trovio:email] → ${msg.to}\n  ${msg.subject}\n  ${msg.text.replace(/\n/g, "\n  ")}`);
}
