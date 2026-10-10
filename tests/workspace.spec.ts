import { test, expect } from "@playwright/test";
const id = "10000000-0000-4000-8000-000000000001";
const user = {
  clientId: id,
  name: "Test Client",
  email: "client@example.invalid",
  timezone: "UTC",
  company: "Example",
  phone: "",
  roles: ["client"],
  isOwner: false,
};
function data(owner = false) {
  return {
    user: { ...user, isOwner: owner, roles: owner ? ["owner"] : ["client"] },
    jobs: [
      {
        id,
        client_id: id,
        title: "API architecture review",
        description:
          "A controlled consultation fixture for responsive verification.",
        status: "booked",
        client_name: "Test Client",
        booking_id: id,
        booking_status: "approved",
        starts_at: "2026-11-12T12:00:00Z",
        ends_at: "2026-11-12T12:30:00Z",
        created_at: "2026-10-06T12:00:00Z",
        tasks: [{ id, title: "Review API boundaries", completed: false }],
        history: [],
      },
    ],
    slots: [],
    notifications: [],
  };
}
test("client and owner workspaces preserve mobile layout and private states", async ({
  page,
}) => {
  let owner = false;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { authenticated: true } }),
  );
  await page.route("**/api/portal", (route) =>
    route.fulfill({ json: data(owner) }),
  );
  await page.route("**/api/portal/conversations", (route) =>
    route.fulfill({
      json: {
        conversations: [
          { id, client_id: id, name: "Test Client", preview: "Hello Ataimo" },
        ],
      },
    }),
  );
  await page.route("**/api/portal/conversations/" + id + "?*", (route) =>
    route.fulfill({ json: { messages: [] } }),
  );
  await page.route("**/api/auth/account", (route) =>
    route.fulfill({
      json: {
        firstName: "Test",
        lastName: "Client",
        hasPassword: false,
        sessions: [],
        linked: [],
        providers: [],
      },
    }),
  );
  await page.route("**/api/portal/mail?*", (route) =>
    route.fulfill({
      json: {
        messages: [
          {
            uid: 1,
            uidValidity: "1",
            from: "Verification",
            subject: "Controlled mail fixture",
            date: "2026-10-06T12:00:00Z",
            unread: true,
          },
        ],
      },
    }),
  );
  await page.goto("/portal");
  await expect(
    page.getByRole("heading", { name: "Your workspace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mailbox", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Account" }).click();
  await expect(page.getByLabel("Company or organization")).toHaveValue(
    "Example",
  );
  await expect(
    page.getByRole("button", { name: "Enable notifications" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(
    page.getByRole("button", { name: "Message Ataimo" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Your message", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  owner = true;
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Consultancy workspace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start engagement" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  await page.getByLabel("Message channel").selectOption("mail");
  await expect(
    page.getByRole("heading", { name: "Your mailbox" }),
  ).toBeVisible();
  await expect(
    page.getByText("Controlled mail fixture", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("To", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.impeccable/review/workspace-mail-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("owner page rejects a client and PWA assets are valid", async ({
  page,
  request,
}) => {
  await page.route("**/api/portal", (route) => route.fulfill({ json: data() }));
  await page.route("**/api/portal/conversations", (route) =>
    route.fulfill({ json: { conversations: [] } }),
  );
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "This workspace is for the owner." }),
  ).toBeVisible();
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const value = await manifest.json();
  expect(value.display).toBe("standalone");
  expect(value.start_url).toBe("/portal");
  for (const icon of value.icons)
    expect((await request.get(icon.src)).status()).toBe(200);
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).not.toContain("caches.open");
});
