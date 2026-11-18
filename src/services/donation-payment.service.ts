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

/** Keep the entire reference when banks shorten the transfer note. */
export const transferMemo = (txnRef: string): string => txnRef;

export function buildTransferQr(method: "qr" | "sepay", amount: number, txnRef: string) {
  const bank = getTransferConfig(method);
  if (!bank) throw new Error("Chưa cấu hình tài khoản nhận tiền.");
  const memo = transferMemo(txnRef);
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
