import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  args: ["--host-resolver-rules=MAP ataimo.com 20.229.210.201"],
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto("https://ataimo.com/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    const header = page.locator(".site-header");
    const waitOffset = async (expected) =>
      page.waitForFunction(
        (v) =>
          parseFloat(
            document
              .querySelector(".site-header")
              .style.getPropertyValue("--header-scroll-offset"),
          ) === v,
        expected,
      );
    await waitOffset(0);
    await page.evaluate(() => window.scrollTo(0, 20));
    await waitOffset(width < 901 ? 20 : 0);
    await page.waitForTimeout(350);
    assert.equal(
      await header.evaluate((e) =>
        parseFloat(e.style.getPropertyValue("--header-scroll-offset")),
      ),
      width < 901 ? 20 : 0,
    );
    await page.evaluate(() => window.scrollBy(0, 20));
    await waitOffset(width < 901 ? 40 : 0);
    await page.evaluate(() => window.scrollBy(0, -12));
    await waitOffset(width < 901 ? 28 : 0);
    await page.evaluate(() => window.scrollTo(0, 500));
    if (width > 900) {
      assert.equal(
        await header.evaluate((e) => getComputedStyle(e).transform),
        "none",
      );
      assert.ok((await header.boundingBox()).y >= 0);
    } else {
      await page.waitForFunction(
        () =>
          document.querySelector(".site-header").dataset.scrollHidden ===
          "true",
      );
      await page.evaluate(() => window.scrollBy(0, -200));
      await waitOffset(0);
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page.evaluate(() => window.scrollBy(0, 200));
      await waitOffset(0);
      await page.keyboard.press("Escape");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => window.scrollBy(0, 100));
      await waitOffset(0);
    }
    await context.close();
  }
  console.log(
    "Live HTTPS verified: desktop header stationary; mobile distance-tracking, immediate reversal, stopped-scroll stability, open-menu access and reduced-motion behavior passed.",
  );
} finally {
  await browser.close();
}
