"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LuCircleCheck, LuInfo, LuMailCheck } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const LEN = 6;

export function VerifyEmail({ email, next = "/", demo = false }: { email: string; next?: string; demo?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      // Dán cả mã
      const next = clean.slice(0, LEN).split("");
      setDigits(Array.from({ length: LEN }, (_, k) => next[k] ?? ""));
      refs.current[Math.min(next.length, LEN - 1)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, k) => (k === i ? clean : x)));
    setError(null);
    if (clean && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const code = digits.join("");
  const verify = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setDone(true);
      router.refresh();
    } else setError(data.message);
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-50 text-success-500">
          <LuCircleCheck className="size-8" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Email đã được xác thực!</h1>
        <p className="mt-2 text-sm text-slate-600">Tài khoản của bạn đã được kích hoạt. Giờ bạn có thể lưu chương trình và lập danh sách nguyện vọng.</p>
        <Link href={`/chao-mung?next=${encodeURIComponent(next)}`} className={buttonClass({ full: true, className: "mt-6" })}>
          Tiếp tục →
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <LuMailCheck className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold">Xác thực email của bạn</h1>
      <p className="mt-2 text-sm text-slate-600">
        Chúng tôi đã gửi mã 6 chữ số đến <strong className="text-slate-900">{email || "email của bạn"}</strong>. Vui lòng nhập mã bên dưới.
      </p>
      <fieldset className="mt-6">
        <legend className="sr-only">Mã xác thực 6 chữ số</legend>
        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LEN}
              aria-label={`Chữ số ${i + 1}`}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
              }}
              className={cn(
                "size-12 rounded-xl border-2 text-center text-xl font-bold focus:ring-4 focus:outline-none sm:size-14",
                error ? "border-danger-500 focus:ring-danger-100" : d ? "border-primary-600 focus:ring-primary-100" : "border-slate-300 focus:border-primary-600 focus:ring-primary-100",
              )}
            />
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      <Button full className="mt-6" disabled={code.length < LEN || loading} onClick={verify}>
        {loading ? "Đang xác thực…" : "Xác thực →"}
      </Button>
      <p className="mt-4 text-sm text-slate-600">
        Chưa nhận được mã?{" "}
        {cooldown > 0 ? (
          <span className="text-slate-500">Gửi lại sau {cooldown}s</span>
        ) : (
          <button
            type="button"
            className="font-semibold text-primary-600 hover:underline"
            onClick={async () => {
              setCooldown(60);
              const res = await fetch("/api/auth/verify-email/resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              toast(res.ok ? "Đã gửi lại mã xác thực" : "Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau", res.ok ? "success" : "warning");
            }}
          >
            Gửi lại mã
          </button>
        )}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Nhập sai địa chỉ?{" "}
        <Link href={`/dang-ky?next=${encodeURIComponent(next)}`} className="font-semibold text-primary-600 hover:underline">
          Đổi email khác
        </Link>
      </p>
      {demo && (
        <p className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-primary-50 p-3 text-[13px] text-primary-900">
          <LuInfo className="size-4 text-primary-600" aria-hidden /> Bản demo: dùng mã <strong>592841</strong> (hoặc mã in ở terminal chạy server)
        </p>
      )}
    </div>
  );
}
