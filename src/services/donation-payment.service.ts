import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { DonationPaymentAvailability, DonationPaymentMethod } from "@/domain/donation";
import { isVnpayConfigured } from "./vnpay.service";
import { isBankHistoryConfigured } from "./bank-history.service";

export function getTransferConfig(method: "qr" | "sepay") {
  const prefix = method === "sepay" ? "SEPAY" : "DONATION";
  const bankCode = process.env[`${prefix}_BANK_CODE`]?.trim();
  const bankName = process.env[`${prefix}_BANK_NAME`]?.trim() || bankCode;
  const accountNumber = process.env[`${prefix}_ACCOUNT_NUMBER`]?.trim();
  const accountName = process.env[`${prefix}_ACCOUNT_NAME`]?.trim();
  if (!bankCode || !accountNumber || !accountName) return null;
  return { bankCode, bankName, accountNumber, accountName };
}

export function getDonationPaymentAvailability(): DonationPaymentAvailability {
  return {
    qr: Boolean(getTransferConfig("qr") && isBankHistoryConfigured()),
    vnpay: isVnpayConfigured(),
    sepay: Boolean(getTransferConfig("sepay") && process.env.SEPAY_WEBHOOK_API_KEY?.trim()),
  };
}

export function isDonationPaymentMethod(value: unknown): value is DonationPaymentMethod {
  return value === "qr" || value === "vnpay" || value === "sepay";
}

/** Keep the unique reference intact within VietQR's 23-character transfer note. */
export function transferMemo(donorName: string, txnRef: string): string {
  const name = donorName === "Người ủng hộ ẩn danh" ? "ANON" : donorName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d").toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ").trim().split(/\s+/).at(-1) || "ANON";
  return `${name.slice(0, Math.max(1, 23 - txnRef.length - 1))} ${txnRef}`;
}

export function buildTransferQr(method: "qr" | "sepay", amount: number, txnRef: string, donorName = "Người ủng hộ ẩn danh") {
  const bank = getTransferConfig(method);
  if (!bank) throw new Error("Chưa cấu hình tài khoản nhận tiền.");
  const memo = transferMemo(donorName, txnRef);
  const params = new URLSearchParams({
    acc: bank.accountNumber,
    bank: bank.bankCode,
    amount: String(amount),
    des: memo,
    holder: bank.accountName,
    template: "compact",
  });
  return { ...bank, qrImageUrl: `https://vietqr.app/img?${params}`, transferContent: memo };
}

export function verifySepayAuthorization(authorization: string | null): boolean {
  const key = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
  if (!key || !authorization) return false;
  const expected = Buffer.from(`Apikey ${key}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
