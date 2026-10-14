"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuCircleAlert, LuKeyRound } from "react-icons/lu";
import type { PublicUser } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { GoogleButton, GoogleIcon } from "@/components/auth/google-button";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { oauthErrorMessage } from "@/components/auth/oauth-errors";

type PwField = "current" | "password" | "confirm";

/** Quản lý cách đăng nhập: Google và/hoặc mật khẩu. Luôn giữ ít nhất 1 cách. */
export function LoginMethods({ user, googleConfigured, error }: { user: PublicUser; googleConfigured: boolean; error?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pwOpen, setPwOpen] = useState(false);
  const [form, setForm] = useState({ current: "", password: "", confirm: "" });
  const [pwError, setPwError] = useState<{ field?: PwField; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const oauthError = oauthErrorMessage(error);

  const set = (k: PwField, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (pwError?.field === k) setPwError(null);
  };
  const err = (f: PwField) => (pwError?.field === f ? pwError.message : undefined);

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) return setPwError({ field: data.field, message: data.message });
    toast(user.hasPassword ? "Đã đổi mật khẩu" : "Đã tạo mật khẩu — bạn có thể đăng nhập bằng email", "success");
    setPwOpen(false);
    setForm({ current: "", password: "", confirm: "" });
    router.refresh();
  };

  const signOutOthers = async () => {
    setBusy(true);
    const res = await fetch("/api/account/sessions", { method: "DELETE" });
    setBusy(false);
    toast(res.ok ? "Đã đăng xuất khỏi mọi thiết bị khác" : "Không thực hiện được, vui lòng thử lại", res.ok ? "success" : "warning");
  };

  const unlinkGoogle = async () => {
    setBusy(true);
    const res = await fetch("/api/account/google", { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) return toast(data.message, "warning");
    toast("Đã gỡ liên kết Google", "info");
    router.refresh();
  };

  return (
    <Card id="dang-nhap" className="scroll-mt-24 p-6">
      <h2 className="text-lg font-bold">Phương thức đăng nhập</h2>
      <p className="mt-1 text-sm text-slate-500">Bạn cần giữ ít nhất một cách đăng nhập. Cả hai cách dùng chung email {user.email}.</p>

      {oauthError && (
        <div role="alert" className="mt-4 flex gap-2 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
          <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {oauthError}
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
        <li className="flex flex-wrap items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-slate-50">
            <GoogleIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Google</p>
            <p className="text-[13px] text-slate-500">{user.hasGoogle ? "Đã liên kết" : "Đăng nhập 1 chạm, không cần nhớ mật khẩu"}</p>
          </div>
          {user.hasGoogle ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={unlinkGoogle}
              disabled={busy || !user.hasPassword}
              title={user.hasPassword ? undefined : "Tạo mật khẩu trước khi gỡ Google"}
            >
              Gỡ liên kết
            </Button>
          ) : googleConfigured ? (
            <div className="w-full sm:w-auto">
              <GoogleButton next="/ho-so" mode="link" label="Liên kết Google" />
            </div>
          ) : (
            <span className="text-xs text-slate-500">Chưa cấu hình trên máy chủ</span>
          )}
        </li>

        <li className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <LuKeyRound className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Email & mật khẩu</p>
              <p className="text-[13px] text-slate-500">{user.hasPassword ? "Đã đặt mật khẩu" : "Chưa có mật khẩu — tạo để đăng nhập khi không dùng Google"}</p>
            </div>
            {!pwOpen && (
              <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
                {user.hasPassword ? "Đổi mật khẩu" : "Tạo mật khẩu"}
              </Button>
            )}
          </div>

          {pwOpen && (
            <form onSubmit={submitPassword} className="mt-4 space-y-4 border-t border-slate-100 pt-4" noValidate>
              {user.hasPassword && (
                <div>
                  <Label htmlFor="pw-current">Mật khẩu hiện tại</Label>
                  <PasswordInput id="pw-current" autoComplete="current-password" value={form.current} onChange={(e) => set("current", e.target.value)} invalid={!!err("current")} />
                  <FieldError>{err("current")}</FieldError>
                </div>
              )}
              <div>
                <Label htmlFor="pw-new">Mật khẩu mới</Label>
                <PasswordInput id="pw-new" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} invalid={!!err("password")} />
                <PasswordStrength value={form.password} />
                <FieldError>{err("password")}</FieldError>
              </div>
              <div>
                <Label htmlFor="pw-confirm">Xác nhận mật khẩu</Label>
                <PasswordInput id="pw-confirm" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} invalid={!!err("confirm")} />
                <FieldError>{err("confirm") ?? (!pwError?.field ? pwError?.message : undefined)}</FieldError>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => (setPwOpen(false), setPwError(null))}>
                  Huỷ
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? "Đang lưu…" : user.hasPassword ? "Đổi mật khẩu" : "Tạo mật khẩu"}
                </Button>
              </div>
            </form>
          )}
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
        <p className="text-[13px] text-slate-600">Quên đăng xuất trên máy tính trường hoặc máy người khác?</p>
        <Button variant="outline" size="sm" onClick={signOutOthers} disabled={busy} className="bg-white">
          Đăng xuất khỏi thiết bị khác
        </Button>
      </div>
    </Card>
  );
}
