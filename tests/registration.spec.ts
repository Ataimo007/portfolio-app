import { test, expect } from "@playwright/test";
import { createChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
test("signup verifies a challenge and preserves desktop/mobile form layout", async ({
  page,
}) => {
  const challenge = await createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: 1,
    counter: 5,
    deriveKey,
    expiresAt: new Date(Date.now() + 300000),
    hmacSignatureSecret: "s".repeat(64),
    hmacKeySignatureSecret: "k".repeat(64),
    data: { id: "fixture" },
  });
  await page.route("**/api/auth/registration/challenge", (r) =>
    r.fulfill({ json: challenge }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/auth/registration", async (r) => {
    submitted = r.request().postDataJSON();
    await r.fulfill({
      json: { message: "Check your inbox to verify your email." },
    });
  });
  await page.goto("/signup");
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Client");
  await page
    .getByLabel("Email", { exact: true })
    .fill("fixture@example.invalid");
  await page.waitForFunction(() =>
    Boolean(
      document.querySelector("altcha-widget") &&
      customElements.get("altcha-widget"),
    ),
  );
  await page.locator("altcha-widget").evaluate(async (e) => {
    await (e as HTMLElement & { verify: () => Promise<unknown> }).verify();
  });
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `.impeccable/review/signup-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Check your inbox" }),
  ).toBeVisible();
  expect(submitted?.action).toBe("signup");
  expect(submitted).not.toHaveProperty("password");
  expect(submitted?.altcha).toEqual(expect.any(String));
  const payload = JSON.parse(
    Buffer.from(submitted?.altcha as string, "base64").toString(),
  );
  expect(payload.solution).toBeTruthy();
  await page
    .getByRole("button", { name: "Resend a verification email" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your email", exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
});
