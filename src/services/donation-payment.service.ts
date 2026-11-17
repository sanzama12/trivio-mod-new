import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { DonationPaymentAvailability, DonationPaymentMethod } from "@/domain/donation";
import { isVnpayConfigured } from "./vnpay.service";

export function getTransferConfig(method: "qr" | "sepay") {
  const prefix = method === "sepay" ? "SEPAY" : "DONATION";
  const bankName = process.env[`${prefix}_BANK_CODE`]?.trim();
  const accountNumber = process.env[`${prefix}_ACCOUNT_NUMBER`]?.trim();
  const accountName = process.env[`${prefix}_ACCOUNT_NAME`]?.trim();
  if (!bankName || !accountNumber || !accountName) return null;
  return { bankName, accountNumber, accountName };
}

export function getDonationPaymentAvailability(): DonationPaymentAvailability {
  return {
    qr: Boolean(getTransferConfig("qr")),
    vnpay: isVnpayConfigured(),
    sepay: Boolean(getTransferConfig("sepay") && process.env.SEPAY_WEBHOOK_API_KEY?.trim()),
  };
}

export function isDonationPaymentMethod(value: unknown): value is DonationPaymentMethod {
  return value === "qr" || value === "vnpay" || value === "sepay";
}

export function buildTransferQr(method: "qr" | "sepay", amount: number, txnRef: string) {
  const bank = getTransferConfig(method);
  if (!bank) throw new Error("Chưa cấu hình tài khoản nhận tiền.");
  const params = new URLSearchParams({
    acc: bank.accountNumber,
    bank: bank.bankName,
    amount: String(amount),
    des: txnRef,
    holder: bank.accountName,
    template: "compact",
  });
  return { ...bank, qrImageUrl: `https://vietqr.app/img?${params}`, transferContent: txnRef };
}

export function verifySepayAuthorization(authorization: string | null): boolean {
  const key = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
  if (!key || !authorization) return false;
  const expected = Buffer.from(`Apikey ${key}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
