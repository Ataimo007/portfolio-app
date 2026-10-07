import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--host-resolver-rules=MAP ataimo.com 20.229.210.201",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("https://ataimo.com/");
  const canvas = page.locator(
    '.scroll-architecture-scene canvas[data-ready="true"]',
  );
  await canvas.waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await page.locator(".topology").isVisible(), false);
  await canvas.evaluate((e) => (e.dataset.continuity = "live-mobile"));
  assert.ok(
    await canvas.evaluate((e) => Math.abs(e.width - e.clientWidth) <= 1),
  );
  await page.screenshot({
    path: ".impeccable/review/mobile-architecture-hero-live.png",
  });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(800);
  assert.equal(await canvas.getAttribute("data-continuity"), "live-mobile");
  await page.screenshot({
    path: ".impeccable/review/mobile-architecture-scroll-live.png",
  });
  await page.locator(".contact-callout").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  assert.match(
    await page
      .locator(".contact-callout")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    /0\.84|84%/,
  );
  await page.screenshot({
    path: ".impeccable/review/contact-translucent-mobile-live.png",
  });
  for (const route of ["/projects", "/contact", "/portal", "/install"]) {
    await page.goto(`https://ataimo.com${route}`);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForFunction(
      () =>
        document.querySelector(".site-header").dataset.scrollHidden === "true",
    );
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForFunction(
      () =>
        document.querySelector(".site-header").dataset.scrollHidden === "false",
    );
    await page.waitForTimeout(260);
    const box = await page.locator(".site-header").boundingBox();
    assert.ok(box.y >= 0 && box.y <= 16);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const trigger = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    await trigger.click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    assert.equal(
      await nav
        .getByRole("link", { name: "Install app", exact: true })
        .isVisible(),
      true,
    );
    assert.equal(
      await nav.getByRole("link", { name: "Login", exact: true }).isVisible(),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  }
  await page
    .getByRole("button", { name: "Install Ataimo", exact: true })
    .click();
  assert.match(
    await page.getByRole("status").textContent(),
    /Add to Home Screen/,
  );
  await page.screenshot({
    path: ".impeccable/review/public-install-mobile-live.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("https://ataimo.com/");
  assert.equal(await page.locator(".topology").isVisible(), true);
  assert.equal(await page.locator(".scroll-architecture-scene").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Live mobile: real 3D canvas, scroll continuity, DPR limit, sticky navigation across five routes, anonymous installation and reduced-motion fallback passed.",
  );
  await context.close();
} finally {
  await browser.close();
}
