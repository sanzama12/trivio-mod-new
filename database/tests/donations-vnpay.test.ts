import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { repositories, type DonationRecord } from "../repositories";
import { donationService, DonationValidationError } from "../../src/services/donation.service";
import { buildVnpayPaymentUrl, getVnpayConfig, isVnpayConfigured, verifyVnpayCallback } from "../../src/services/vnpay.service";

process.env.VNPAY_TMN_CODE = "TESTCODE";
process.env.VNPAY_HASH_SECRET = "unit-test-only";

function signedCallback(patch: Record<string, string> = {}) {
  const params: Record<string, string> = {
    vnp_TmnCode: "TESTCODE", vnp_TxnRef: "TROVIO_TEST", vnp_Amount: "5000000",
    vnp_ResponseCode: "00", vnp_TransactionStatus: "00", ...patch,
  };
  const data = Object.keys(params).sort().map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  params.vnp_SecureHash = crypto.createHmac("sha512", "unit-test-only").update(data).digest("hex");
  return params;
}

const record = { id: "donation-test", amount: 50000, status: "pending", vnpTxnRef: "TROVIO_TEST" } as DonationRecord;

test("payment requests encode spaces consistently and sign the outgoing parameters", () => {
  const url = new URL(buildVnpayPaymentUrl({ txnRef: "TROVIO_TEST", amount: 50000, orderInfo: "Ung ho Trovio", bankCode: "VNPAYQR" }));
  assert.equal(url.searchParams.get("vnp_Amount"), "5000000");
  const hash = url.searchParams.get("vnp_SecureHash");
  url.searchParams.delete("vnp_SecureHash");
  assert.ok(url.search.includes("Ung+ho+Trovio"));
  assert.equal(hash, crypto.createHmac("sha512", "unit-test-only").update(url.searchParams.toString()).digest("hex"));
});

test("callbacks reject tampering, a different merchant and incomplete payment status", () => {
  assert.equal(verifyVnpayCallback(signedCallback()).isSuccess, true);
  assert.equal(verifyVnpayCallback({ ...signedCallback(), vnp_Amount: "100" }).isValid, false);
  assert.equal(verifyVnpayCallback(signedCallback({ vnp_TmnCode: "OTHER" })).isValid, false);
  assert.equal(verifyVnpayCallback(signedCallback({ vnp_TransactionStatus: "01" })).isSuccess, false);
});

test("both return and IPN reject amount mismatches before modifying a donation", async (t) => {
  t.mock.method(repositories.donations, "getByTxnRef", async () => record);
  const update = t.mock.method(repositories.donations, "updatePaymentResult", async () => record);
  const callback = signedCallback({ vnp_Amount: "1000000" });
  assert.equal((await donationService.processReturn(callback)).success, false);
  assert.equal((await donationService.processIpn(callback)).RspCode, "04");
  assert.equal(update.mock.callCount(), 0);
});

test("a repeated confirmed callback leaves its stored result intact", async (t) => {
  const confirmed = { ...record, status: "success" as const };
  t.mock.method(repositories.donations, "getByTxnRef", async () => confirmed);
  const update = t.mock.method(repositories.donations, "updatePaymentResult", async () => confirmed);
  assert.equal((await donationService.processReturn(signedCallback())).success, true);
  assert.equal((await donationService.processIpn(signedCallback())).RspCode, "02");
  assert.equal(update.mock.callCount(), 0);
});

test("donations validate amounts and email before creating a payment", async () => {
  for (const amount of [NaN, 0, 9999, 100000001]) {
    await assert.rejects(() => donationService.createDonation({ amount }), DonationValidationError);
  }
  await assert.rejects(() => donationService.createDonation({ amount: 50000, donorEmail: "invalid" }), DonationValidationError);
});

test("missing merchant settings disable payments without fallback credentials", () => {
  const original = process.env.VNPAY_HASH_SECRET;
  delete process.env.VNPAY_HASH_SECRET;
  try {
    assert.equal(isVnpayConfigured(), false);
    assert.throws(getVnpayConfig);
  } finally {
    process.env.VNPAY_HASH_SECRET = original;
  }
});
