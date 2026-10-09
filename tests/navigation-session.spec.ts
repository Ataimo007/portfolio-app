import { expect, test } from "@playwright/test";

test("navigation follows session changes without exposing identity data", async ({
  page,
}) => {
  let authenticated = false;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { authenticated } }),
  );
  await page.goto("/privacy");
  const mobile = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.click();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: "Login", exact: true }),
  ).toHaveAttribute("href", "/login");
  authenticated = true;
  await navigation.getByRole("link", { name: "Contact Me" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  if (await mobile.isVisible()) await mobile.click();
  await expect(
    navigation.getByRole("link", { name: "Profile", exact: true }),
  ).toHaveAttribute("href", "/portal");
  authenticated = false;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    navigation.getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
});

test("unavailable session status keeps an account recovery link", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/terms");
  const mobile = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.click();
  const account = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Account", exact: true });
  await expect(account).toHaveAttribute("href", "/portal");
  await expect(account).toHaveAttribute("title", /temporarily unavailable/);
  await expect(account).not.toHaveAttribute("aria-busy", "true");
});
