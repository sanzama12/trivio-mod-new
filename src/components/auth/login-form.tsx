"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuCircleAlert, LuInfo, LuLock } from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { GoogleButton } from "./google-button";
import { oauthErrorMessage } from "./oauth-errors";

type Status = { kind: "idle" } | { kind: "error"; message: string; forgot?: boolean } | { kind: "locked" };

export function LoginForm({ next, error, demo = false }: { next: string; error?: string; demo?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const oauthError = oauthErrorMessage(error);
  const [status, setStatus] = useState<Status>(oauthError ? { kind: "error", message: oauthError } : { kind: "idle" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const creds = { email, password };
    if (!creds.email || !creds.password) {
      setStatus({ kind: "error", message: "Vui lòng nhập email và mật khẩu." });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push(data.user.onboarded ? next : `/chao-mung?next=${encodeURIComponent(next)}`);
      router.refresh();
      return;
    }
    if (res.status === 429) return setStatus({ kind: "error", message: data.message ?? "Bạn thao tác quá nhanh, vui lòng thử lại sau." });
    if (data.reason === "locked") return setStatus({ kind: "locked" });
    if (data.reason === "google_only") {
      return setStatus({
        kind: "error",
        message: "Email này đang đăng nhập bằng Google. Bấm “Tiếp tục với Google” bên dưới, hoặc dùng “Quên mật khẩu” để tạo mật khẩu.",
      });
    }
    if (data.reason === "unverified") return router.push(`/xac-thuc-email?email=${encodeURIComponent(data.email)}`);
    setStatus({
      kind: "error",
      forgot: true,
      message:
        data.attemptsLeft <= 3
          ? `Email hoặc mật khẩu không đúng. Bạn còn ${data.attemptsLeft} lần thử trước khi tài khoản bị tạm khoá.`
          : "Email hoặc mật khẩu không đúng. Vui lòng thử lại.",
    });
  };

  if (status.kind === "locked") {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-50 text-danger-500">
          <LuLock className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Tài khoản tạm khoá</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Tài khoản bị khoá do đăng nhập sai quá nhiều lần. Đặt lại mật khẩu để mở khoá ngay, hoặc liên hệ hỗ trợ.
        </p>
        <div className="mt-6 space-y-3">
          <Link href="/quen-mat-khau" className={buttonClass({ full: true })}>
            Khôi phục mật khẩu
          </Link>
          <Link href="/tro-giup#lien-he" className={buttonClass({ variant: "outline", full: true })}>
            Liên hệ hỗ trợ
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-500">support@trovio.vn · 1900 8198</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold md:text-[28px]">Đăng nhập</h1>
      <p className="mt-1 text-sm text-slate-500">Đăng nhập để đồng bộ danh sách đã lưu và lập nguyện vọng dự kiến trên mọi thiết bị.</p>

      {status.kind === "error" && (
        <div role="alert" className="mt-5 flex gap-2 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
          <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {status.message}{" "}
            {status.forgot && (
              <Link href="/quen-mat-khau" className="font-semibold underline">
                Quên mật khẩu?
              </Link>
            )}
          </span>
        </div>
      )}

      <div className="mt-6">
        <GoogleButton next={next} />
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200" /> hoặc đăng nhập bằng email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
            <Link href="/quen-mat-khau" className="mb-1.5 text-[13px] font-semibold text-primary-600 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Checkbox label="Ghi nhớ đăng nhập" defaultChecked />
        <Button type="submit" full disabled={loading}>
          {loading ? "Đang đăng nhập…" : "Đăng nhập →"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Chưa có tài khoản?{" "}
        <Link href={`/dang-ky?next=${encodeURIComponent(next)}`} className="font-semibold text-primary-600 hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>

      {demo && (
        <div className="mt-8 flex gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-[13px] text-primary-900">
          <LuInfo className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
          <div>
            <p className="font-semibold">Tài khoản demo (mật khẩu Trovio@2026)</p>
            <p>Học sinh: an@trovio.vn · Quản trị: admin@trovio.vn · Bị khoá: binh.locked@trovio.vn</p>
          </div>
        </div>
      )}
    </div>
  );
}
