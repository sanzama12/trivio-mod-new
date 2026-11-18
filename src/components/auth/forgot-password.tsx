"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LuArrowLeft, LuCheck, LuCircleCheck, LuClock, LuMailCheck, LuExternalLink } from "react-icons/lu";
import { checkPassword } from "@/services/password.rules";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { PasswordChecklist, PasswordInput } from "./password-input";
import { isFirebaseConfigured, sendFirebasePasswordReset } from "@/lib/firebase";

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
  const [loading, setLoading] = useState(false);
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
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("Email không hợp lệ.");
    setError(null);
    setLoading(true);

    try {
      // 1. Nếu Firebase được cấu hình, gửi email đặt lại mật khẩu qua Firebase Client SDK
      if (isFirebaseConfigured()) {
        try {
          await sendFirebasePasswordReset(cleanEmail);
        } catch (firebaseErr: unknown) {
          console.warn("[forgot-password] Firebase client reset email:", firebaseErr);
        }
      }

      // 2. Gửi request tới backend Trovio để kích hoạt Firebase REST API hoặc mailer hệ thống
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError(data.message ?? "Bạn thao tác quá nhanh, vui lòng thử lại sau.");
        return;
      }
      setToken(data.token ?? "");
      setSent(true);
    } catch {
      setError("Không thể gửi yêu cầu. Vui lòng kiểm tra kết nối mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkPassword(pw).every((c) => c.passed)) return setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
    if (pw !== confirm) return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setError(null);
        setStep(2);
      } else if (data.reason === "expired") {
        setIsExpired(true);
      } else {
        setError(data.message ?? "Mật khẩu chưa đáp ứng đủ yêu cầu.");
      }
    } catch {
      setError("Không thể kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const isGmail = email.trim().toLowerCase().endsWith("@gmail.com");

  return (
    <div>
      <Stepper step={step} />
      {step === 0 && !sent && (
        <form onSubmit={request} noValidate>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Khôi phục mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-600">Nhập email của bạn để nhận liên kết thiết lập lại mật khẩu truy cập.</p>
          <div className="mt-6">
            <Label htmlFor="fp-email">Email của bạn</Label>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              value={email}
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              invalid={!!error}
              aria-describedby="fp-err"
            />
            <FieldError id="fp-err">{error}</FieldError>
          </div>
          <Button type="submit" full className="mt-5" disabled={loading}>
            {loading ? "Đang gửi email..." : "Gửi liên kết khôi phục →"}
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
          <h1 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">Kiểm tra hộp thư của bạn</h1>
          <p className="mt-2 text-sm text-slate-600">
            Liên kết thiết lập lại mật khẩu đã được gửi tới <strong>{email}</strong>.
            Vui lòng kiểm tra hộp thư đến (và cả thư mục Spam/Rác) rồi nhấn vào liên kết để tạo mật khẩu mới.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            {isGmail && (
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className={buttonClass({ variant: "outline", full: true, className: "gap-1.5" })}
              >
                Mở Gmail <LuExternalLink className="size-4" />
              </a>
            )}

            {demo && token ? (
              <Button full onClick={() => setStep(1)}>
                Mở liên kết trong email (demo) →
              </Button>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              Gửi lại hoặc dùng email khác
            </button>
          </div>
          <div className="mt-3">
            <Link href="/dang-nhap" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
              <LuArrowLeft className="size-3" /> Về trang đăng nhập
            </Link>
          </div>
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
          <Button type="submit" full className="mt-6" disabled={loading}>
            {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
          </Button>
          {token === "reset-unknown" && (
            <p className="mt-3 text-center text-xs text-slate-600">Email này chưa đăng ký nên liên kết sẽ báo hết hạn (mô phỏng).</p>
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
