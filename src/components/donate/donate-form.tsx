"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  LuArrowRight,
  LuArrowUpRight,
  LuCheck,
  LuCopy,
  LuCreditCard,
  LuHeart,
  LuLockKeyhole,
  LuQrCode,
  LuRefreshCw,
} from "react-icons/lu";
import { Input, Label } from "@/components/ui/field";
import type { DonationPayment, DonationPaymentAvailability, DonationPaymentMethod } from "@/domain/donation";
import { DONATION_TIERS } from "./donation-tiers";
import styles from "./donate-form.module.css";

const money = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;
const METHODS = [
  { value: "qr", label: "QR ngân hàng", Icon: LuQrCode },
  { value: "vnpay", label: "VNPAY", Icon: LuCreditCard },
  { value: "sepay", label: "SePay", Icon: LuRefreshCw },
] as const;

type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export function DonateForm({ availability }: { availability: DonationPaymentAvailability }) {
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<DonationPaymentMethod>(
    () => METHODS.find(item => availability[item.value])?.value ?? "qr",
  );
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<DonationPayment | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [pollingError, setPollingError] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState<"account" | "reference" | null>(null);
  const selectedAmount = custom ? Number(customAmount) : amount;
  const enabled = availability[method];

  useEffect(() => {
    if (!payment || paymentStatus !== "pending") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function checkStatus() {
      try {
        const response = await fetch(`/api/donations/status/${payment!.txnRef}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error("Không kiểm tra được giao dịch.");
        if (["pending", "success", "failed", "cancelled"].includes(result.data?.status)) {
          setPaymentStatus(result.data.status);
        }
        setPollingError(false);
      } catch {
        if (!controller.signal.aborted) setPollingError(true);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(checkStatus, 5000);
      }
    }
    timer = setTimeout(checkStatus, 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [payment, paymentStatus]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || loading) return;
    setError("");
    if (!Number.isSafeInteger(selectedAmount) || selectedAmount < 10000 || selectedAmount > 100000000) {
      setError("Nhập số tiền từ 10.000 đến 100.000.000 ₫.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          method,
          bankCode: method === "vnpay" ? "VNPAYQR" : undefined,
          donorName: anonymous ? "" : fields.get("donorName"),
          message: fields.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.data?.qrImageUrl) {
        throw new Error(result.message || "Chưa tạo được mã thanh toán. Vui lòng thử lại.");
      }
      setPaymentStatus("pending");
      setQrFailed(false);
      setPollingError(false);
      setCopied(null);
      setPayment(result.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Kết nối bị gián đoạn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
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
          <h2 id="donate-form-title">{payment ? "Thông tin thanh toán" : "Tạo khoản ủng hộ"}</h2>
          <p>{payment ? `Đóng góp ${money(payment.amount)} qua ${METHODS.find(item => item.value === payment.method)?.label}` : "Chọn mức đóng góp phù hợp với bạn."}</p>
        </div>
      </header>

      <form onSubmit={submit} aria-labelledby="donate-form-title" hidden={!!payment}>
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
                  <Input id="donate-amount" type="number" min={10000} max={100000000} step={1}
                    required autoFocus inputMode="numeric" value={customAmount}
                    aria-describedby="donate-amount-hint" aria-invalid={!!error || undefined}
                    onChange={event => { setCustomAmount(event.target.value); setError(""); }}
                    placeholder="Ví dụ: 150000" />
                  <span>VNĐ</span>
                </div>
                <p id="donate-amount-hint" className={styles.hint}>Tối đa 100.000.000 ₫ mỗi lần.</p>
              </div>
            )}
          </fieldset>

          <fieldset className={styles.step}>
            <legend><span>02</span> Phương thức thanh toán</legend>
            <div className={styles.methods}>
              {METHODS.map(({ value, label, Icon }) => (
                <label key={value} className={styles.method}>
                  <input type="radio" name="paymentMethod" value={value} checked={method === value}
                    disabled={!availability[value]} onChange={() => { setMethod(value); setError(""); }} />
                  <span><Icon aria-hidden /><strong>{label}</strong>{!availability[value] && <small>Chưa khả dụng</small>}</span>
                </label>
              ))}
            </div>
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
            <Input id="donor-name" name="donorName" disabled={anonymous} maxLength={80} autoComplete="name"
              placeholder={anonymous ? "Người ủng hộ ẩn danh" : "Tên của bạn"} />
            <div className={styles.messageField}>
              <Label htmlFor="donor-message">Lời nhắn</Label>
              <textarea id="donor-message" name="message" maxLength={500} rows={2}
                placeholder="Một lời nhắn gửi đến Trovio..." />
            </div>
          </fieldset>

          <div className={styles.actions}>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {!enabled && <p role="status" className={styles.notice}>Chưa có phương thức nhận tiền khả dụng. Bạn có thể <Link href="/lien-he">liên hệ Trovio</Link> để được hỗ trợ.</p>}
            <div className={styles.total}><span>Tổng đóng góp</span><strong>{custom && !customAmount ? "Chưa nhập" : money(selectedAmount)}</strong></div>
            <button type="submit" disabled={!enabled || loading} className={styles.submit} aria-busy={loading}>
              <span>{loading ? "Đang tạo mã..." : "Tạo mã thanh toán"}</span>
              <LuArrowRight aria-hidden />
            </button>
          </div>
        </fieldset>
      </form>

      {payment && (
        <section className={styles.payment} aria-label="Thông tin thanh toán" aria-live="polite">
          <div className={styles.paymentState} data-status={paymentStatus}>
            <span className={styles.stateDot} />
            {paymentStatus === "pending" ? "Đang chờ thanh toán" : paymentStatus === "success" ? "Đã xác nhận" : "Chưa hoàn tất"}
          </div>
          {paymentStatus === "success" ? (
            <p className={styles.success} role="status"><LuCheck aria-hidden />Đã nhận {money(payment.amount)}. Cảm ơn bạn đã đồng hành!</p>
          ) : paymentStatus === "pending" ? (
            <>
              {qrFailed ? (
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
                  : "Quét mã bằng ứng dụng ngân hàng và kiểm tra thông tin trước khi chuyển tiền."}
              </p>
              {payment.accountNumber && (
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
              <p className={styles.hint} role="status">
                {pollingError ? "Kết nối kiểm tra giao dịch gián đoạn. Hệ thống đang thử lại."
                  : payment.method === "qr" ? "Đang chờ đối soát khoản chuyển tiền."
                    : "Trạng thái sẽ tự động cập nhật sau khi thanh toán."}
              </p>
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
        {payment ? "Trạng thái được đối chiếu với giao dịch thực tế" : "Mã thanh toán được tạo theo đúng số tiền bạn chọn"}
      </p>
      <Link href="/ung-ho/lich-su" className={styles.history}>Xem lịch sử đóng góp</Link>
    </div>
  );
}
