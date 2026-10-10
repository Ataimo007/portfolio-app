import { expect, test } from "@playwright/test";
import { durationEnd, durationLabel } from "../lib/consultation-duration";

test("duration calculations preserve calendar months and exact units", () => {
  expect(durationEnd("2026-01-31T10:00:00Z", 1, "months")).toBe(
    "2026-02-28T10:00:00.000Z",
  );
  expect(durationEnd("2028-01-31T10:00:00Z", 1, "months")).toBe(
    "2028-02-29T10:00:00.000Z",
  );
  expect(durationEnd("2026-10-15T10:00:00Z", 2, "weeks")).toBe(
    "2026-10-29T10:00:00.000Z",
  );
  expect(durationLabel("2026-10-15T10:00:00Z", "2026-10-15T12:00:00Z")).toBe(
    "2 hours",
  );
});

test("tabs lead the overview and status filters work in both views", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/portal", (r) =>
    r.fulfill({
      json: {
        user: {
          clientId: "fixture",
          name: "Alex",
          email: "alex@example.invalid",
          timezone: "UTC",
          company: "",
          phone: "",
          roles: ["owner"],
          isOwner: true,
        },
        jobs: [],
        slots: [],
        notifications: [],
        reserved: [],
      },
    }),
  );
  await page.route("**/api/portal/conversations", (r) =>
    r.fulfill({ json: { conversations: [] } }),
  );
  await page.goto("/portal");
  await expect(
    page.getByRole("tab", { name: "Account", exact: true }),
  ).toBeVisible();
  const filter = page.getByLabel("Engagement status");
  await expect(filter).toBeVisible();
  await page.screenshot({
    path: `.impeccable/review/overview-${test.info().project.name}.png`,
    fullPage: true,
  });
  await filter.selectOption("active");
  await expect(filter).toHaveValue("active");
  await expect(
    page.getByRole("button", { name: "All work", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".workspace-navigation")).toBeVisible();
  expect(
    await page
      .locator(".workspace-navigation")
      .evaluate((el) =>
        Boolean(
          el.compareDocumentPosition(
            document.querySelector(".portal-heading")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Consultations", exact: true }).click();
  await expect(filter).toHaveValue("active");
  await expect(page.locator(".portal-heading")).toHaveCount(0);
  await page.getByLabel("Preset", { exact: true }).selectOption("1:weeks");
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Unit", { exact: true })).toHaveValue("weeks");
  await page.getByLabel("Amount", { exact: true }).fill("3");
  await expect(page.getByLabel("Preset", { exact: true })).toHaveValue(
    "custom",
  );
  await page.screenshot({
    path: `.impeccable/review/consultations-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("main navigation exposes Profile and a logout link with a POST form", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  await page.goto("/privacy");
  const toggle = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    nav.getByRole("link", { name: "Profile", exact: true }),
  ).toHaveAttribute("href", "/portal?view=accounts");
  await expect(
    nav.getByRole("link", { name: "Log out", exact: true }),
  ).toBeVisible();
  await expect(nav.locator(".navigation-signout")).toHaveAttribute(
    "method",
    "post",
  );
  await expect(
    nav.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
});

test("clients request a custom duration within October and reserved times stay unavailable", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-10T08:00:00Z"));
  const windowId = "10000000-0000-4000-8000-000000000002";
  let submitted: Record<string, unknown> = {};
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/portal", (r) =>
    r.fulfill({
      json: {
        user: {
          clientId: "fixture",
          name: "Alex",
          email: "alex@example.invalid",
          timezone: "UTC",
          company: "",
          phone: "",
          roles: ["client"],
          isOwner: false,
        },
        jobs: [],
        slots: [
          {
            id: windowId,
            starts_at: "2026-10-01T00:00:00Z",
            ends_at: "2026-11-01T00:00:00Z",
          },
        ],
        reserved: [
          {
            starts_at: "2026-10-20T10:00:00Z",
            ends_at: "2026-10-20T12:00:00Z",
          },
        ],
        notifications: [],
      },
    }),
  );
  await page.route("**/api/portal/conversations", (r) =>
    r.fulfill({ json: { conversations: [] } }),
  );
  await page.route("**/api/portal/actions", (r) => {
    submitted = r.request().postDataJSON();
    return r.fulfill({ json: { message: "Consultation requested." } });
  });
  await page.goto("/portal");
  await page.getByRole("tab", { name: "Consultations", exact: true }).click();
  await page.getByLabel("Preset", { exact: true }).selectOption("2:hours");
  await page
    .getByRole("button", { name: "October 20, available slots", exact: true })
    .click();
  await expect(
    page
      .locator(".portal-times")
      .getByRole("button", { name: "10:00 AM", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".portal-times")
    .getByRole("button", { name: "12:00 PM", exact: true })
    .click();
  await page
    .getByLabel("What would you like to work on?")
    .fill("API architecture review");
  await page
    .getByLabel("A little context")
    .fill("Review API architecture and production deployment options.");
  await page
    .getByRole("button", { name: "Request consultation", exact: true })
    .click();
  await expect.poll(() => submitted.duration).toBe(2);
  expect(submitted.durationUnit).toBe("hours");
  expect(submitted.startsAt).toBe("2026-10-20T12:00:00.000Z");
  expect(submitted.slotId).toBe(windowId);
});
