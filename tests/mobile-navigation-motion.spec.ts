import { test, expect } from "@playwright/test";
test("mobile navigation remains sticky, closes accessibly and exposes installation anonymously", async ({
  page,
}, info) => {
  if (info.project.name !== "mobile") return;
  test.setTimeout(90_000);
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: false } }),
  );
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type,
      ...args
    ) {
      if (type === "webgl2") return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const route of ["/", "/projects", "/contact", "/portal", "/install"]) {
    await page.goto(route);
    const trigger = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    await expect(trigger).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(page.locator(".site-header")).toHaveAttribute(
      "data-scroll-hidden",
      "true",
    );
    await page.evaluate(() => window.scrollBy(0, -200));
    await expect(page.locator(".site-header")).toHaveAttribute(
      "data-scroll-hidden",
      "false",
    );
    const header = await page.locator(".site-header").boundingBox();
    expect(header!.y).toBeGreaterThanOrEqual(0);
    expect(header!.y).toBeLessThanOrEqual(16);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await trigger.click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(
      nav.getByRole("link", { name: "Install app", exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Login", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Install app", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Install Ataimo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Install Ataimo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Add to Home Screen");
  await page.screenshot({
    path: ".impeccable/review/public-install-mobile.png",
    fullPage: true,
  });
});
test("mobile architecture stays mounted and moves through scrolling, with reduced-motion fallback", async ({
  page,
}, info) => {
  if (info.project.name !== "mobile") return;
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const canvas = page.locator(
    '.scroll-architecture-scene canvas[data-ready="true"]',
  );
  await expect(canvas).toBeVisible();
  await expect(page.locator(".topology")).toBeHidden();
  await canvas.evaluate((e) => e.setAttribute("data-continuity", "mobile"));
  expect(
    await canvas.evaluate((e) =>
      Math.abs((e as HTMLCanvasElement).width - e.clientWidth),
    ),
  ).toBeLessThanOrEqual(1);
  const hero = await page.screenshot({
    path: ".impeccable/review/mobile-hero-architecture.png",
  });
  await page.evaluate(() =>
    window.scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * 0.45,
      behavior: "instant",
    }),
  );
  await expect(canvas).toHaveAttribute("data-continuity", "mobile");
  await expect
    .poll(async () => !(await page.screenshot()).equals(hero))
    .toBe(true);
  await page.screenshot({
    path: ".impeccable/review/mobile-scroll-architecture.png",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveCount(0);
  await expect(page.locator(".topology-fallback")).toBeVisible();
});
test("installation prompt is captured before visiting the public installation page", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: false } }),
  );
  await page.goto("/privacy");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .locator("footer")
    .getByRole("link", { name: "Install app", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Install Ataimo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Installation requested",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("button", { name: "App installed", exact: true }),
  ).toBeDisabled();
});
