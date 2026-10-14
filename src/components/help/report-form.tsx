"use client";

/** Biểu mẫu "Báo dữ liệu sai" — gửi thật tới /api/reports, quản trị viên xử lý ở /quan-tri/bao-loi. */
import { useState, type FormEvent } from "react";
import { LuCircleCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

const TOPICS = [
  ["diem-chuan", "Điểm chuẩn"],
  ["hoc-phi", "Học phí"],
  ["chi-tieu", "Chỉ tiêu"],
  ["to-hop", "Tổ hợp / phương thức xét tuyển"],
  ["thong-tin-truong", "Thông tin trường / ngành"],
  ["khac", "Khác"],
] as const;

export function ReportForm({ program, signedInEmail }: { program?: { id: string; label: string } | null; signedInEmail?: string | null }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const detail = String(data.get("detail") ?? "").trim();
    if (detail.length < 10) return setError({ field: "detail", message: "Vui lòng mô tả thông tin cần sửa (ít nhất 10 ký tự)." });
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program?.id ?? null,
          page: String(data.get("page") ?? ""),
          topic: String(data.get("topic") ?? "khac"),
          email: String(data.get("email") ?? ""),
          detail,
          website: String(data.get("website") ?? ""),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setError({ field: d.field, message: d.message ?? "Không gửi được, vui lòng thử lại." });
      setSent(true);
    } catch {
      setError({ message: "Không kết nối được. Kiểm tra mạng và thử lại." });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-success-50 p-5 text-success-700" role="status">
        <LuCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">Đã gửi báo lỗi, cảm ơn bạn!</p>
          <p className="mt-1 text-sm text-slate-700">
            Đội biên tập sẽ kiểm tra và báo kết quả {signedInEmail ? "trong mục Thông báo (biểu tượng chuông) và qua email" : "qua email nếu bạn để lại địa chỉ"}.
          </p>
          <button type="button" onClick={() => setSent(false)} className="mt-2 text-sm font-semibold text-primary-700 hover:underline">
            Gửi thêm báo lỗi khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rp-page">Trang / chương trình liên quan</Label>
          <Input id="rp-page" name="page" defaultValue={program?.label ?? ""} maxLength={200} placeholder="VD: Marketing – ĐH Kinh tế Quốc dân" />
        </div>
        <div>
          <Label htmlFor="rp-topic">Loại thông tin</Label>
          <select id="rp-topic" name="topic" defaultValue="diem-chuan" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none">
            {TOPICS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="rp-detail">Thông tin cần sửa</Label>
        <textarea
          id="rp-detail"
          name="detail"
          rows={4}
          maxLength={2000}
          aria-invalid={error?.field === "detail" || undefined}
          aria-describedby={error?.field === "detail" ? "rp-err" : undefined}
          placeholder="Mô tả số liệu sai và nguồn đúng (link đề án tuyển sinh, thông báo của trường…)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
        />
      </div>
      <div className="max-w-md">
        <Label htmlFor="rp-email">Email nhận phản hồi {signedInEmail ? "(mặc định: email tài khoản)" : "(không bắt buộc)"}</Label>
        <Input id="rp-email" name="email" type="email" maxLength={200} placeholder={signedInEmail ?? "email@example.com"} invalid={error?.field === "email"} />
      </div>
      {/* Bẫy bot: người dùng không nhìn thấy ô này. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FieldError id="rp-err">{error?.message}</FieldError>
      <p className="text-xs text-slate-500">Email chỉ dùng để báo kết quả xử lý, không hiển thị công khai.</p>
      <Button type="submit" disabled={busy}>
        {busy ? "Đang gửi…" : "Gửi báo lỗi dữ liệu"}
      </Button>
    </form>
  );
}
