import assert from "node:assert/strict";
import test from "node:test";
import { repositories, type DonationRecord } from "../repositories";
import { fetchBankHistory, parseBankHistory, matchesBankTransfer, matchingBankReference } from "../../src/services/bank-history.service";
import { donationService } from "../../src/services/donation.service";
import { GET } from "../../src/app/api/donations/status/[txnRef]/route";

const ref = "TQ123456789ABCDEF0";
const account = "0335384174";
const pending = { id: "test", vnpTxnRef: ref, amount: 50000, status: "pending" } as DonationRecord;
const bankRow = (patch: Record<string, unknown> = {}) => ({
  accountNo: account, creditAmount: "50000", debitAmount: "0", description: `VIET ${ref}`,
  addDescription: "", currency: "VND", tranId: "BANK123456789012", ...patch,
});

test("bank history shares the cooldown and exposes failures instead of stale success", async (t) => {
  const previous = process.env.BANK_HISTORY_API_TOKEN;
  process.env.BANK_HISTORY_API_TOKEN = "cache_regression_token_123456789";
  let now = 100_000;
  t.mock.method(Date, "now", () => now);
  const upstream = t.mock.method(globalThis, "fetch", async () => Response.json({ status: "success", TranList: [bankRow()] }));
  try {
    assert.equal((await fetchBankHistory())?.length, 1);
    await fetchBankHistory();
    assert.equal(upstream.mock.callCount(), 1);
    now += 10_001;
    upstream.mock.mockImplementation(async () => new Response("", { status: 503 }));
    assert.equal(await fetchBankHistory(), null);
    now += 4_000;
    assert.equal(await fetchBankHistory(), null);
    assert.equal(upstream.mock.callCount(), 2);
    process.env.BANK_HISTORY_API_TOKEN = "different_token_123456789";
    await fetchBankHistory();
    assert.equal(upstream.mock.callCount(), 3);
  } finally {
    if (previous === undefined) delete process.env.BANK_HISTORY_API_TOKEN;
    else process.env.BANK_HISTORY_API_TOKEN = previous;
  }
});

test("bank history accepts incoming transactions only with a stable ID and account", () => {
  const rows = parseBankHistory({ status: "success", TranList: [
    bankRow({ debitAmount: "50000", creditAmount: "0" }),
    bankRow({ tranId: "" }),
    bankRow({ currency: "USD" }),
    bankRow(),
  ] });
  assert.equal(rows?.length, 1);
  assert.equal(rows?.[0].transactionId, "DVC_BANK123456789012");
  assert.equal(parseBankHistory({ status: 99, TranList: [bankRow()] }), null);
  assert.equal(parseBankHistory({ status: "success", TranList: null }), null);
});

test("bank transfer must match account, amount, and a whole reference", () => {
  const transfer = parseBankHistory({ status: "success", TranList: [bankRow()] })![0];
  assert.equal(matchesBankTransfer(transfer, { accountNumber: account, amount: 50000, txnRef: ref }), true);
  assert.equal(matchesBankTransfer(transfer, { accountNumber: "other", amount: 50000, txnRef: ref }), false);
  assert.equal(matchesBankTransfer(transfer, { accountNumber: account, amount: 20000, txnRef: ref }), false);
  assert.equal(matchesBankTransfer({ ...transfer, description: `VIET ${ref}EXTRA` }, { accountNumber: account, amount: 50000, txnRef: ref }), false);
  const shortened = { ...transfer, description: `VIET ${ref.slice(0, -1)}` };
  assert.equal(matchingBankReference(shortened, { accountNumber: account, amount: 50000, txnRef: ref }), ref.slice(0, -1));
  assert.equal(matchesBankTransfer({ ...shortened, description: `${shortened.description}A` }, { accountNumber: account, amount: 50000, txnRef: ref }), false);
});

test("a one-character-truncated bank note is reconciled with its prefix", async (t) => {
  const oldEnv = {
    token: process.env.BANK_HISTORY_API_TOKEN, code: process.env.DONATION_BANK_CODE,
    account: process.env.DONATION_ACCOUNT_NUMBER, name: process.env.DONATION_ACCOUNT_NAME,
  };
  process.env.BANK_HISTORY_API_TOKEN = "a".repeat(32);
  process.env.DONATION_BANK_CODE = "970422";
  process.env.DONATION_ACCOUNT_NUMBER = account;
  process.env.DONATION_ACCOUNT_NAME = "TEST ACCOUNT";
  try {
    const confirm = t.mock.method(repositories.donations, "confirmBankTransfer", async () => ({ ...pending, status: "success" as const }));
    const fetchMock = (async () => Response.json({ status: "success", TranList: [
      bankRow({ description: `VIET ${ref.slice(0, -1)}` }),
    ] })) as typeof fetch;
    const checked = await donationService.refreshQrPayment(pending, fetchMock);
    assert.equal(checked.donation.status, "success");
    assert.deepEqual(confirm.mock.calls[0].arguments, [ref, 50000, "DVC_BANK123456789012", "970422", ref.slice(0, -1)]);
  } finally {
    for (const [key, value] of Object.entries({ BANK_HISTORY_API_TOKEN: oldEnv.token, DONATION_BANK_CODE: oldEnv.code, DONATION_ACCOUNT_NUMBER: oldEnv.account, DONATION_ACCOUNT_NAME: oldEnv.name })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("pending QR confirms from matching API history and reports upstream failure separately", async (t) => {
  const oldEnv = {
    token: process.env.BANK_HISTORY_API_TOKEN,
    code: process.env.DONATION_BANK_CODE,
    account: process.env.DONATION_ACCOUNT_NUMBER,
    name: process.env.DONATION_ACCOUNT_NAME,
  };
  process.env.BANK_HISTORY_API_TOKEN = "a".repeat(32);
  process.env.DONATION_BANK_CODE = "970422";
  process.env.DONATION_ACCOUNT_NUMBER = account;
  process.env.DONATION_ACCOUNT_NAME = "TEST ACCOUNT";
  try {
    const confirm = t.mock.method(repositories.donations, "confirmBankTransfer", async () => ({ ...pending, status: "success" as const }));
    const fetchMock = (async () => Response.json({ status: "success", TranList: [
      bankRow({ accountNo: "other" }), bankRow({ creditAmount: "20000" }), bankRow(),
    ] })) as typeof fetch;
    const checked = await donationService.refreshQrPayment(pending, fetchMock);
    assert.equal(checked.donation.status, "success");
    assert.equal(confirm.mock.callCount(), 1);
    assert.deepEqual(confirm.mock.calls[0].arguments, [ref, 50000, "DVC_BANK123456789012", "970422"]);

    const unavailable = await donationService.refreshQrPayment(pending, (async () => Response.json({ status: 99 })) as typeof fetch);
    assert.equal(unavailable.donation.status, "pending");
    assert.equal(unavailable.verificationUnavailable, true);
    assert.equal(confirm.mock.callCount(), 1);
  } finally {
    for (const [key, value] of Object.entries({ BANK_HISTORY_API_TOKEN: oldEnv.token, DONATION_BANK_CODE: oldEnv.code, DONATION_ACCOUNT_NUMBER: oldEnv.account, DONATION_ACCOUNT_NAME: oldEnv.name })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("status endpoint accepts the new short QR reference", async (t) => {
  t.mock.method(repositories.donations, "getByTxnRef", async () => pending);
  t.mock.method(donationService, "refreshQrPayment", async () => ({ donation: pending, verificationUnavailable: false }));
  const response = await GET(new Request(`http://localhost/api/donations/status/${ref}`), { params: Promise.resolve({ txnRef: ref }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.status, "pending");
});
