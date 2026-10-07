import { test, expect } from "@playwright/test";
test("header follows actual mobile scroll distance and remains stationary on desktop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/projects");
  const header = page.locator(".site-header");
  const offset = () =>
    header.evaluate((e) =>
      parseFloat(
        (e as HTMLElement).style.getPropertyValue("--header-scroll-offset"),
      ),
    );
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");
  await page.evaluate(() => window.scrollTo(0, 20));
  if (page.viewportSize()!.width > 900) {
    await expect.poll(offset).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(header).toHaveAttribute("data-scroll-hidden", "false");
    expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    return;
  }
  await expect.poll(offset).toBe(20);
  await page.waitForTimeout(350);
  expect(await offset()).toBe(20);
  await page.evaluate(() => window.scrollBy(0, 20));
  await expect.poll(offset).toBe(40);
  await page.evaluate(() => window.scrollBy(0, -12));
  await expect.poll(offset).toBe(28);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(header).toHaveAttribute("data-scroll-hidden", "true");
  await page.evaluate(() => window.scrollBy(0, -200));
  await expect.poll(offset).toBe(0);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.evaluate(() => window.scrollBy(0, 200));
  await expect.poll(offset).toBe(0);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollBy(0, 200));
  await expect.poll(offset).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.click(200, 300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(header).toHaveAttribute("data-scroll-hidden", "true");
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect.poll(offset).toBe(0);
  expect(await header.evaluate((e) => getComputedStyle(e).transform)).toBe(
    "none",
  );
});
