"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LuMail, LuSend, LuShieldCheck, LuUsers } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { sanitizeLeadEmailHtml } from "@/lib/email-html";
import { RichEmailEditor } from "./rich-email-editor";
import { inputCls, Panel } from "./ui";
import { useAdminPost } from "./use-admin-post";

type SendResult = { sent: number; failed: number; failedEmails: string[]; delivery: "provider" | "preview" };

export function LeadEmailForm({ configured }: { configured: boolean }) {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageHtml, setMessageHtml] = useState("");
  const [consent, setConsent] = useState(false);
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const { post, busy, toast } = useAdminPost();
  const recipientCount = useMemo(() => new Set(recipients.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean)).size, [recipients]);
  const safePreviewHtml = useMemo(() => sanitizeLeadEmailHtml(messageHtml), [messageHtml]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);
    setResult(null);
    const response = await post("/api/admin/lead-emails", { recipients, subject, message, messageHtml, consent }, { refresh: false });
    if (!response.ok) {
      setFieldError({ field: typeof response.field === "string" ? response.field : undefined, message: response.message ?? "Không gửi được email." });
      return;
    }
    const next = {
      sent: Number(response.sent ?? 0),
      failed: Number(response.failed ?? 0),
      failedEmails: Array.isArray(response.failedEmails) ? response.failedEmails.map(String) : [],
      delivery: response.delivery === "provider" ? "provider" as const : "preview" as const,
    };
    setResult(next);
    toast(
      next.delivery === "preview" ? `Đã mô phỏng ${next.sent} email trong terminal.` : next.failed ? `Đã gửi ${next.sent} email, ${next.failed} email chưa gửi được.` : `Đã gửi ${next.sent} email.`,
      next.failed ? "warning" : "success",
    );
    if (next.failed) {
      setRecipients(next.failedEmails.join("\n"));
      setConsent(false);
    }
    if (!next.failed) {
      setRecipients("");
      setSubject("");
      setMessage("");
      setMessageHtml("");
      setConsent(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <Panel className="p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600" aria-hidden>
            <LuMail className="size-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Soạn email thông báo</h2>
            <p className="mt-1 text-sm text-slate-500">Mỗi người nhận được một email riêng; danh sách địa chỉ không bị lộ cho nhau.</p>
          </div>
        </div>

        {!configured && (
          <div className="mb-5 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-900" role="status">
            <strong>Chế độ thử nghiệm:</strong> chưa có <code>RESEND_API_KEY</code> và <code>MAIL_FROM</code>, nên email sẽ được ghi vào terminal thay vì gửi ra ngoài.
          </div>
        )}
        {fieldError && !fieldError.field && <p className="mb-5 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">{fieldError.message}</p>}
        {result && (
          <div className={cn("mb-5 rounded-xl px-4 py-3 text-sm", result.failed ? "bg-accent-50 text-accent-900" : "bg-success-50 text-success-700")} role="status">
            {result.delivery === "preview" ? `Đã mô phỏng ${result.sent} email trong terminal.` : `Đã gửi thành công ${result.sent} email.`}
            {result.failed > 0 && <> Chưa gửi được {result.failed} địa chỉ: {result.failedEmails.join(", ")}.</>}
          </div>
        )}

        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label htmlFor="lead-recipients" className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
              <span>Địa chỉ người nhận <span className="text-danger-600">*</span></span>
              <span className="font-normal text-slate-500">{recipientCount}/20</span>
            </label>
            <textarea
              id="lead-recipients"
              className={cn(inputCls, "mt-1.5 min-h-28 resize-y py-2.5", fieldError?.field === "recipients" && "!border-danger-500")}
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              placeholder={"an@example.com\nbinh@example.com"}
              required
              aria-describedby="lead-recipients-hint"
            />
            <p id="lead-recipients-hint" className="mt-1.5 text-xs text-slate-500">Phân tách bằng dấu phẩy, dấu chấm phẩy, khoảng trắng hoặc xuống dòng.</p>
            {fieldError?.field === "recipients" && <p className="mt-1 text-xs text-danger-700" role="alert">{fieldError.message}</p>}
          </div>

          <div>
            <label htmlFor="lead-subject" className="text-sm font-semibold text-slate-800">Tiêu đề <span className="text-danger-600">*</span></label>
            <input id="lead-subject" className={cn(inputCls, "mt-1.5", fieldError?.field === "subject" && "!border-danger-500")} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={150} required />
            {fieldError?.field === "subject" && <p className="mt-1 text-xs text-danger-700" role="alert">{fieldError.message}</p>}
          </div>

          <div>
            <label htmlFor="lead-message" className="text-sm font-semibold text-slate-800">Nội dung <span className="text-danger-600">*</span></label>
            <RichEmailEditor
              value={messageHtml}
              invalid={fieldError?.field === "message"}
              onChange={(html, text) => {
                setMessageHtml(html);
                setMessage(text);
                if (fieldError?.field === "message") setFieldError(null);
              }}
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">Có thể dán từ Word, chèn bảng và định dạng như văn bản.</span>
              <span className={message.length > 5_000 ? "font-semibold text-danger-700" : "text-slate-400"}>{message.length}/5.000</span>
            </div>
            {fieldError?.field === "message" && <p className="mt-1 text-xs text-danger-700" role="alert">{fieldError.message}</p>}
          </div>

          <div>
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4", fieldError?.field === "consent" ? "border-danger-300 bg-danger-50" : "border-slate-200 bg-slate-50")}>
              <input type="checkbox" className="mt-0.5 size-4 accent-primary-600" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span className="text-sm text-slate-700"><strong className="font-semibold text-slate-900">Xác nhận sự đồng ý:</strong> các địa chỉ trên đã đồng ý nhận thông tin từ Trovio.</span>
            </label>
            {fieldError?.field === "consent" && <p className="mt-1 text-xs text-danger-700" role="alert">{fieldError.message}</p>}
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <Button type="submit" disabled={busy || !consent || recipientCount === 0 || message.length < 10 || message.length > 5_000}>
              <LuSend className="size-4" aria-hidden /> {busy ? "Đang gửi…" : `Gửi ${recipientCount || ""} email`.trim()}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><LuUsers className="size-4 text-primary-600" aria-hidden /> Người nhận phù hợp</div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Chỉ nhập khách hàng đã chủ động để lại email và đồng ý nhận thông tin. Không tự lấy địa chỉ từ hành vi xem trang hoặc dữ liệu hồ sơ.</p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><LuShieldCheck className="size-4 text-success-700" aria-hidden /> Kiểm soát gửi</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Tối đa 20 người nhận mỗi lần.</li>
            <li>Tối đa 5 lần gửi mỗi giờ cho mỗi quản trị viên.</li>
            <li>Email trùng được tự động loại bỏ.</li>
          </ul>
        </Panel>
        <Panel className="overflow-hidden p-5">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Xem trước nội dung</p>
          <p className="mt-3 break-words font-semibold text-slate-900">{subject || "Tiêu đề email"}</p>
          {safePreviewHtml ? (
            <div className="email-rich-preview mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: safePreviewHtml }} />
          ) : (
            <p className="mt-3 text-sm text-slate-400">Nội dung email sẽ xuất hiện ở đây.</p>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">—<br />Trovio</p>
        </Panel>
      </div>
    </div>
  );
}
