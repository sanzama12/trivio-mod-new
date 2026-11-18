"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuCheck,
  LuCopy,
  LuCreditCard,
  LuHeart,
  LuLockKeyhole,
  LuQrCode,
  LuCoins,
  LuRefreshCw,
} from "react-icons/lu";
import { Input, Label } from "@/components/ui/field";
import type { DonationPayment, DonationPaymentAvailability, DonationPaymentMethod } from "@/domain/donation";
import { DONATION_TIERS } from "./donation-tiers";
import { formatVndInput, parseVndInput } from "@/lib/vnd-amount";
import styles from "./donate-form.module.css";

const DonationSuccess = dynamic(() => import("./donation-success").then((module) => module.DonationSuccess), { ssr: false });

const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;
const METHODS = [
  { value: "qr", label: "QR ngân hàng", Icon: LuQrCode },
  { value: "vnpay", label: "VNPAY", Icon: LuCreditCard },
  { value: "usdt", label: "USDT", Icon: LuCoins },
] as const;
type DisplayMethod = (typeof METHODS)[number]["value"];
const DEMO_VND_PER_USDT = 25_000;

type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export function DonateForm({ availability, defaultDonorName = "", demoMethods = false }: { availability: DonationPaymentAvailability; defaultDonorName?: string; demoMethods?: boolean }) {
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<DisplayMethod>(() => availability.qr ? "qr" : availability.vnpay || demoMethods ? "vnpay" : "qr");
  const [demoPayment, setDemoPayment] = useState<{ method: "vnpay" | "usdt"; amount: number; reference: string } | null>(null);
  const [demoComplete, setDemoComplete] = useState(false);
  const demoPanelRef = useRef<HTMLElement>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<DonationPayment | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const checkStatusRef = useRef<() => Promise<void>>(async () => {});
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState<"account" | "reference" | null>(null);
  const [paymentDonor, setPaymentDonor] = useState({ donorName: "", message: "" });
  const [nextAmount, setNextAmount] = useState("");
  const selectedAmount = custom ? parseVndInput(customAmount) : amount;
  const isDemoChoice = demoMethods && (method === "usdt" || method === "vnpay");
  const enabled = method === "usdt" ? demoMethods : availability[method] || isDemoChoice;

  useEffect(() => {
    if (demoPayment) demoPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [demoPayment]);

  useEffect(() => {
    if (paymentStatus !== "success" || !payment) return;
    setConfirmedAt((previous) => previous ?? new Date().toISOString());
    setShowSuccess(true);
  }, [paymentStatus, payment]);

  useEffect(() => {
    if (!payment || paymentStatus !== "pending") return;
    const controller = new AbortController();
    let inFlight = false;
    async function checkStatus() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      setCheckingNow(true);
      try {
        const response = await fetch(`/api/donations/status/${payment!.txnRef}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error("Không kiểm tra được giao dịch.");
        if (["pending", "success", "failed", "cancelled"].includes(result.data?.status)) {
          setPaymentStatus(result.data.status);
          if (result.data.status === "success") setConfirmedAt(result.data.paidAt ?? new Date().toISOString());
        }
        setPollingError(result.data?.verificationUnavailable === true);
      } catch {
        if (!controller.signal.aborted) setPollingError(true);
      } finally {
        inFlight = false;
        setCheckingNow(false);
      }
    }
    checkStatusRef.current = checkStatus;
    void checkStatus();
    const timer = setInterval(() => void checkStatus(), 4000);
    const onVisible = () => { if (document.visibilityState === "visible") void checkStatus(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      checkStatusRef.current = async () => {};
    };
  }, [payment, paymentStatus]);

  async function createPayment(nextValue: number, nextMethod: DonationPaymentMethod, donor: { donorName: string; message: string }): Promise<boolean> {
    if (!availability[nextMethod] || loading) return false;
    setError("");
    if (!Number.isSafeInteger(nextValue) || nextValue < 10000 || nextValue > 100000000) {
      setError("Nhập số tiền từ 10.000 đến 100.000.000 ₫.");
      return false;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: nextValue,
          method: nextMethod,
          bankCode: nextMethod === "vnpay" ? "VNPAYQR" : undefined,
          donorName: donor.donorName,
          message: donor.message,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.data?.qrImageUrl) {
        throw new Error(result.message || "Chưa tạo được mã thanh toán. Vui lòng thử lại.");
      }
      setPaymentStatus("pending");
      setShowSuccess(false);
      setConfirmedAt(null);
      setQrFailed(false);
      setPollingError(false);
      setCopied(null);
      setPayment(result.data);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Kết nối bị gián đoạn. Vui lòng thử lại.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || loading) return;
    if (isDemoChoice) {
      if (!Number.isSafeInteger(selectedAmount) || selectedAmount < 10000 || selectedAmount > 100000000) {
        setError("Nhập số tiền từ 10.000 đến 100.000.000 ₫.");
        return;
      }
      setError("");
      setDemoComplete(false);
      const id = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
      setDemoPayment({ method: method as "vnpay" | "usdt", amount: selectedAmount, reference: `DEMO-${id.toUpperCase()}` });
      return;
    }
    const fields = new FormData(event.currentTarget);
    const donor = {
      donorName: anonymous ? "" : String(fields.get("donorName") ?? ""),
      message: String(fields.get("message") ?? ""),
    };
    if (await createPayment(selectedAmount, method as DonationPaymentMethod, donor)) setPaymentDonor(donor);
  }

  async function changeQrAmount(value: number) {
    if (!payment || loading) return;
    if (value === payment.amount) { setNextAmount(""); return; }
    if (await createPayment(value, payment.method, paymentDonor)) {
      setCustom(!DONATION_TIERS.some((tier) => tier.value === value));
      setAmount(value);
      setCustomAmount(formatVndInput(String(value)));
      setNextAmount("");
    }
  }

  async function copy(value: string, field: "account" | "reference") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
    } catch {
      setError("Không thể sao chép tự động. Bạn có thể chọn và sao chép thông tin bên dưới.");
    }
  }

  return (
    <div id="dong-gop" className={styles.form}>
      <header className={styles.heading}>
        <span className={styles.headingIcon}><LuHeart aria-hidden /></span>
        <div>
          <span className={styles.headingLabel}>ĐÓNG GÓP TỰ NGUYỆN</span>
          <h2 id="donate-form-title">{demoPayment ? "Mô phỏng thanh toán" : payment ? "Thông tin thanh toán" : "Tạo khoản ủng hộ"}</h2>
          <p>{demoPayment ? `${METHODS.find(item => item.value === demoPayment.method)?.label} · DEMO` : payment ? `Đóng góp ${money(payment.amount)} qua ${METHODS.find(item => item.value === payment.method)?.label}` : "Chọn mức đóng góp phù hợp với bạn."}</p>
        </div>
      </header>

      <form onSubmit={submit} aria-labelledby="donate-form-title" hidden={!!payment || !!demoPayment}>
        <fieldset disabled={loading} className={styles.controls}>
          <fieldset className={styles.step}>
            <legend><span>01</span> Chọn số tiền</legend>
            <div className={styles.amounts}>
              {DONATION_TIERS.map(tier => (
                <button key={tier.value} type="button" aria-pressed={!custom && amount === tier.value}
                  onClick={() => { setCustom(false); setAmount(tier.value); setError(""); }}>
                  <strong>{money(tier.value)}</strong>
                  <small>{tier.desc}</small>
                </button>
              ))}
              <button type="button" aria-pressed={custom} className={styles.customToggle}
                onClick={() => { setCustom(true); setError(""); }}>
                <strong>Số tiền khác</strong>
                <small>Từ 10.000 ₫</small>
              </button>
            </div>
            {custom && (
              <div className={styles.customAmount}>
                <Label htmlFor="donate-amount">Số tiền bạn muốn đóng góp</Label>
                <div className={styles.amountInput}>
                  <Input id="donate-amount" type="text"
                    required autoFocus inputMode="numeric" value={customAmount}
                    aria-describedby="donate-amount-hint" aria-invalid={!!error || undefined}
                    onChange={event => { setCustomAmount(formatVndInput(event.target.value)); setError(""); }}
                    placeholder="Ví dụ: 150.000" />
                  <span>VNĐ</span>
                </div>
                <p id="donate-amount-hint" className={styles.hint}>Tối đa 100.000.000 ₫ mỗi lần.</p>
              </div>
            )}
          </fieldset>

          <fieldset className={styles.step}>
            <legend><span>02</span> Phương thức thanh toán</legend>
            <div className={styles.methods}>
              {METHODS.map(({ value, label, Icon }) => {
                const available = value === "usdt" ? demoMethods : value === "vnpay" ? availability.vnpay || demoMethods : availability.qr;
                const demo = value === "usdt" || value === "vnpay" && demoMethods;
                return (
                <label key={value} className={styles.method}>
                  <input type="radio" name="paymentMethod" value={value} checked={method === value}
                    disabled={!available} onChange={() => { setMethod(value); setError(""); }} />
                  <span><Icon aria-hidden /><strong>{label}</strong>{!available ? <small>Chưa khả dụng</small> : demo && demoMethods ? <small>Demo</small> : null}</span>
                </label>
              );})}
            </div>
            {isDemoChoice && <p className={styles.demoNotice}>Chế độ mô phỏng: không chuyển tiền, không ghi nhận khoản ủng hộ thật.</p>}
          </fieldset>

          <fieldset className={styles.step}>
            <legend><span>03</span> Thông tin hiển thị <small>(tùy chọn)</small></legend>
            <div className={styles.nameHeading}>
              <Label htmlFor="donor-name">Tên người ủng hộ</Label>
              <label className={styles.anonymous}>
                <input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} />
                Ủng hộ ẩn danh
              </label>
            </div>
            <Input id="donor-name" name="donorName" disabled={anonymous} defaultValue={defaultDonorName} maxLength={80} autoComplete="name"
              placeholder={anonymous ? "Người ủng hộ ẩn danh" : "Tên của bạn"} />
            {!anonymous && <p className={styles.hint}>Tên trên danh sách công khai sẽ được che một phần.</p>}
            <div className={styles.messageField}>
              <Label htmlFor="donor-message">Lời nhắn <span className={styles.hint}>(không hiển thị công khai)</span></Label>
              <textarea id="donor-message" name="message" maxLength={500} rows={2}
                placeholder="Một lời nhắn gửi đến Trovio..." />
            </div>
          </fieldset>

          <div className={styles.actions}>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {!enabled && <p role="status" className={styles.notice}>Chưa có phương thức nhận tiền khả dụng. Bạn có thể <Link href="/lien-he">liên hệ Trovio</Link> để được hỗ trợ.</p>}
            <div className={styles.total}><span>Tổng đóng góp</span><strong>{custom && !customAmount ? "Chưa nhập" : Number.isFinite(selectedAmount) ? money(selectedAmount) : "Số tiền không hợp lệ"}</strong></div>
            <button type="submit" disabled={!enabled || loading} className={styles.submit} aria-busy={loading}>
              <span>{loading ? "Đang tạo mã..." : isDemoChoice ? "Xem mô phỏng thanh toán" : "Tạo mã thanh toán"}</span>
              <LuArrowRight aria-hidden />
            </button>
          </div>
        </fieldset>
      </form>

      {demoPayment && <section ref={demoPanelRef} className={styles.demoPanel} aria-label="Mô phỏng thanh toán" aria-live="polite">
        <span className={styles.demoBadge}>DEMO · KHÔNG CHUYỂN TIỀN</span>
        <h3>{demoComplete ? "Mô phỏng hoàn tất" : demoPayment.method === "vnpay" ? "Thanh toán VNPAY mô phỏng" : "Chuyển USDT mô phỏng"}</h3>
        <p>{demoComplete ? "Đây chỉ là bản xem thử. Không có giao dịch hay khoản ủng hộ nào được ghi nhận." : "Kiểm tra thông tin hiển thị trước khi hoàn tất mô phỏng."}</p>
        <dl>
          <div><dt>Mệnh giá chọn</dt><dd>{money(demoPayment.amount)}</dd></div>
          {demoPayment.method === "usdt" && <div><dt>Số USDT minh họa</dt><dd>{(demoPayment.amount / DEMO_VND_PER_USDT).toLocaleString("vi-VN", { maximumFractionDigits: 4 })} USDT</dd></div>}
          {demoPayment.method === "usdt" && <div><dt>Tỷ giá giả lập</dt><dd>1 USDT = 25.000 ₫</dd></div>}
          <div><dt>Mã mô phỏng</dt><dd>{demoPayment.reference}</dd></div>
        </dl>
        {demoPayment.method === "usdt" && <p className={styles.demoNotice}>Không có địa chỉ ví hoặc mạng chuyển trong bản demo. Không gửi USDT theo màn hình này.</p>}
        {!demoComplete && <button type="button" className={styles.submit} onClick={() => setDemoComplete(true)}>Hoàn tất mô phỏng <LuArrowRight aria-hidden /></button>}
        <button type="button" className={styles.changePayment} onClick={() => { setDemoPayment(null); setDemoComplete(false); }}>Chọn phương thức khác</button>
      </section>}

      {payment && (
        <section className={styles.payment} aria-label="Thông tin thanh toán" aria-live="polite">
          <div className={styles.paymentState} data-status={paymentStatus}>
            <span className={styles.stateDot} />
            {paymentStatus === "pending" ? "Đang chờ thanh toán" : paymentStatus === "success" ? "Đã xác nhận" : "Chưa hoàn tất"}
          </div>
          {paymentStatus === "success" ? (
            <div className={styles.success} role="status"><LuCheck aria-hidden />Đã nhận {money(payment.amount)}. Cảm ơn bạn đã đồng hành! <button type="button" onClick={() => setShowSuccess(true)}>Xem xác nhận</button></div>
          ) : paymentStatus === "pending" ? (
            <>
              {(payment.method === "qr" || payment.method === "sepay") && <div className={styles.paymentAmounts}>
                <p>Chọn mệnh giá để cập nhật mã QR</p>
                <div>
                  {DONATION_TIERS.map((tier) => <button key={tier.value} type="button" disabled={loading || payment.amount === tier.value} aria-pressed={payment.amount === tier.value}
                    onClick={() => void changeQrAmount(tier.value)}>{money(tier.value)}</button>)}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void changeQrAmount(parseVndInput(nextAmount)); }} className={styles.paymentCustom}>
                  <label htmlFor="qr-next-amount">Số tiền khác</label>
                  <input id="qr-next-amount" type="text" inputMode="numeric" value={nextAmount}
                    onChange={(event) => setNextAmount(formatVndInput(event.target.value))} placeholder="Nhập số tiền" />
                  <button type="submit" disabled={loading || !nextAmount}>Đổi QR</button>
                </form>
              </div>}
              {loading ? (
                <p className={styles.qrHelp} role="status">Đang tạo mã QR theo số tiền mới…</p>
              ) : qrFailed ? (
                <p className={styles.error}>Chưa tải được ảnh QR. Bạn có thể dùng thông tin chuyển khoản bên dưới.</p>
              ) : (
                <div className={styles.qrFrame}>
                  <img src={payment.qrImageUrl} alt={`Mã thanh toán ${money(payment.amount)}`}
                    width={280} height={280} onError={() => setQrFailed(true)} />
                </div>
              )}
              <p className={styles.qrHelp}>
                {payment.method === "vnpay"
                  ? "Quét mã để mở VNPAY, hoặc tiếp tục trên thiết bị này."
                  : "Quét mã bằng ứng dụng ngân hàng và kiểm tra số tiền, tài khoản nhận và mã giao dịch trong nội dung trước khi chuyển."}
              </p>
              {!loading && payment.accountNumber && (
                <dl className={styles.bankDetails}>
                  <div><dt>Ngân hàng</dt><dd>{payment.bankName}</dd></div>
                  <div><dt>Chủ tài khoản</dt><dd>{payment.accountName}</dd></div>
                  <div>
                    <dt>Số tài khoản</dt>
                    <dd>{payment.accountNumber}<button type="button" title="Sao chép số tài khoản"
                      aria-label="Sao chép số tài khoản" onClick={() => copy(payment.accountNumber!, "account")}>
                      {copied === "account" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                    </button></dd>
                  </div>
                  <div><dt>Số tiền</dt><dd>{money(payment.amount)}</dd></div>
                  <div className={styles.transferReference}>
                    <dt>Nội dung chuyển khoản</dt>
                    <dd>{payment.transferContent}<button type="button" title="Sao chép nội dung chuyển khoản"
                      aria-label="Sao chép nội dung chuyển khoản" onClick={() => copy(payment.transferContent!, "reference")}>
                      {copied === "reference" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                    </button></dd>
                  </div>
                </dl>
              )}
              {error && <p role="alert" className={styles.error}>{error}</p>}
              {payment.paymentUrl && <a className={styles.submit} href={payment.paymentUrl}
                target="_blank" rel="noopener noreferrer">Mở VNPAY để thanh toán <LuArrowUpRight aria-hidden /></a>}
              <div className={styles.pollingStatus}>
                <p className={styles.hint} role="status">
                  {pollingError
                    ? "Đang chờ đối soát từ ngân hàng (có thể trễ 1–2 phút). Hệ thống vẫn đang tự động kiểm tra."
                    : payment.method === "qr"
                      ? "Đang tự động kiểm tra tài khoản mỗi 4 giây..."
                      : "Trạng thái sẽ tự động cập nhật sau khi thanh toán."}
                </p>
                {payment.method === "qr" && (
                  <button
                    type="button"
                    className={styles.checkNow}
                    disabled={checkingNow}
                    onClick={() => void checkStatusRef.current()}
                  >
                    <LuRefreshCw className={checkingNow ? styles.spinning : undefined} aria-hidden />
                    {checkingNow ? "Đang kiểm tra..." : "Kiểm tra ngay"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className={styles.error} role="status">Giao dịch chưa hoàn tất. Bạn có thể tạo mã thanh toán khác.</p>
          )}
          <button type="button" className={styles.changePayment} onClick={() => setPayment(null)}>
            Quay lại thông tin đóng góp
          </button>
        </section>
      )}

      <p className={styles.secure}><LuLockKeyhole aria-hidden />
        {demoPayment || isDemoChoice ? "Chế độ demo không tạo giao dịch thật" : payment ? "Trạng thái được đối chiếu với giao dịch thực tế" : "Mã thanh toán được tạo theo đúng số tiền bạn chọn"}
      </p>
      <Link href="/ung-ho/lich-su" className={styles.history}>Xem lịch sử đóng góp</Link>
      {showSuccess && payment && paymentStatus === "success" && <DonationSuccess
        payment={payment}
        confirmedAt={confirmedAt ?? new Date().toISOString()}
        onClose={() => setShowSuccess(false)}
        onAgain={() => { setShowSuccess(false); setPayment(null); setPaymentStatus("pending"); }}
      />}
    </div>
  );
}
