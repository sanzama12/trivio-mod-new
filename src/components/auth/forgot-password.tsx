"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LuArrowLeft, LuCheck, LuCircleCheck, LuClock, LuMailCheck } from "react-icons/lu";
import { checkPassword } from "@/services/password.rules";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { PasswordChecklist, PasswordInput } from "./password-input";

const STEPS = ["Xác minh email", "Mật khẩu mới", "Hoàn tất"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Các bước khôi phục">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              i < step ? "bg-success-700 text-white" : i === step ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600",
            )}
          >
            {i < step ? <LuCheck className="size-3.5" aria-label="Đã xong" /> : i + 1}
          </span>
          <span className={cn("text-xs", i === step ? "font-semibold text-slate-900" : "text-slate-500")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function ForgotPassword({ expired = false, initialToken, demo = false }: { expired?: boolean; initialToken?: string; demo?: boolean }) {
  const [step, setStep] = useState<0 | 1 | 2>(initialToken ? 1 : 0);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken ?? "");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(expired);

  if (isExpired) {
    return (
      <div>
        <Stepper step={0} />
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-50 text-accent-500">
            <LuClock className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Liên kết đã hết hạn</h1>
          <p className="mt-2 text-sm text-slate-600">Liên kết đặt lại mật khẩu chỉ có hiệu lực 30 phút hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.</p>
          <Button full className="mt-6" onClick={() => setIsExpired(false)}>
            Gửi lại liên kết →
          </Button>
          <Link href="/dang-nhap" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
            <LuArrowLeft className="size-4" aria-hidden /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const request = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Email không hợp lệ.");
    setError(null);
    const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return setError(data.message ?? "Bạn thao tác quá nhanh, vui lòng thử lại sau.");
    setToken(data.token ?? "");
    setSent(true);
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkPassword(pw).every((c) => c.passed)) return setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
    if (pw !== confirm) return setError("Mật khẩu xác nhận không khớp.");
    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
    const data = await res.json();
    if (data.ok) {
      setError(null);
      setStep(2);
    } else if (data.reason === "expired") setIsExpired(true);
    else setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
  };

  return (
    <div>
      <Stepper step={step} />
      {step === 0 && !sent && (
        <form onSubmit={request} noValidate>
          <h1 className="text-2xl font-bold">Khôi phục mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
          <div className="mt-6">
            <Label htmlFor="fp-email">Email đã đăng ký</Label>
            <Input id="fp-email" type="email" autoComplete="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} aria-describedby="fp-err" />
            <FieldError id="fp-err">{error}</FieldError>
          </div>
          <Button type="submit" full className="mt-5">
            Gửi liên kết khôi phục →
          </Button>
          <Link href="/dang-nhap" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
            <LuArrowLeft className="size-4" aria-hidden /> Quay lại đăng nhập
          </Link>
        </form>
      )}

      {step === 0 && sent && (
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-50 text-success-500">
            <LuMailCheck className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Kiểm tra hộp thư của bạn</h1>
          <p className="mt-2 text-sm text-slate-600">
            Nếu <strong>{email}</strong> đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Liên kết có hiệu lực 30 phút.
          </p>
          {demo && token ? (
            <Button full className="mt-6" onClick={() => setStep(1)}>
              Mở liên kết trong email (demo) →
            </Button>
          ) : (
            <p className="mt-6 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600">Mở liên kết trong email để đặt mật khẩu mới. Không thấy email? Kiểm tra thư mục Spam.</p>
          )}
          <button type="button" onClick={() => setSent(false)} className="mt-4 text-sm font-semibold text-primary-600 hover:underline">
            Gửi lại hoặc dùng email khác
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={reset} noValidate>
          <h1 className="text-2xl font-bold">Đặt mật khẩu mới</h1>
          <p className="mt-1 text-sm text-slate-500">Sau khi xác minh email, hãy đặt mật khẩu mới để hoàn tất.</p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fp-pw">Mật khẩu mới</Label>
              <PasswordInput id="fp-pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <PasswordChecklist value={pw} />
            </div>
            <div>
              <Label htmlFor="fp-confirm">Xác nhận mật khẩu</Label>
              <PasswordInput id="fp-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!error} aria-describedby="fp-pw-err" />
              <FieldError id="fp-pw-err">{error}</FieldError>
            </div>
          </div>
          <Button type="submit" full className="mt-6">
            Đặt lại mật khẩu
          </Button>
          {token === "reset-unknown" && (
            <p className="mt-3 text-center text-xs text-slate-500">Email này chưa đăng ký nên liên kết sẽ báo hết hạn (mô phỏng).</p>
          )}
        </form>
      )}

      {step === 2 && (
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-50 text-success-500">
            <LuCircleCheck className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Mật khẩu đã được đặt lại</h1>
          <p className="mt-2 text-sm text-slate-600">Bạn có thể đăng nhập ngay bằng mật khẩu mới. Tài khoản bị tạm khoá (nếu có) cũng đã được mở.</p>
          <Link href="/dang-nhap" className={buttonClass({ full: true, className: "mt-6" })}>
            Đăng nhập ngay →
          </Link>
        </div>
      )}
    </div>
  );
}
