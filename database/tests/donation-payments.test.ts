import assert from "node:assert/strict";
import { test } from "node:test";
import { repositories, type DonationRecord } from "../repositories";
import { donationService, DonationUnavailableError, DonationValidationError } from "../../src/services/donation.service";
import { buildTransferQr, getDonationPaymentAvailability, transferMemo, verifySepayAuthorization } from "../../src/services/donation-payment.service";

process.env.DONATION_BANK_CODE = "TESTBANK";
process.env.DONATION_ACCOUNT_NUMBER = "123456789";
process.env.DONATION_ACCOUNT_NAME = "TEST ACCOUNT";
process.env.BANK_HISTORY_API_TOKEN = "a".repeat(32);
process.env.SEPAY_BANK_CODE = "TESTBANK";
process.env.SEPAY_ACCOUNT_NUMBER = "987654321";
process.env.SEPAY_ACCOUNT_NAME = "TEST ACCOUNT";
process.env.SEPAY_WEBHOOK_API_KEY = "test-webhook-key";
process.env.VNPAY_TMN_CODE = "TESTCODE";
process.env.VNPAY_HASH_SECRET = "test-secret";

const txnRef = `TROVIOSEPAY${"A".repeat(32)}`;
const record = { id: "test", amount: 50000, status: "pending", vnpTxnRef: txnRef } as DonationRecord;
const event = { id: 1234, accountNumber: "987654321", transferType: "in", transferAmount: 50000, content: `${txnRef} chuyen tien`, code: txnRef };

test("each method requires its own recipient or merchant configuration", () => {
  assert.deepEqual(getDonationPaymentAvailability(), { qr: true, vnpay: true, sepay: true });
  delete process.env.BANK_HISTORY_API_TOKEN;
  try { assert.equal(getDonationPaymentAvailability().qr, false); }
  finally { process.env.BANK_HISTORY_API_TOKEN = "a".repeat(32); }
  delete process.env.SEPAY_WEBHOOK_API_KEY;
  try {
    assert.equal(getDonationPaymentAvailability().sepay, false);
    assert.equal(getDonationPaymentAvailability().qr, true);
  } finally { process.env.SEPAY_WEBHOOK_API_KEY = "test-webhook-key"; }
});

test("bank QR contains exact recipient, amount and unique reference with optional identity", async (t) => {
  const create = t.mock.method(repositories.donations, "create", async () => record);
  const result = await donationService.createDonation({ method: "qr", amount: 75000, donorName: "Nguyễn Bùi Xuân Việt" });
  const qr = new URL(result.qrImageUrl);
  assert.equal(qr.hostname, "vietqr.app");
  assert.equal(qr.searchParams.get("acc"), "123456789");
  assert.equal(qr.searchParams.get("amount"), "75000");
  assert.equal(qr.searchParams.get("des"), result.transferContent);
  assert.equal(result.transferContent, `VIET ${result.txnRef}`);
  assert.match(result.txnRef, /^TQ[A-F0-9]{16}$/);
  const saved = create.mock.calls[0].arguments[0];
  assert.ok(saved);
  assert.equal(saved.donorName, "Nguyễn Bùi Xuân Việt");
  assert.equal(saved.message, null);
  assert.equal(result.paymentUrl, "");
});

test("changing a bank QR denomination changes only the encoded amount", () => {
  const ref = "TQ123456789ABCDEF0";
  const first = new URL(buildTransferQr("qr", 20000, ref, "Việt").qrImageUrl);
  const second = new URL(buildTransferQr("qr", 100000, ref, "Việt").qrImageUrl);
  assert.equal(first.searchParams.get("amount"), "20000");
  assert.equal(second.searchParams.get("amount"), "100000");
  assert.equal(first.searchParams.get("acc"), second.searchParams.get("acc"));
  assert.equal(first.searchParams.get("des"), second.searchParams.get("des"));
  assert.equal(transferMemo("Nguyễn Bùi Xuân Việt", ref), `VIET ${ref}`);
  assert.ok(transferMemo("Nguyễn Bùi Xuân Việt", ref).length <= 23);
});

test("a duplicate bank transfer reference is regenerated before returning a QR", async (t) => {
  let attempts = 0;
  const create = t.mock.method(repositories.donations, "create", async () => {
    if (attempts++ === 0) throw Object.assign(new Error("duplicate"), { code: "23505" });
    return record;
  });
  const result = await donationService.createDonation({ method: "qr", amount: 50000, donorName: "Việt" });
  assert.equal(create.mock.callCount(), 2);
  const firstCall = create.mock.calls[0];
  const secondCall = create.mock.calls[1];
  assert.ok(firstCall?.arguments?.[0]);
  assert.ok(secondCall?.arguments?.[0]);
  assert.notEqual(firstCall.arguments[0].vnpTxnRef, secondCall.arguments[0].vnpTxnRef);
  assert.equal(new URL(result.qrImageUrl).searchParams.get("des"), result.transferContent);
});

