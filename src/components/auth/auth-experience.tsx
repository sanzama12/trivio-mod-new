"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuShieldCheck, LuSparkles } from "react-icons/lu";
import { Logo } from "@/components/layout/logo";
import { Input, Label, FieldError, Checkbox } from "@/components/ui/field";
import { emailError } from "@/lib/email-validation";
import { checkPassword } from "@/services/password.rules";
import { GoogleButton } from "./google-button";
import { PasswordInput, PasswordStrength } from "./password-input";
import { oauthErrorMessage } from "./oauth-errors";
import { StudentMascot } from "./student-mascot";
import styles from "./auth-experience.module.css";

type Field = "name" | "email" | "password" | "confirm" | "terms";
export function AuthExperience({ next, error, demo, initialMode = "login" }: { next: string; error?: string; demo: boolean; initialMode?: "login" | "register" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState(oauthErrorMessage(error) ?? "");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [focus, setFocus] = useState("");
  const register = mode === "register";
  function change(field: Field, value: string | boolean) {
    setForm((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setMessage("");
  }
  function switchMode(value: "login" | "register") {
    setMode(value); setErrors({}); setMessage(""); setLocked(false); setFocus("");
    setForm((old) => ({ ...old, password: "", confirm: "", terms: false }));
    const url = new URL(window.location.href);
    if (value === "register") url.searchParams.set("mode", "register"); else url.searchParams.delete("mode");
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url.pathname + url.search);
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
    setErrors(problems); setMessage(""); setLocked(false);
    const first = Object.keys(problems)[0];
    if (first) { document.getElementById(`auth-${first}`)?.focus(); return; }
    submitting.current = true; setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }) });
      const data = await response.json();
      if (response.ok && data.ok) {
        router.push(data.user.onboarded ? next : `/chao-mung?next=${encodeURIComponent(next)}`);
        router.refresh(); return;
      }
      if (response.status === 429 || response.status >= 500) { setMessage(data.message ?? "Hệ thống đang bận. Vui lòng thử lại sau."); return; }
      if (register || data.field) {
        const field: Field = ["name", "email", "password", "confirm", "terms"].includes(data.field) ? data.field : "email";
        setErrors({ [field]: data.message ?? "Không thể tạo tài khoản. Vui lòng thử lại." });
        document.getElementById(`auth-${field}`)?.focus(); return;
      }
      if (data.reason === "locked") { setLocked(true); setMessage("Tài khoản đang bị khóa. Bạn có thể khôi phục mật khẩu hoặc liên hệ hỗ trợ."); return; }
      if (data.reason === "google_only") { setMessage("Email này đã liên kết với Google. Hãy tiếp tục với Google hoặc dùng Quên mật khẩu để tạo mật khẩu."); return; }
      setMessage(`Email hoặc mật khẩu không đúng.${data.attemptsLeft <= 3 ? ` Bạn còn ${data.attemptsLeft} lần thử trước khi tài khoản tạm khóa.` : " Vui lòng kiểm tra lại."}`);
    } catch { setMessage("Không thể kết nối. Hãy kiểm tra mạng và thử lại nhé."); }
    finally { submitting.current = false; setLoading(false); }
  }

  return <div className={styles.page}>
    <header className={styles.header}><Logo /><Link href="/" className={styles.back}><LuArrowLeft aria-hidden /> Về trang chủ</Link></header>
    <div className={styles.card}>
      <section className={styles.story} aria-label="Cùng Trovio định hướng tương lai">
        <span className={styles.eyebrow}><LuSparkles aria-hidden /> MỖI LỰA CHỌN, MỘT TƯƠNG LAI</span>
        <h2>Hành trình lớn.<br />Bắt đầu từ <em>bạn.</em></h2>
        <p>Hiểu mình hơn, chọn đúng ngành.<br />Trovio cùng bạn đi bước đầu tiên.</p>
        <StudentMascot covered={focus === "password" || focus === "confirm"} looking={focus === "email"} progress={form.email.length} />
        <div className={styles.benefits}><span><LuCheck /> Khám phá bản thân</span><span><LuCheck /> Tìm trường phù hợp</span><span><LuCheck /> Lưu nguyện vọng</span></div>
      </section>
      <section className={styles.formSide} aria-label="Tài khoản Trovio">
        <div className={styles.switcher} aria-label="Chọn đăng nhập hoặc đăng ký">
          <button type="button" aria-pressed={!register} disabled={loading} onClick={() => switchMode("login")}>Đăng nhập</button>
          <button type="button" aria-pressed={register} disabled={loading} onClick={() => switchMode("register")}>Đăng ký</button>
        </div>
        <div className={styles.formHeading}><span className={styles.kicker}>{register ? "MỘT KHỞI ĐẦU MỚI" : "RẤT VUI ĐƯỢC GẶP LẠI BẠN"}</span><h1>{register ? "Tương lai đang chờ bạn." : "Chào bạn trở lại!"}</h1><p>{register ? "Tạo tài khoản miễn phí, khám phá lối đi của riêng mình." : "Đăng nhập để tiếp tục hành trình của riêng mình."}</p></div>
        <GoogleButton next={next} />
        <div className={styles.divider}><span />hoặc sử dụng email<span /></div>
        {message && <div className={styles.alert} role="alert">{message}{locked && <p><Link href="/quen-mat-khau">Khôi phục mật khẩu</Link> · <Link href="/tro-giup#lien-he">Liên hệ hỗ trợ</Link></p>}</div>}
        <form noValidate onSubmit={submit} className={styles.form} aria-busy={loading}>
          <fieldset disabled={loading} className={styles.fields}>
            {register && <div><Label htmlFor="auth-name">Tên gọi <span className={styles.optional}>(không bắt buộc)</span></Label><Input {...fieldProps("name")} autoComplete="nickname" placeholder="Tụi mình gọi bạn là gì?" maxLength={60} value={form.name} onChange={(e) => change("name", e.target.value)} /><FieldError id="auth-name-error">{errors.name}</FieldError></div>}
            <div><Label htmlFor="auth-email">Email của bạn</Label><Input {...fieldProps("email")} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="ban@example.com" maxLength={200} value={form.email} onFocus={() => setFocus("email")} onBlur={() => { setFocus(""); setErrors((old) => ({ ...old, email: emailError(form.email) })); }} onChange={(e) => change("email", e.target.value)} /><FieldError id="auth-email-error">{errors.email}{register && errors.email === "Email này đã được đăng ký." && <> <button type="button" className={styles.textButton} onClick={() => switchMode("login")}>Đăng nhập ngay</button></>}</FieldError></div>
            <div><div className={styles.labelRow}><Label htmlFor="auth-password">{register ? "Tạo mật khẩu" : "Mật khẩu"}</Label>{!register && <Link href="/quen-mat-khau">Quên mật khẩu?</Link>}</div><div onFocus={() => setFocus("password")} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(""); }}><PasswordInput {...fieldProps("password")} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "Ít nhất 8 ký tự, 1 chữ hoa, 1 số" : "Nhập mật khẩu của bạn"} maxLength={200} value={form.password} onChange={(e) => change("password", e.target.value)} /></div><FieldError id="auth-password-error">{errors.password}</FieldError>{register && <PasswordStrength value={form.password} />}</div>
            {register && <><div><Label htmlFor="auth-confirm">Nhập lại mật khẩu</Label><div onFocus={() => setFocus("confirm")} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(""); }}><PasswordInput {...fieldProps("confirm")} autoComplete="new-password" placeholder="Nhập lại mật khẩu vừa tạo" maxLength={200} value={form.confirm} onChange={(e) => change("confirm", e.target.value)} /></div><FieldError id="auth-confirm-error">{errors.confirm}</FieldError></div><div><Checkbox id="auth-terms" checked={form.terms} aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "auth-terms-error" : undefined} onChange={(e) => change("terms", e.target.checked)} label={<>Tôi đồng ý với <Link href="/dieu-khoan">Điều khoản sử dụng</Link> và <Link href="/chinh-sach-rieng-tu">Chính sách riêng tư</Link>.</>} /><FieldError id="auth-terms-error">{errors.terms}</FieldError></div></>}
            <button type="submit" className={styles.submit} disabled={loading}>{loading ? "Đang xử lý…" : register ? "Bắt đầu hành trình" : "Đăng nhập"}<LuArrowRight aria-hidden /></button>
          </fieldset>
        </form>
        <p className={styles.switchHint}>{register ? "Đã có tài khoản?" : "Bạn mới đến Trovio?"} <button type="button" disabled={loading} onClick={() => switchMode(register ? "login" : "register")}>{register ? "Đăng nhập" : "Đăng ký miễn phí"}</button></p>
        <p className={styles.privacy}><LuShieldCheck aria-hidden /> Chỉ cần email. Không hỏi số điện thoại.</p>
        {demo && <details className={styles.demo}><summary>Dùng thử với tài khoản demo</summary><p>Mật khẩu: Trovio@2026<br />Học sinh: an@trovio.vn<br />Quản trị: admin@trovio.vn<br />Bị khóa: binh.locked@trovio.vn</p></details>}
      </section>
    </div>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} Trovio · Định hướng tương lai</span><Link href="/tro-giup">Cần một chút trợ giúp?</Link></footer>
  </div>;
}
