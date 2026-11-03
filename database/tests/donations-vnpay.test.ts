import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildVnpayPaymentUrl,
  verifyVnpayCallback,
  formatVnpayDate,
} from "../../src/services/vnpay.service";
import { donationService, DonationValidationError } from "../../src/services/donation.service";

test("vnpay: formatVnpayDate generates a 14-character numeric timestamp", () => {
  const formatted = formatVnpayDate(new Date());
  assert.equal(formatted.length, 14);
  assert.match(formatted, /^[0-9]{14}$/);
});

test("vnpay: buildVnpayPaymentUrl correctly calculates HMAC-SHA512 and sets required parameters", () => {
  const url = buildVnpayPaymentUrl({
    txnRef: "TROVIO_TEST_001",
    amount: 50000,
    orderInfo: "Ung ho TriOVO Test",
    ipAddress: "127.0.0.1",
    bankCode: "VNPAYQR",
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("vnp_Command"), "pay");
  assert.equal(parsed.searchParams.get("vnp_Version"), "2.1.0");
  assert.equal(parsed.searchParams.get("vnp_TxnRef"), "TROVIO_TEST_001");
  assert.equal(parsed.searchParams.get("vnp_Amount"), "5000000"); // 50000 * 100
  assert.equal(parsed.searchParams.get("vnp_CurrCode"), "VND");
  assert.equal(parsed.searchParams.get("vnp_BankCode"), "VNPAYQR");
  assert.ok(parsed.searchParams.get("vnp_SecureHash"));
  assert.equal(parsed.searchParams.get("vnp_SecureHash")?.length, 128); // SHA-512 hex length
});

test("vnpay: verifyVnpayCallback accepts valid signature and responseCode=00 as success", () => {
  // Tạo URL mẫu hợp lệ
  const url = buildVnpayPaymentUrl({
    txnRef: "TROVIO_TEST_002",
    amount: 100000,
    orderInfo: "Ung ho 100k",
  });

  const parsed = new URL(url);
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  // Giả lập VNPay trả về kết quả thành công với ResponseCode=00
  params.vnp_ResponseCode = "00";
  params.vnp_TransactionNo = "14589230";
  params.vnp_BankCode = "NCB";

  // Tạo lại chữ ký hợp lệ cho callback từ VNPay
  const testUrl = buildVnpayPaymentUrl({
    txnRef: "TROVIO_TEST_002",
    amount: 100000,
    orderInfo: "Ung ho 100k",
  });
  const testParsed = new URL(testUrl);
  const callbackParams: Record<string, string> = {
    vnp_Amount: "10000000",
    vnp_BankCode: "NCB",
    vnp_Command: "pay",
    vnp_CreateDate: formatVnpayDate(),
    vnp_CurrCode: "VND",
    vnp_IpAddr: "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: "Ung ho 100k",
    vnp_OrderType: "other",
    vnp_ResponseCode: "00",
    vnp_TmnCode: testParsed.searchParams.get("vnp_TmnCode") || "CGXZLS0Z",
    vnp_TransactionNo: "14589230",
    vnp_TxnRef: "TROVIO_TEST_002",
    vnp_Version: "2.1.0",
  };

  // Ký bằng cùng thuật toán
  const sortedKeys = Object.keys(callbackParams).sort();
  const signParts = sortedKeys.map((k) => `${k}=${encodeURIComponent(callbackParams[k])}`);
  const crypto = require("node:crypto");
  const hash = crypto
    .createHmac("sha512", process.env.VNPAY_HASH_SECRET || "RAOCTPGSKOWEHJTXDDFN dynamic")
    .update(Buffer.from(signParts.join("&"), "utf-8"))
    .digest("hex");

  callbackParams.vnp_SecureHash = hash;

  const result = verifyVnpayCallback(callbackParams);
  assert.equal(result.isValid, true);
  assert.equal(result.isSuccess, true);
  assert.equal(result.amount, 100000);
  assert.equal(result.txnRef, "TROVIO_TEST_002");
  assert.equal(result.transactionNo, "14589230");
  assert.equal(result.bankCode, "NCB");
});

test("vnpay: verifyVnpayCallback rejects tampered signature", () => {
  const tamperedParams = {
    vnp_Amount: "10000000",
    vnp_TxnRef: "TROVIO_TEST_003",
    vnp_ResponseCode: "00",
    vnp_SecureHash: "deadbeef00000000000000000000000000000000000000000000000000000000",
  };

  const result = verifyVnpayCallback(tamperedParams);
  assert.equal(result.isValid, false);
  assert.equal(result.isSuccess, false);
});

test("donations: rejects amounts less than 10,000 VND or greater than 100,000,000 VND", async () => {
  await assert.rejects(
    () => donationService.createDonation({ amount: 5000 }),
    (err: any) => err instanceof DonationValidationError && err.message.includes("10.000 VNĐ")
  );

  await assert.rejects(
    () => donationService.createDonation({ amount: 150000000 }),
    (err: any) => err instanceof DonationValidationError && err.message.includes("100.000.000 VNĐ")
  );
});

test("donations: rejects invalid email format", async () => {
  await assert.rejects(
    () => donationService.createDonation({ amount: 50000, donorEmail: "invalid-email" }),
    (err: any) => err instanceof DonationValidationError && err.message.includes("email")
  );
});

