import { test, expect } from "@playwright/test";
test("signed-in notification inbox supports unread, navigation, error and empty states", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  let read = false;
  await page.route("**/api/notifications", (r) => {
    if (r.request().method() === "POST") {
      read = true;
      return r.fulfill({ json: { message: "Read" } });
    }
    return r.fulfill({
      json: {
        unread: read ? 0 : 1,
        notifications: [
          {
            id: "b079e153-b809-4607-bb0e-d2ca1bdc7bce",
            kind: "booking.approved",
            title: "Architecture review",
            created_at: new Date().toISOString(),
            read_at: read ? new Date().toISOString() : null,
            url: "/portal?job=b079e153-b809-4607-bb0e-d2ca1bdc7bce",
          },
        ],
      },
    });
  });
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "Notifications, 1 unread", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Your notifications" }),
  ).toBeVisible();
  await expect(
    page.getByText("Consultation booked", { exact: true }),
  ).toBeVisible();
  const box = await page.locator(".notification-panel").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  expect(read).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Your notifications" }),
  ).not.toBeVisible();
  await page.route("**/api/notifications", (r) =>
    r.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.locator(".notification-panel").getByRole("alert"),
  ).toContainText("temporarily unavailable");
  await page.route("**/api/notifications", (r) =>
    r.fulfill({ json: { notifications: [], unread: 0 } }),
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("You’re all caught up.", { exact: false }),
  ).toBeVisible();
});
test("anonymous users do not see notification controls and email preferences require a token", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: false } }),
  );
  await page.goto("/email-preferences");
  await expect(
    page.getByRole("heading", { name: "Email preferences" }),
  ).toBeVisible();
  await expect(page.locator(".notification-center")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unsubscribe from emails" }),
  ).toHaveCount(0);
  await page.goto("/email-preferences?token=" + "a".repeat(64));
  await expect(
    page.getByRole("button", { name: "Unsubscribe from emails" }),
  ).toBeVisible();
});
