"use client";

import { useState, type InputHTMLAttributes } from "react";
import { LuCheck, LuEye, LuEyeOff, LuX } from "react-icons/lu";
import { checkPassword, passwordStrength, STRENGTH_LABELS } from "@/services/password.rules";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/field";

export function PasswordInput({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} invalid={invalid} className="pr-11" {...rest} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <LuEyeOff className="size-4" /> : <LuEye className="size-4" />}
      </button>
    </div>
  );
}

/** Chỉ hiển thị khi người dùng đã bắt đầu gõ. */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = passwordStrength(value);
  const color = s <= 1 ? "bg-danger-500" : s === 2 ? "bg-accent-500" : "bg-success-500";
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= s ? color : "bg-slate-200")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Độ mạnh: <strong className="text-slate-700">{STRENGTH_LABELS[s]}</strong>
      </p>
    </div>
  );
}

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-[13px]" aria-label="Yêu cầu mật khẩu">
      {checkPassword(value).map((c) => (
        <li key={c.id} className={cn("flex items-center gap-2", c.passed ? "text-success-700" : "text-slate-500")}>
          {c.passed ? <LuCheck className="size-4" aria-hidden /> : <LuX className="size-4" aria-hidden />}
          {c.label}
          <span className="sr-only">{c.passed ? " – đạt" : " – chưa đạt"}</span>
        </li>
      ))}
    </ul>
  );
}