test("SePay uses its configured account and preserves optional name and message", async (t) => {
  const create = t.mock.method(repositories.donations, "create", async () => record);
  const result = await donationService.createDonation({ method: "sepay", amount: 50000, donorName: "  An  ", message: "  Cảm ơn  " });
  assert.equal(new URL(result.qrImageUrl).searchParams.get("acc"), "987654321");
  assert.match(result.txnRef, /^TS[A-F0-9]{16}$/);
  const saved = create.mock.calls[0].arguments[0];
  assert.ok(saved);
  assert.equal(saved.donorName, "An");
  assert.equal(saved.message, "Cảm ơn");
});

test("VNPAY retains its signed URL and generates the QR locally", async (t) => {
  t.mock.method(repositories.donations, "create", async () => record);
  const result = await donationService.createDonation({ amount: 50000, bankCode: "VNPAYQR" });
  assert.equal(result.method, "vnpay");
  assert.match(result.qrImageUrl, /^data:image\/png;base64,/);
  const url = new URL(result.paymentUrl);
  assert.equal(url.searchParams.get("vnp_Amount"), "5000000");
  assert.equal(url.searchParams.get("vnp_TxnRef"), result.txnRef);
});

test("unconfigured methods and fractional amounts cannot create pending transactions", async (t) => {
  const create = t.mock.method(repositories.donations, "create", async () => record);
  delete process.env.DONATION_ACCOUNT_NUMBER;
  try {
    await assert.rejects(() => donationService.createDonation({ method: "qr", amount: 50000 }), DonationUnavailableError);
    await assert.rejects(() => donationService.createDonation({ amount: 10000.5 }), DonationValidationError);
    assert.equal(create.mock.callCount(), 0);
  } finally { process.env.DONATION_ACCOUNT_NUMBER = "123456789"; }
});

test("SePay webhook authentication rejects absent or incorrect credentials", () => {
  assert.equal(verifySepayAuthorization(null), false);
  assert.equal(verifySepayAuthorization("Apikey wrong"), false);
  assert.equal(verifySepayAuthorization("Apikey test-webhook-key"), true);
});

test("webhooks reject wrong accounts and amounts and ignore outgoing transfers", async (t) => {
  t.mock.method(repositories.donations, "getByTxnRef", async () => record);
  const confirm = t.mock.method(repositories.donations, "confirmBankTransfer", async () => record);
  await assert.rejects(() => donationService.processSepayWebhook({ ...event, accountNumber: "other" }), DonationValidationError);
  await assert.rejects(() => donationService.processSepayWebhook({ ...event, transferAmount: 10000 }), DonationValidationError);
  await donationService.processSepayWebhook({ ...event, transferType: "out" });
  await donationService.processSepayWebhook({ ...event, content: "unrelated", code: null });
  assert.equal(confirm.mock.callCount(), 0);
});

test("matched incoming transfers are confirmed and repeated notifications are idempotent", async (t) => {
  let status: "pending" | "success" = "pending";
  t.mock.method(repositories.donations, "getByTxnRef", async () => ({ ...record, status }));
  const confirm = t.mock.method(repositories.donations, "confirmBankTransfer", async () => {
    status = "success";
    return { ...record, status };
  });
  await donationService.processSepayWebhook(event);
  await donationService.processSepayWebhook(event);
  assert.equal(confirm.mock.callCount(), 1);
  assert.deepEqual(confirm.mock.calls[0].arguments, [txnRef, 50000, "SEPAY_1234", "TESTBANK"]);
});

test("short references embedded after donor names remain reconcilable", async (t) => {
  const shortRef = "TS123456789ABCDEF0";
  t.mock.method(repositories.donations, "getByTxnRef", async () => ({ ...record, vnpTxnRef: shortRef }));
  const confirm = t.mock.method(repositories.donations, "confirmBankTransfer", async () => record);
  await donationService.processSepayWebhook({ ...event, content: `VIET ${shortRef}`, code: "" });
  assert.equal(confirm.mock.callCount(), 1);
  assert.equal(confirm.mock.calls[0].arguments[0], shortRef);
});
