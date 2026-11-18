"use client";

import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LuArrowLeft, LuArrowRight, LuSparkles } from "react-icons/lu";
import { LogoMark } from "@/components/layout/logo";
import { Input, Label, FieldError, Checkbox } from "@/components/ui/field";
import { emailError } from "@/lib/email-validation";
import { checkPassword } from "@/services/password.rules";
import { GoogleButton } from "./google-button";
import { PasswordInput, PasswordStrength } from "./password-input";
import { oauthErrorMessage } from "./oauth-errors";
import { StudentMascot } from "./student-mascot";
import styles from "./auth-experience.module.css";

type Field = "name" | "email" | "password" | "confirm" | "terms";
export function AuthExperience({ next, error, demoAccount, initialMode = "login", registered = false }: { next: string; error?: string; demoAccount?: { email: string; password: string } | null; initialMode?: "login" | "register"; registered?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState(oauthErrorMessage(error) ?? "");
  const [showRegistered, setShowRegistered] = useState(registered);
  const [locked, setLocked] = useState<"temporary" | "permanent" | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [focus, setFocus] = useState("");
  const register = mode === "register";
  useEffect(() => {
    if (!registered) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("registered") !== "1") return;
    url.searchParams.delete("registered");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [registered]);
  function change(field: Field, value: string | boolean) {
    setForm((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setMessage("");
  }
  function switchMode(value: "login" | "register") {
    setMode(value); setErrors({}); setMessage(""); setLocked(null); setFocus("");
    setShowRegistered(false);
    setForm((old) => ({ ...old, password: "", confirm: "", terms: false }));
    const url = new URL(window.location.href);
    if (value === "register") url.searchParams.set("mode", "register"); else url.searchParams.delete("mode");
    url.searchParams.delete("error");
    url.searchParams.delete("registered");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }
  const fieldProps = (field: Field) => ({ id: `auth-${field}`, invalid: !!errors[field], "aria-describedby": errors[field] ? `auth-${field}-error` : undefined });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const problems: Partial<Record<Field, string>> = {};
    const emailProblem = emailError(form.email);
    if (emailProblem) problems.email = emailProblem;
    if (!form.password) problems.password = "Vui lòng nhập mật khẩu.";
    if (register) {
      if (form.name.trim().length === 1 || form.name.trim().length > 60) problems.name = "Tên gọi cần từ 2 đến 60 ký tự, hoặc để trống.";
      if (!checkPassword(form.password).every((item) => item.passed)) problems.password = "Cần ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số.";
      if (form.confirm !== form.password || !form.confirm) problems.confirm = "Mật khẩu xác nhận không khớp.";
      if (!form.terms) problems.terms = "Bạn cần đồng ý với Điều khoản sử dụng.";
    }
    setErrors(problems); setMessage(""); setLocked(null);
    const first = Object.keys(problems)[0];
    if (first) { document.getElementById(`auth-${first}`)?.focus(); return; }
    setShowRegistered(false);
    submitting.current = true; setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }) });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (register) {
          router.replace(`/dang-nhap?registered=1&next=${encodeURIComponent(next)}`);
          return;
        }
        router.push(data.user.onboarded ? next : `/chao-mung?next=${encodeURIComponent(next)}`);
        router.refresh(); return;
      }
      if (response.status === 429 || response.status >= 500) { setMessage(data.message ?? "Hệ thống đang bận. Vui lòng thử lại sau."); return; }
      if (register || data.field) {
        const field: Field = ["name", "email", "password", "confirm", "terms"].includes(data.field) ? data.field : "email";
        setErrors({ [field]: data.message ?? "Không thể tạo tài khoản. Vui lòng thử lại." });
        document.getElementById(`auth-${field}`)?.focus(); return;
      }
      if (data.reason === "locked") {
        if (data.permanent) {
          setLocked("permanent");
          setMessage("Tài khoản đã bị khóa sau 5 lần nhập sai mật khẩu. Chỉ quản trị viên mới có thể mở khóa.");
        } else {
          setLocked("temporary");
          const until = data.lockUntil ? new Date(data.lockUntil).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : null;
          setMessage(`Tài khoản bị khóa 30 phút do nhập sai mật khẩu.${until ? ` Có thể thử lại sau ${until}.` : ""} Sau tổng cộng 5 lần sai, bạn cần liên hệ quản trị viên để mở khóa.`);
        }
        return;
      }
      if (data.reason === "google_only") { setMessage("Email này đã liên kết với Google. Hãy tiếp tục với Google hoặc dùng Quên mật khẩu để tạo mật khẩu."); return; }
      setMessage(`Email hoặc mật khẩu không đúng.${data.attemptsLeft > 0 ? ` Còn ${data.attemptsLeft} lần thử trước khi khóa 30 phút.` : " Vui lòng thử lại sau."} Sau 5 lần sai, tài khoản cần quản trị viên mở khóa.`);
    } catch { setMessage("Không thể kết nối. Hãy kiểm tra mạng và thử lại nhé."); }
    finally { submitting.current = false; setLoading(false); }
  }

  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.back}><LuArrowLeft aria-hidden /> Về trang chủ</Link></header>
    <div className={styles.card}>
      <section className={styles.story} aria-label="Tài khoản Trovio">
        <span className={styles.eyebrow}><LuSparkles aria-hidden /> HỒ SƠ CỦA BẠN</span>
        <h2>Lưu hồ sơ.<br /><em>Theo dõi nguyện vọng.</em></h2>
        <StudentMascot covered={focus === "password" || focus === "confirm"} looking={focus === "email"} progress={form.email.length} />
        <p className={styles.storyFoot}>Lưu điểm và nguyện vọng trong tài khoản của bạn.</p>
      </section>
      <section className={styles.formSide} aria-label="Tài khoản Trovio">
        <div className={styles.formBrand}><LogoMark className="size-9" /><span>Trovio</span></div>
        <div className={styles.switcher} aria-label="Chọn đăng nhập hoặc đăng ký">
          <button type="button" aria-pressed={!register} disabled={loading} onClick={() => switchMode("login")}>Đăng nhập</button>
          <button type="button" aria-pressed={register} disabled={loading} onClick={() => switchMode("register")}>Đăng ký</button>
        </div>
        <div className={styles.formHeading}><span className={styles.kicker}>{register ? "TÀI KHOẢN TROVIO" : "CHÀO MỪNG TRỞ LẠI"}</span><h1>{register ? "Tạo tài khoản" : "Đăng nhập"}</h1><p>{register ? "Lưu điểm, chương trình quan tâm và nguyện vọng." : "Tiếp tục xem hồ sơ và nguyện vọng đã lưu."}</p></div>
        {showRegistered && !register && <div className={styles.success} role="status"><strong>Đăng ký thành công.</strong> Tài khoản của bạn đã được tạo. Đăng nhập để tiếp tục; bạn có thể xác thực email trong Hồ sơ.</div>}
        {message && <div className={styles.alert} role="alert">{message}{locked === "permanent" && <p><Link href="/lien-he">Liên hệ quản trị viên</Link></p>}</div>}
        <form noValidate onSubmit={submit} className={styles.form} aria-busy={loading}>
          <fieldset disabled={loading} className={styles.fields}>
            {register && <div><Label htmlFor="auth-name">Tên gọi <span className={styles.optional}>(không bắt buộc)</span></Label><Input {...fieldProps("name")} autoComplete="nickname" placeholder="Tụi mình gọi bạn là gì?" maxLength={60} value={form.name} onChange={(e) => change("name", e.target.value)} /><FieldError id="auth-name-error">{errors.name}</FieldError></div>}
            <div><Label htmlFor="auth-email">Email của bạn</Label><Input {...fieldProps("email")} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ban@example.com" maxLength={200} value={form.email} onFocus={() => setFocus("email")} onBlur={() => { setFocus(""); setErrors((old) => ({ ...old, email: emailError(form.email) })); }} onChange={(e) => change("email", e.target.value)} /><FieldError id="auth-email-error">{errors.email}{register && errors.email === "Email này đã được đăng ký." && <> <button type="button" className={styles.textButton} onClick={() => switchMode("login")}>Đăng nhập ngay</button></>}</FieldError></div>
            <div><div className={styles.labelRow}><Label htmlFor="auth-password">{register ? "Tạo mật khẩu" : "Mật khẩu"}</Label>{!register && <Link href="/quen-mat-khau">Quên mật khẩu?</Link>}</div><div onFocus={() => setFocus("password")} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(""); }}><PasswordInput {...fieldProps("password")} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "Ít nhất 8 ký tự, 1 chữ hoa, 1 số" : "Nhập mật khẩu của bạn"} maxLength={200} value={form.password} onChange={(e) => change("password", e.target.value)} /></div><FieldError id="auth-password-error">{errors.password}</FieldError>{register && <PasswordStrength value={form.password} />}</div>
            {register && <><div><Label htmlFor="auth-confirm">Nhập lại mật khẩu</Label><div onFocus={() => setFocus("confirm")} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(""); }}><PasswordInput {...fieldProps("confirm")} autoComplete="new-password" placeholder="Nhập lại mật khẩu vừa tạo" maxLength={200} value={form.confirm} onChange={(e) => change("confirm", e.target.value)} /></div><FieldError id="auth-confirm-error">{errors.confirm}</FieldError></div><div><Checkbox id="auth-terms" checked={form.terms} aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "auth-terms-error" : undefined} onChange={(e) => change("terms", e.target.checked)} label={<>Tôi đồng ý với <Link href="/dieu-khoan">Điều khoản sử dụng</Link> và <Link href="/chinh-sach-rieng-tu">Chính sách riêng tư</Link>.</>} /><FieldError id="auth-terms-error">{errors.terms}</FieldError></div></>}
            <button type="submit" className={buttonClass({ full: true })} disabled={loading}>{loading ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}<LuArrowRight aria-hidden /></button>
          </fieldset>
        </form>
        <div className={styles.divider}><span />hoặc<span /></div>
        <div className={styles.social}><GoogleButton next={next} onError={setMessage} disabled={loading} /></div>
        <p className={styles.switchHint}>{register ? "Đã có tài khoản?" : "Bạn mới đến Trovio?"} <button type="button" disabled={loading} onClick={() => switchMode(register ? "login" : "register")}>{register ? "Đăng nhập" : "Đăng ký miễn phí"}</button></p>
        {demoAccount && !register && <div className={styles.demo}>
          <strong>Tài khoản học sinh dùng thử</strong>
          <dl>
            <div><dt>Email</dt><dd>{demoAccount.email}</dd></div>
            <div><dt>Mật khẩu</dt><dd>{demoAccount.password}</dd></div>
          </dl>
          <button type="button" onClick={() => { setForm((current) => ({ ...current, email: demoAccount.email, password: demoAccount.password })); setErrors({}); setMessage(""); }}>Điền tài khoản demo</button>
        </div>}
      </section>
    </div>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} Trovio</span><Link href="/tro-giup">Cần trợ giúp?</Link></footer>
  </div>;
}
