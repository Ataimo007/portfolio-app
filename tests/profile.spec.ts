import { test, expect } from "@playwright/test";

test("profile groups account settings and saves contact and timezone preferences", async ({
  page,
}) => {
  const user = {
    clientId: "profile-test",
    name: "Alex Morgan",
    email: "alex.morgan.with.a.long.address@example.com",
    company: "",
    phone: "",
    timezone: "UTC",
    roles: ["client"],
    isOwner: false,
  };
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/notifications", (r) =>
    r.fulfill({ json: { unread: 0, notifications: [] } }),
  );
  await page.route("**/api/portal", (r) =>
    r.fulfill({ json: { user, jobs: [], slots: [], notifications: [] } }),
  );
  await page.route("**/api/portal/conversations", (r) =>
    r.fulfill({ json: { conversations: [] } }),
  );
  await page.route("**/api/auth/account", (r) =>
    r.fulfill({
      json: {
        firstName: "Alex",
        lastName: "Morgan",
        hasPassword: true,
        sessions: [],
        linked: [],
        providers: ["google", "github"],
      },
    }),
  );
  let fail = false;
  await page.route("**/api/portal/actions", (r) => {
    if (fail)
      return r.fulfill({
        status: 503,
        json: { error: "Could not save your profile. Try again." },
      });
    const body = r.request().postDataJSON();
    expect(body.action).toBe("profile");
    Object.assign(user, {
      company: body.company,
      phone: body.phone,
      timezone: body.timezone,
    });
    return r.fulfill({ json: { message: "Profile updated." } });
  });
  await page.goto("/portal");
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your account." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage account" })).toHaveCount(
    0,
  );
  await page.getByLabel("Company or organization").fill("Example Studio");
  await page.getByLabel("Phone number").fill("+234 816 0594 893");
  await page
    .getByLabel("Time zone", { exact: true })
    .selectOption("Africa/Lagos");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile updated." }),
  ).toBeVisible();
  expect(user.timezone).toBe("Africa/Lagos");
  await expect(page.getByLabel("Company or organization")).toHaveValue(
    "Example Studio",
  );
  fail = true;
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not save" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "Your account." })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.impeccable/review/profile-${test.info().project.name}.png`,
    fullPage: true,
  });
});
