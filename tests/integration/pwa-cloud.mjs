import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  args: ["--host-resolver-rules=MAP ataimo.com 20.229.210.201"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("https://ataimo.com/portal");
  await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("Service worker timeout")), 10000),
      ),
    ]),
  );
  const cdp = await context.newCDPSession(page);
  const checks = await cdp.send("Page.getInstallabilityErrors");
  assert.deepEqual(checks.installabilityErrors, []);
  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return response.json();
  });
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/portal");
  assert.deepEqual(await page.evaluate(() => caches.keys()), []);
  await page.reload();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.match(await page.locator("h1").textContent(), /offline/);
  console.log(
    "Live HTTPS PWA: Chromium installability, manifest, service-worker registration, empty private cache and offline recovery passed.",
  );
  await context.close();
} finally {
  await browser.close();
}
