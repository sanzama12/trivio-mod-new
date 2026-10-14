"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuCheck, LuShieldCheck, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { PasswordInput, PasswordStrength } from "./password-input";
import { GoogleButton } from "./google-button";

type Field = "name" | "email" | "password" | "confirm" | "terms";

export function RegisterForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (error?.field === k) setError(null);
  };
  const err = (f: Field) => (error?.field === f ? error.message : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push(`/xac-thuc-email?email=${encodeURIComponent(data.user.email)}&next=${encodeURIComponent(next)}`);
      return;
    }
    // Lỗi chung (VD: gửi quá nhiều lần) không gắn với ô nào → hiện dưới ô email.
    setError({ field: data.field ?? "email", message: data.message ?? "Không tạo được tài khoản, vui lòng thử lại." });
    document.getElementById(`r-${data.field ?? "email"}`)?.focus();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold md:text-[28px]">Tạo tài khoản</h1>
      <p className="mt-1 text-sm text-slate-500">Đăng ký để lưu lựa chọn và lập nguyện vọng dự kiến.</p>
      <div className="mt-6">
        <GoogleButton next={next} label="Đăng ký nhanh với Google" />
        <p className="mt-2 text-center text-xs text-slate-500">Chỉ lấy họ tên, email và ảnh đại diện. Không cần xác thực email lại.</p>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200" /> hoặc đăng ký bằng email <span className="h-px flex-1 bg-slate-200" />
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="r-name">Tên gọi (không bắt buộc)</Label>
          <Input id="r-name" autoComplete="nickname" placeholder="VD: An" maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!err("name")} aria-describedby={err("name") ? "r-name-err" : undefined} />
          <FieldError id="r-name-err">{err("name")}</FieldError>
        </div>
        <div>
          <Label htmlFor="r-email">Email</Label>
          <Input
            id="r-email"
            type="email"
            autoComplete="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!err("email")}
            aria-describedby={err("email") ? "r-email-err" : undefined}
          />
          <FieldError id="r-email-err">
            {err("email")}
            {err("email") === "Email này đã được đăng ký." && (
              <>
                {" "}
                <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="font-semibold underline">
                  Đăng nhập
                </Link>{" "}
                hoặc dùng email khác.
              </>
            )}
          </FieldError>
        </div>
        <div>
          <Label htmlFor="r-password">Tạo mật khẩu</Label>
          <PasswordInput
            id="r-password"
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            invalid={!!err("password")}
            aria-describedby={err("password") ? "r-password-err" : undefined}
          />
          <PasswordStrength value={form.password} />
          <FieldError id="r-password-err">{err("password")}</FieldError>
        </div>
        <div>
          <Label htmlFor="r-confirm">Xác nhận mật khẩu</Label>
          <PasswordInput
            id="r-confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            invalid={!!err("confirm")}
            aria-describedby={err("confirm") ? "r-confirm-err" : undefined}
          />
          <FieldError id="r-confirm-err">{err("confirm")}</FieldError>
        </div>
        <div className="rounded-xl bg-success-50 p-3.5" role="note" aria-labelledby="privacy-promise">
          <p id="privacy-promise" className="flex gap-2 text-sm font-semibold text-success-700">
            <LuShieldCheck className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            Trovio không hỏi số điện thoại, ngày sinh hay Facebook của bạn.
          </p>
          <p className="mt-1.5 text-xs text-slate-700">
            Chỉ cần email và mật khẩu (hoặc Google) để lưu danh sách của bạn. Không bán dữ liệu, không gọi điện tư vấn. Xoá tài khoản bất cứ lúc nào trong Hồ sơ.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium" aria-label="Dữ liệu Trovio thu thập">
            {(
              [
                ["Email", true],
                ["Mật khẩu", true],
                ["Số điện thoại", false],
                ["Ngày sinh", false],
                ["Facebook", false],
              ] as const
            ).map(([label, ok]) => (
              <li key={label} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                {ok ? <LuCheck className="size-3 text-success-700" aria-hidden /> : <LuX className="size-3 text-slate-400" aria-hidden />}
                <span className={ok ? "text-slate-700" : "text-slate-400 line-through"}>{label}</span>
                <span className="sr-only">{ok ? " — có thu thập" : " — không thu thập"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input id="r-terms" type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 size-4 accent-primary-600" />
            <span>
              Tôi đồng ý với{" "}
              <Link href="/dieu-khoan" className="font-semibold text-primary-600 hover:underline">
                Điều khoản sử dụng
              </Link>{" "}
              và{" "}
              <Link href="/chinh-sach-rieng-tu" className="font-semibold text-primary-600 hover:underline">
                Chính sách riêng tư
              </Link>
            </span>
          </label>
          <FieldError>{err("terms")}</FieldError>
        </div>
        <Button type="submit" full disabled={loading}>
          {loading ? "Đang tạo tài khoản…" : "Tạo tài khoản →"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Đã có tài khoản?{" "}
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="font-semibold text-primary-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
