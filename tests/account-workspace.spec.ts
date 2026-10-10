import { expect, test } from "@playwright/test";
const clientId = "20000000-0000-4000-8000-000000000001";
const thread = "30000000-0000-4000-8000-000000000001";
async function fixture(page: import("@playwright/test").Page, owner = false) {
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/notifications", (r) =>
    r.fulfill({ json: { unread: 0, notifications: [] } }),
  );
  await page.route("**/api/portal", (r) =>
    r.fulfill({
      json: {
        user: {
          clientId,
          name: "Alex Morgan",
          email: "alex@example.invalid",
          timezone: "UTC",
          company: "Example",
          phone: "",
          roles: [owner ? "owner" : "client"],
          isOwner: owner,
        },
        jobs: [],
        slots: [],
        notifications: [
          { id: thread, title: "Test update", kind: "message.created" },
        ],
      },
    }),
  );
  await page.route("**/api/portal/conversations", (r) =>
    r.fulfill({
      json: {
        conversations: [
          {
            id: thread,
            client_id: clientId,
            name: "Alex Morgan",
            preview: "An architecture question",
          },
        ],
      },
    }),
  );
  await page.route("**/api/portal/conversations/" + thread + "?*", (r) =>
    r.fulfill({
      json: {
        messages: [
          {
            id: thread,
            sequence: "1",
            body: "**Architecture** with `Go`",
            created_at: "2026-10-10T12:00:00Z",
            sender_name: "Alex Morgan",
            mine: false,
          },
        ],
      },
    }),
  );
  await page.route("**/api/auth/account", (r) => {
    if (r.request().method() === "POST")
      return r.fulfill({ json: { message: "Personal information updated." } });
    return r.fulfill({
      json: {
        firstName: "Alex",
        lastName: "Morgan",
        hasPassword: false,
        sessions: [
          {
            id: thread,
            ip: "192.0.2.1",
            startedAt: "2026-10-10T12:00:00Z",
            lastAccess: "2026-10-10T12:30:00Z",
            current: true,
            applications: ["portfolio"],
          },
        ],
        linked: [
          { identityProvider: "google", userName: "alex@example.invalid" },
        ],
        providers: ["google", "github", "linkedin", "microsoft"],
      },
    });
  });
}
test("accounts remain in-app and confirmations dismiss automatically", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/portal?view=accounts");
  await expect(page.getByRole("tab", { name: "Account" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Your workspace", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Manage account" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Signed-in devices" }),
  ).toBeVisible();
  await expect(page.getByText("This device", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset password", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Linked accounts" }),
  ).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Alexandra");
  await page
    .getByRole("button", { name: "Update personal information" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Personal information updated." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Personal information updated." }),
  ).toHaveCount(0, { timeout: 8000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("chat opens directly for clients and supports safe formatting", async ({
  page,
}) => {
  await fixture(page);
  let sent = "";
  await page.route("**/api/portal/conversations/" + thread, (r) => {
    sent = r.request().postDataJSON().body;
    return r.fulfill({ json: { message: "Message saved." } });
  });
  await page.goto("/portal");
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(
    page.getByRole("heading", { name: "Your engagements" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Message Ataimo" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("log").locator("strong").filter({ hasText: "Architecture" }),
  ).toBeVisible();
  await page.getByLabel("Your message", { exact: true }).fill("Hello");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(page.getByLabel("Your message", { exact: true })).toHaveValue(
    "Hello**text**",
  );
  await page.getByRole("button", { name: "Send message" }).click();
  expect(sent).toBe("Hello**text**");
  await page.screenshot({
    path: `.impeccable/review/account-chat-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("owner has a client conversation list, combined inbox, and protected user management", async ({
  page,
}) => {
  await fixture(page, true);
  await page.route("**/api/portal/users?*", (r) => {
    if (new URL(r.request().url()).searchParams.has("id"))
      return r.fulfill({
        json: {
          user: {
            id: clientId,
            name: "Alex Morgan",
            email: "alex@example.invalid",
            enabled: true,
            status: "active",
          },
          sessions: [],
          events: [],
          jobs: [],
          activity: [],
          conversationId: thread,
        },
      });
    return r.fulfill({
      json: {
        users: [
          {
            id: clientId,
            name: "Alex Morgan",
            email: "alex@example.invalid",
            enabled: true,
            status: "active",
          },
        ],
        hasMore: false,
      },
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Recent updates" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByLabel("Message channel")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Private conversation", exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: /Alex Morgan An architecture question/ })
    .click();
  await expect(page.getByLabel("Your message", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Users", exact: true }).click();
  await page
    .getByRole("button", { name: /Alex Morgan alex@example.invalid active/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Disable account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close account" }),
  ).toBeVisible();
  await page.getByText("Permanently delete this user", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Permanently delete user" }),
  ).toBeDisabled();
  await page.screenshot({
    path: `.impeccable/review/account-users-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("installed iOS PWA hides all installation actions", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    }),
  );
  await fixture(page);
  await page.goto("/portal?view=accounts");
  const toggle = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  await expect(
    page.getByRole("link", { name: "Install app", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Install app", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("No account needed", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/install");
  await expect(
    page.getByRole("button", { name: "Install Ataimo", exact: true }),
  ).toHaveCount(0);
});
test("mobile workspace tabs stay at the bottom and desktop tabs stay in flow", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/portal");
  const tabs = page.getByRole("tablist", { name: "Workspace sections" });
  await expect(tabs).toBeVisible();
  expect(await tabs.evaluate((el) => getComputedStyle(el).position)).toBe(
    info.project.name === "mobile" ? "fixed" : "static",
  );
  await page.getByRole("tab", { name: "Account" }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `.impeccable/review/account-settings-${info.project.name}.png`,
    fullPage: true,
  });
});
