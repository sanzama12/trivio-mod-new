/**
 * SERVICE LAYER — gửi email.
 * Bản demo chưa tích hợp nhà cung cấp email: nội dung được in ra terminal đang chạy `npm run dev`
 * (tìm dòng "[trovio:email]"). Khi triển khai thật, thay phần thân hàm bằng SMTP / Resend / SES…
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  console.info(`[trovio:email] → ${msg.to}\n  ${msg.subject}\n  ${msg.text.replace(/\n/g, "\n  ")}`);
}
