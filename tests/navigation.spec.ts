import { test, expect } from "@playwright/test";
test("four-entry navigation supports portfolio disclosure and resume download", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.goto("/");
  const mobile = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.locator(":scope > a")).toHaveText([
    "Home",
    "Contact Us",
    "Login",
  ]);
  await expect(
    nav.getByRole("link", { name: "Portal", exact: true }),
  ).toHaveCount(0);
  const trigger = nav.locator("summary");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    nav.getByRole("link", { name: "Experience", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(nav.locator("details")).not.toHaveAttribute("open", "");
  await trigger.click();
  await nav.getByRole("link", { name: "Resume", exact: true }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(
    page.locator("main").getByRole("link", { name: "Download Resume" }),
  ).toBeVisible();
  await expect(
    page.locator(".site-header").getByRole("link", { name: "Download Resume" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("literal contact details remain accessible in the shared header", async ({
  page,
}) => {
  for (const path of ["/", "/projects", "/contact"]) {
    await page.goto(path);
    const contact = page.getByRole("group", { name: "Direct contact" });
    await expect(
      contact.getByRole("link", { name: "contact@ataimo.com", exact: true }),
    ).toBeVisible();
    await expect(
      contact.getByRole("link", { name: "+234 816 0594 893", exact: true }),
    ).toHaveAttribute("href", "tel:+2348160594893");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("contact callout is legible and header retains its compact height", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const header = await page.locator(".site-header").boundingBox();
  const contact = await page.locator(".header-contact").boundingBox();
  expect(header!.height).toBeLessThanOrEqual(
    info.project.name === "desktop" ? 84 : 144,
  );
  if (info.project.name === "desktop")
    expect(contact!.x).toBeLessThan(header!.x + header!.width / 2);
  else {
    const toggle = await page
      .locator(".mobile-navigation-toggle")
      .boundingBox();
    expect(contact!.x + contact!.width).toBeLessThanOrEqual(toggle!.x);
    await expect(page.locator(".mobile-navigation-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  await page.locator("#connect").scrollIntoViewIfNeeded();
  const values = await page.locator("#connect").evaluate((section) => {
    const luminance = (color: string) => {
      const channels = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          const n = v / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const background = luminance(getComputedStyle(section).backgroundColor);
    return [
      ...section.querySelectorAll(".contact-services, .public-contact-links a"),
    ].map((element) => {
      const style = getComputedStyle(element),
        foreground = luminance(style.color);
      return {
        ratio:
          (Math.max(background, foreground) + 0.05) /
          (Math.min(background, foreground) + 0.05),
        opacity: style.opacity,
        size: parseFloat(style.fontSize),
      };
    });
  });
  expect(values).toHaveLength(3);
  for (const value of values) {
    expect(value.ratio).toBeGreaterThanOrEqual(4.5);
    expect(value.opacity).toBe("1");
    expect(value.size).toBeGreaterThanOrEqual(16);
  }
});
