import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

// Cấu hình giả cho test — KHÔNG phải thông tin thật.
process.env.VNPAY_TMN_CODE = "TESTTMN1";
process.env.VNPAY_HASH_SECRET = "TESTSECRETKEY0123456789ABCDEFGHI";
process.env.APP_URL = "http://localhost:3001";

import {
  buildVnpayPaymentUrl,
  formatVnpayDate,
  toVnpayOrderInfo,
  verifyVnpayCallback,
} from "../../src/services/vnpay.service";
import { donationService, DonationUnavailableError, DonationValidationError } from "../../src/services/donation.service";

/**
 * Cài đặt tham chiếu độc lập, chép theo code mẫu Node.js chính thức của VNPay:
 *   sortObject(): sắp xếp khoá, giá trị = encodeURIComponent(v).replace(/%20/g, "+")
 *   signData = qs.stringify(sorted, { encode: false }); hash = HMAC-SHA512(secret, signData)
 */
function vnpayReferenceSign(params: Record<string, string>, secret: string): string {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(params).map(encodeURIComponent).sort()) {
    sorted[k] = encodeURIComponent(params[k]).replace(/%20/g, "+");
  }
  const signData = Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join("&");
  return crypto.createHmac("sha512", secret).update(Buffer.from(signData, "utf-8")).digest("hex");
}

/** Mô phỏng VNPay: nhận query đã giải mã, trả callback có chữ ký. */
function vnpayCallback(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  const params: Record<string, string> = { ...base, ...extra };
  delete params.vnp_SecureHash;
  return { ...params, vnp_SecureHash: vnpayReferenceSign(params, process.env.VNPAY_HASH_SECRET!) };
}

function decodedQuery(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  new URL(url).searchParams.forEach((v, k) => (out[k] = v)); // giống Next.js: "+" → " "
  return out;
}

test("vnpay: formatVnpayDate là giờ Việt Nam 14 chữ số, không phụ thuộc múi giờ máy", () => {
  assert.equal(formatVnpayDate(new Date("2026-11-07T17:30:05Z")), "20261108003005");
});

test("vnpay: URL thanh toán có đủ tham số bắt buộc và hạn 15 phút", () => {
  const now = new Date("2026-11-07T03:00:00Z");
  const url = buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST_001", amount: 50000, orderInfo: "Ung ho Trovio", ipAddress: "::ffff:10.0.0.5", bankCode: "VNPAYQR", now });
  const q = decodedQuery(url);
  assert.equal(q.vnp_Version, "2.1.0");
  assert.equal(q.vnp_Command, "pay");
  assert.equal(q.vnp_TmnCode, "TESTTMN1");
  assert.equal(q.vnp_Amount, "5000000");
  assert.equal(q.vnp_CurrCode, "VND");
  assert.equal(q.vnp_BankCode, "VNPAYQR");
  assert.equal(q.vnp_IpAddr, "10.0.0.5");
  assert.equal(q.vnp_CreateDate, "20261107100000");
  assert.equal(q.vnp_ExpireDate, "20261107101500");
  assert.equal(q.vnp_ReturnUrl, "http://localhost:3001/api/donations/vnpay-return");
  assert.equal(q.vnp_SecureHash.length, 128);
});

test("vnpay: chữ ký khớp cài đặt tham chiếu của VNPay khi nội dung có dấu cách", () => {
  const url = buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST_002", amount: 100000, orderInfo: "Ung ho Trovio co dau cach" });
  // Dấu cách phải được mã hoá "+" (không phải %20) trong URL gửi đi.
  assert.match(url, /vnp_OrderInfo=Ung\+ho\+Trovio\+co\+dau\+cach/);
  const q = decodedQuery(url);
  const { vnp_SecureHash, ...rest } = q;
  assert.equal(vnp_SecureHash, vnpayReferenceSign(rest, process.env.VNPAY_HASH_SECRET!));
});

test("vnpay: nội dung đơn bỏ dấu tiếng Việt và ký tự đặc biệt", () => {
  assert.equal(toVnpayOrderInfo("Ủng hộ Trovio – Nguyễn Văn Đức #1 & bạn!"), "Ung ho Trovio Nguyen Van Duc 1 ban");
});

test("vnpay: callback hợp lệ + ResponseCode 00 + TransactionStatus 00 là thành công", () => {
  const sent = decodedQuery(buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST_003", amount: 100000, orderInfo: "Ung ho Trovio TROVIO_TEST_003" }));
  const cb = vnpayCallback(sent, {
    vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: "14589230",
    vnp_BankCode: "NCB", vnp_CardType: "ATM", vnp_PayDate: "20261107100512",
  });
  const r = verifyVnpayCallback(cb);
  assert.equal(r.isValid, true);
  assert.equal(r.isSuccess, true);
  assert.equal(r.amount, 100000);
  assert.equal(r.txnRef, "TROVIO_TEST_003");
  assert.equal(r.transactionNo, "14589230");
  assert.equal(r.payDate, "20261107100512");
});

test("vnpay: ResponseCode 00 nhưng TransactionStatus khác 00 không tính là thành công", () => {
  const sent = decodedQuery(buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST_004", amount: 20000, orderInfo: "x" }));
  const r = verifyVnpayCallback(vnpayCallback(sent, { vnp_ResponseCode: "00", vnp_TransactionStatus: "02" }));
  assert.equal(r.isValid, true);
  assert.equal(r.isSuccess, false);
});

test("vnpay: sửa số tiền hoặc chữ ký giả đều bị từ chối", () => {
  const sent = decodedQuery(buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST_005", amount: 20000, orderInfo: "x" }));
  const cb = vnpayCallback(sent, { vnp_ResponseCode: "00", vnp_TransactionStatus: "00" });
  assert.equal(verifyVnpayCallback({ ...cb, vnp_Amount: "100000000" }).isValid, false);
  assert.equal(verifyVnpayCallback({ ...cb, vnp_SecureHash: "deadbeef" }).isValid, false);
  assert.equal(verifyVnpayCallback({ ...cb, vnp_SecureHash: "0".repeat(128) }).isSuccess, false);
});

test("donations: số tiền ngoài 10.000 – 100.000.000 VNĐ bị từ chối", async () => {
  await assert.rejects(() => donationService.createDonation({ amount: 5000 }), (e: unknown) => e instanceof DonationValidationError && e.message.includes("10.000 VNĐ"));
  await assert.rejects(() => donationService.createDonation({ amount: 150000000 }), (e: unknown) => e instanceof DonationValidationError && e.message.includes("100.000.000 VNĐ"));
});

test("donations: email sai định dạng bị từ chối", async () => {
  await assert.rejects(() => donationService.createDonation({ amount: 50000, donorEmail: "invalid-email" }), (e: unknown) => e instanceof DonationValidationError && e.message.includes("email"));
});

test("donations: thiếu cấu hình VNPay → báo tạm ngưng, không tạo đơn", async () => {
  const saved = process.env.VNPAY_HASH_SECRET;
  delete process.env.VNPAY_HASH_SECRET;
  try {
    await assert.rejects(() => donationService.createDonation({ amount: 50000 }), (e: unknown) => e instanceof DonationUnavailableError);
  } finally {
    process.env.VNPAY_HASH_SECRET = saved;
  }
});

test("donations: biên lai từ chối mã đơn sai định dạng mà không truy vấn DB", async () => {
  assert.equal(await donationService.getReceipt("abc' OR 1=1"), null);
});
