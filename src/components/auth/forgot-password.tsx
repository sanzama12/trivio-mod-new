"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCircleCheck, LuClock, LuMailCheck } from "react-icons/lu";
import { checkPassword } from "@/services/password.rules";
import { FieldError, Input, Label } from "@/components/ui/field";
import { PasswordChecklist, PasswordInput } from "./password-input";
import styles from "./forgot-password.module.css";

const STEPS = ["Xác minh email", "Mật khẩu mới", "Hoàn tất"];

function Stepper({ step }: { step: number }) {
  return <ol className={styles.stepper} aria-label="Các bước khôi phục">
    {STEPS.map((label, index) => <li key={label} className={styles.step}>
      <span aria-current={index === step ? "step" : undefined} className={`${styles.stepNumber} ${index < step ? styles.stepDone : index === step ? styles.stepActive : ""}`}>
        {index < step ? <LuCheck aria-label="Đã xong" /> : index + 1}
      </span>
      <span className={index === step ? styles.stepLabelActive : styles.stepLabel}>{label}</span>
    </li>)}
  </ol>;
}

export function ForgotPassword({ expired = false, initialToken }: { expired?: boolean; initialToken?: string }) {
  const [step, setStep] = useState<0 | 1 | 2>(initialToken ? 1 : 0);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState(initialToken ?? "");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(expired);
  const [adminRequired, setAdminRequired] = useState(false);
  const [resetLockUntil, setResetLockUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Email không hợp lệ.");
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) return setError(data.message ?? "Không gửi được yêu cầu, vui lòng thử lại.");
      setCode("");
      setSent(true);
    } catch { setError("Không thể kết nối, vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Nhập đủ mã xác nhận 6 số.");
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true || typeof data.token !== "string") return setError(data.message ?? "Mã không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.");
      setToken(data.token);
      setCode("");
      setStep(1);
    } catch { setError("Không thể kết nối, vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    if (!checkPassword(pw).every((item) => item.passed)) return setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
    if (pw !== confirm) return setError("Mật khẩu xác nhận không khớp.");
    setAdminRequired(false); setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
      const data = await res.json();
      if (res.ok && data.ok) {
        setError(null);
        setResetLockUntil(data.lockUntil ?? null);
        setStep(2);
      } else if (data.reason === "expired") setIsExpired(true);
      else if (data.reason === "locked") { setAdminRequired(true); setError("Tài khoản bị khóa sau 5 lần nhập sai. Chỉ quản trị viên mới có thể mở khóa."); }
      else setError(data.message ?? "Không đặt lại được mật khẩu, vui lòng thử lại.");
    } catch { setError("Không thể kết nối, vui lòng thử lại."); }
    finally { setLoading(false); }
  };

  if (isExpired) return <div className={styles.flow}>
    <Stepper step={0} />
    <div className={styles.state}>
      <span className={styles.stateIcon}><LuClock aria-hidden /></span>
      <span className={styles.kicker}>LIÊN KẾT KHÔNG CÒN HIỆU LỰC</span>
      <h1 className={styles.title}>Liên kết đã hết hạn</h1>
      <p className={styles.subtitle}>Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu mã xác nhận mới để tiếp tục.</p>
      <button type="button" className={styles.primary} onClick={() => { setStep(0); setToken(""); setIsExpired(false); setError(null); }}>
        Yêu cầu mã mới <LuArrowRight aria-hidden />
      </button>
      <Link href="/dang-nhap" className={styles.back}><LuArrowLeft aria-hidden /> Quay lại đăng nhập</Link>
    </div>
  </div>;

  return <div className={styles.flow}>
    <Stepper step={step} />
    {step === 0 && !sent && <form onSubmit={(event) => { event.preventDefault(); void requestCode(); }} noValidate className={styles.form}>
      <span className={styles.kicker}>LẤY LẠI TÀI KHOẢN</span>
      <h1 className={styles.title}>Khôi phục mật khẩu</h1>
      <p className={styles.subtitle}>Nhập email đã đăng ký để nhận mã xác nhận 6 số.</p>
      <div className={styles.field}>
        <Label htmlFor="fp-email">Email đã đăng ký</Label>
        <Input id="fp-email" type="email" autoComplete="email" placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} invalid={!!error} aria-describedby="fp-err" className={styles.input} />
        <FieldError id="fp-err">{error}</FieldError>
      </div>
      <button type="submit" disabled={loading} className={styles.primary}>{loading ? "Đang gửi mã…" : "Gửi mã xác nhận"} <LuArrowRight aria-hidden /></button>
      <Link href="/dang-nhap" className={styles.back}><LuArrowLeft aria-hidden /> Quay lại đăng nhập</Link>
    </form>}

    {step === 0 && sent && <form onSubmit={verifyCode} noValidate className={styles.form}>
      <span className={styles.stateIcon}><LuMailCheck aria-hidden /></span>
      <span className={styles.kicker}>XÁC MINH EMAIL</span>
      <h1 className={styles.title}>Nhập mã xác nhận</h1>
      <p className={styles.subtitle}>Nếu <strong>{email}</strong> đã đăng ký, mã 6 số sẽ được gửi tới hộp thư. Mã có hiệu lực 10 phút và dùng một lần.</p>
      <div className={styles.field}>
        <Label htmlFor="fp-code">Mã xác nhận</Label>
        <Input id="fp-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} invalid={!!error} aria-describedby="fp-code-err" className={styles.input} />
        <FieldError id="fp-code-err">{error}</FieldError>
      </div>
      <button type="submit" disabled={loading || code.length !== 6} className={styles.primary}>{loading ? "Đang xác minh…" : "Xác minh mã"} <LuArrowRight aria-hidden /></button>
      <p className={styles.info}>Chưa thấy email? Kiểm tra thư mục Spam. Nếu vừa yêu cầu gửi lại, mã trước vẫn còn hiệu lực.</p>
      <div className={styles.secondaryActions}>
        <button type="button" disabled={loading} onClick={() => void requestCode()} className={styles.textButton}>Gửi lại mã</button>
        <button type="button" disabled={loading} onClick={() => { setSent(false); setCode(""); setError(null); }} className={styles.textButton}>Đổi email</button>
      </div>
    </form>}

    {step === 1 && <form onSubmit={reset} noValidate className={styles.form}>
      <span className={styles.kicker}>BẢO VỆ TÀI KHOẢN</span>
      <h1 className={styles.title}>Đặt mật khẩu mới</h1>
      <p className={styles.subtitle}>Chọn mật khẩu mới để hoàn tất khôi phục tài khoản.</p>
      <div className={styles.passwordFields}>
        <div className={styles.field}>
          <Label htmlFor="fp-pw">Mật khẩu mới</Label>
          <PasswordInput id="fp-pw" autoComplete="new-password" value={pw} onChange={(event) => setPw(event.target.value)} className={styles.input} />
          <PasswordChecklist value={pw} />
        </div>
        <div className={styles.field}>
          <Label htmlFor="fp-confirm">Xác nhận mật khẩu</Label>
          <PasswordInput id="fp-confirm" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} invalid={!!error} aria-describedby="fp-pw-err" className={styles.input} />
          <FieldError id="fp-pw-err">{error}</FieldError>
        </div>
      </div>
      <button type="submit" disabled={loading} className={styles.primary}>{loading ? "Đang đặt lại…" : "Đặt lại mật khẩu"} <LuArrowRight aria-hidden /></button>
      {adminRequired && <Link href="/lien-he" className={styles.back}>Liên hệ quản trị viên <LuArrowRight aria-hidden /></Link>}
    </form>}

    {step === 2 && <div className={styles.state}>
      <span className={styles.stateIcon}><LuCircleCheck aria-hidden /></span>
      <span className={styles.kicker}>KHÔI PHỤC HOÀN TẤT</span>
      <h1 className={styles.title}>Mật khẩu đã được đặt lại</h1>
      <p className={styles.subtitle}>{resetLockUntil
        ? `Mật khẩu đã được đổi. Tài khoản vẫn bị khóa đến ${new Date(resetLockUntil).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })}; sau thời điểm đó bạn có thể đăng nhập bằng mật khẩu mới.`
        : "Bạn có thể đăng nhập ngay bằng mật khẩu mới."}</p>
      <Link href="/dang-nhap" className={styles.primary}>Đăng nhập ngay <LuArrowRight aria-hidden /></Link>
    </div>}
  </div>;
}
