import { test, expect } from "@playwright/test";
test("resume contacts, updated certification and career controls are usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/resume");
  await expect(page.locator("main")).not.toContainText("edemataimo@gmail.com");
  await expect(
    page.getByRole("heading", { name: "DevOps Engineer Expert", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".certification-card")
      .filter({ hasText: "DevOps Engineer Expert" })
      .locator("time"),
  ).toHaveAttribute("datetime", "2021-11");
  await expect(page.locator(".resume-platform-project")).toHaveCSS(
    "margin-top",
    "48px",
  );
  await page.goto("/about");
  await page
    .getByRole("button", { name: /2016.*2019.*Software development/ })
    .click();
  await expect(page.locator("#career-detail")).toContainText(
    "Logic Gate Ventures",
  );
  await page
    .getByRole("button", {
      name: /2025.*Present.*Customer success engineering/,
    })
    .click();
  await expect(page.locator("#career-detail")).toContainText("EMEA");
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: "Send me a message." }),
  ).toBeVisible();
  await expect(
    page.locator("main").getByRole("link", { name: "contact@ataimo.com" }),
  ).toHaveAttribute("href", "mailto:contact@ataimo.com");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
