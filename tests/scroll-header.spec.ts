import { test, expect } from "@playwright/test";
test("header motion follows scroll direction and preserves keyboard and open-menu access", async ({
  page,
}) => {
  await page.goto("/projects");
  const header = page.locator(".site-header");
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");
  await page.evaluate(() => window.scrollTo(0, 500));
  if (page.viewportSize()!.width > 900) {
    await expect(header).toHaveAttribute("data-scroll-hidden", "false");
    expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    await page.goto("/");
    return;
  }
  await expect(header).toHaveAttribute("data-scroll-hidden", "true");
  await expect
    .poll(
      async () =>
        (await header.boundingBox())!.y + (await header.boundingBox())!.height,
    )
    .toBeLessThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, 460));
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");
  await expect
    .poll(async () => (await header.boundingBox())!.y)
    .toBeGreaterThanOrEqual(0);
  const toggle = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  else await page.locator(".portfolio-menu > summary").click();
  await page.evaluate(() => window.scrollTo(0, 650));
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await header.evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
  await page.goto("/");
  const callout = page.locator(".contact-callout");
  expect(
    await callout.evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toMatch(/0\.84|84%/);
});
