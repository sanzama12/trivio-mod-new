"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuArrowRight, LuCheck, LuCircleCheck, LuCopy, LuRotateCcw, LuX } from "react-icons/lu";
import type { DonationPayment } from "@/domain/donation";
import { DonationSuccessScene } from "./donation-success-scene";
import styles from "./donation-success.module.css";

const methodLabel: Record<DonationPayment["method"], string> = {
  qr: "Chuyển khoản QR",
  sepay: "Chuyển khoản SePay",
  vnpay: "VNPAY",
};

export function DonationSuccess({ payment, confirmedAt, onClose, onAgain }: {
  payment: Pick<DonationPayment, "txnRef" | "amount" | "method">;
  confirmedAt: string;
  onClose: () => void;
  onAgain: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const date = new Date(confirmedAt).toLocaleString("vi-VN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  });

  return createPortal(
    <div ref={dialogRef} className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="donation-success-title" aria-describedby="donation-success-description">
      <div className={styles.scene}><DonationSuccessScene onReady={onSceneReady} /></div>
      {!sceneReady && <div className={styles.fallback} aria-hidden="true"><LuCircleCheck /></div>}
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Đóng xác nhận" title="Đóng xác nhận"><LuX aria-hidden /></button>

      <main className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}><LuCircleCheck aria-hidden /> GIAO DỊCH ĐÃ XÁC NHẬN</span>
            <h1 id="donation-success-title">Ủng hộ<br /><span>thành công.</span></h1>
            <p id="donation-success-description">Cảm ơn bạn đã đồng hành cùng Trovio.</p>
          </div>

          <div className={styles.artSpace} aria-hidden="true" />

          <div className={styles.receipt}>
            <p className={styles.label}>SỐ TIỀN ĐÃ NHẬN</p>
            <p className={styles.amount}>{payment.amount.toLocaleString("vi-VN")} <span>₫</span></p>
            <dl className={styles.details}>
              <div><dt>Mã giao dịch</dt><dd className={styles.reference}>{payment.txnRef}<button type="button" aria-label="Sao chép mã giao dịch" title="Sao chép mã giao dịch" onClick={async () => {
                try { await navigator.clipboard.writeText(payment.txnRef); setCopied(true); } catch { setCopied(false); }
              }}>{copied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}</button></dd></div>
              <div><dt>Phương thức</dt><dd>{methodLabel[payment.method]}</dd></div>
              <div><dt>Xác nhận lúc</dt><dd>{date}</dd></div>
            </dl>
          </div>

          <div className={styles.actions}>
            <Link href="/" className={styles.primary}>Về trang chủ <LuArrowRight aria-hidden /></Link>
            <Link href="/ung-ho/lich-su" className={styles.secondary}>Lịch sử ủng hộ</Link>
            <button type="button" className={styles.secondary} onClick={onAgain}><LuRotateCcw aria-hidden /> Ủng hộ thêm</button>
          </div>
        </div>
      </main>
      <p className={styles.footer}>Trovio · Đồng hành cùng lựa chọn của bạn</p>
    </div>,
    document.body,
  );
}
