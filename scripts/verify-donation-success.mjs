import { chromium } from "playwright";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

function imageStats(first, second, region) {
  const a = PNG.sync.read(first);
  const b = PNG.sync.read(second);
  let colored = 0;
  let changed = 0;
  for (let y = region.top; y < region.bottom; y += 4) {
    for (let x = region.left; x < region.right; x += 4) {
      const i = (y * a.width + x) * 4;
      const colorSpread = Math.max(a.data[i], a.data[i + 1], a.data[i + 2]) - Math.min(a.data[i], a.data[i + 1], a.data[i + 2]);
      if (colorSpread > 30) colored++;
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 25) changed++;
    }
  }
  return { colored, changed };
}

try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }, { name: "narrow", width: 320, height: 740 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/donations", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      requests.push("create");
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: {
        donationId: "visual-test", txnRef: "TQ123456789ABCDEF0", amount: 50000, method: "qr",
        paymentUrl: "", qrImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
      } }) });
    });
    await page.route("**/api/donations/status/**", (route) => { requests.push("status"); return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { status: "success", amount: 50000 } }) }); });
    await page.goto(`${process.env.DONATION_VISUAL_BASE_URL ?? "http://localhost:3000"}/ung-ho`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Số tiền khác"));
      return button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
    }, undefined, { timeout: 30000 });
    const accept = page.getByRole("button", { name: "Chấp nhận" });
    if (await accept.isVisible()) await accept.click();
    await page.getByRole("button", { name: /Số tiền khác/ }).click();
    await page.locator("#donate-amount").waitFor();
    await page.getByRole("button", { name: /50.000 ₫/ }).click();
    await page.getByRole("button", { name: /Tạo mã thanh toán/ }).click();
    const dialog = page.getByRole("dialog", { name: /Ủng hộ thành công/ });
    try {
      await dialog.waitFor({ timeout: 15000 });
    } catch (error) {
      console.log(JSON.stringify({ viewport: viewport.name, requests, errors, form: (await page.locator("#dong-gop").innerText()).slice(-1100) }));
      await writeFile(`scratch/donation-success-failed-${viewport.name}.png`, await page.screenshot());
      throw error;
    }
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[role="dialog"] canvas');
      return canvas && canvas.width > 100 && canvas.height > 100;
    });
    const first = await page.screenshot();
    await writeFile(`scratch/donation-success-${viewport.name}.png`, first);
    await page.waitForTimeout(550);
    const second = await page.screenshot();
    const region = viewport.name === "desktop"
      ? { left: 700, right: 1370, top: 100, bottom: 780 }
      : { left: 20, right: viewport.width - 20, top: 170, bottom: 490 };
    const stats = imageStats(first, second, region);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const canvas = await dialog.locator("canvas").evaluate((node) => ({ width: node.width, height: node.height }));
    await dialog.getByRole("button", { name: "Đóng xác nhận" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Xem xác nhận" }).click();
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Ủng hộ thêm" }).click();
    await dialog.waitFor({ state: "hidden" });
    const formVisible = await page.getByRole("button", { name: /Tạo mã thanh toán/ }).isVisible();
    assert.ok(stats.colored > 100, `${viewport.name}: 3D scene is blank`);
    assert.ok(stats.changed > 100, `${viewport.name}: 3D scene is not moving`);
    assert.equal(overflow, false, `${viewport.name}: horizontal overflow`);
    assert.equal(formVisible, true, `${viewport.name}: donation form did not reopen`);
    assert.deepEqual(errors, [], `${viewport.name}: browser errors`);
    console.log(JSON.stringify({ viewport: viewport.name, canvas, stats, overflow, formVisible, errors }));
    await page.close();
  }

  const fallbackPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await fallbackPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).startsWith("webgl") ? null : original.call(this, type, ...args);
    };
  });
  await fallbackPage.route("**/api/donations", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: {
    donationId: "visual-test", txnRef: "TQ123456789ABCDEF0", amount: 50000, method: "qr", paymentUrl: "", qrImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
  } }) }));
  await fallbackPage.route("**/api/donations/status/**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { status: "success", amount: 50000 } }) }));
  await fallbackPage.goto(`${process.env.DONATION_VISUAL_BASE_URL ?? "http://localhost:3000"}/ung-ho`, { waitUntil: "domcontentloaded" });
  await fallbackPage.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Số tiền khác"));
    return button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
  });
  await fallbackPage.getByRole("button", { name: /Tạo mã thanh toán/ }).click();
  const fallbackDialog = fallbackPage.getByRole("dialog", { name: /Ủng hộ thành công/ });
  await fallbackDialog.waitFor();
  const fallbackVisible = await fallbackDialog.locator('[class*="fallback"]').isVisible();
  await writeFile("scratch/donation-success-fallback.png", await fallbackPage.screenshot());
  await fallbackPage.keyboard.press("Escape");
  await fallbackDialog.waitFor({ state: "hidden" });
  assert.equal(fallbackVisible, true, "WebGL fallback is missing");
  console.log(JSON.stringify({ viewport: "webgl-disabled", fallbackVisible, escapeClosed: true }));
  await fallbackPage.close();
} finally {
  await browser.close();
}
