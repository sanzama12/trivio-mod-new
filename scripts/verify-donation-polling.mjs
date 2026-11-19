import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const times = [];
  await page.route("**/api/donations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      donationId: "poll-test", txnRef: "TQ123456789ABCDEF0", amount: 50000, method: "qr", paymentUrl: "",
      qrImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
    } }) });
  });
  await page.route("**/api/donations/status/**", (route) => {
    times.push(Date.now());
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: {
      status: times.length >= 3 ? "success" : "pending", verificationUnavailable: times.length === 1,
    } }) });
  });
  await page.goto(`${process.env.DONATION_VISUAL_BASE_URL || "http://localhost:3000"}/ung-ho`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const accept = page.getByRole("button", { name: "Chấp nhận" });
  if (await accept.isVisible()) await accept.click();
  await page.getByRole("button", { name: /Tạo mã thanh toán/ }).click();
  await page.getByText(/Chưa kết nối được dữ liệu xác nhận/).waitFor();
  assert.equal(await page.getByRole("button", { name: /Kiểm tra ngay|Đang kiểm tra/ }).count(), 0);
  await page.getByRole("dialog", { name: /Ủng hộ thành công/ }).waitFor({ timeout: 20000 });
  assert.equal(times.length, 3);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 4500, "Polling must wait five seconds");
  console.log("PASS: automatic five-second polling recovers from unavailable verification and confirms without a button");
} finally {
  await browser.close();
}
