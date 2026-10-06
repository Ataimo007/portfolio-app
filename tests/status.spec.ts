import { test, expect } from "@playwright/test";
const components = [
  "portfolio",
  "postgres",
  "keycloak",
  "redpanda",
  "grafana",
  "prometheus",
  "worker",
];
const snapshot = (generatedAt: string) => ({
  schemaVersion: 1,
  mode: "live",
  environment: "local-kind",
  generatedAt,
  staleAfterSeconds: 120,
  overall: "unknown",
  components: components.map((id) => ({ id, state: "unknown" })),
});
test("status outage shows recovery without fictional health", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({
      status: 503,
      json: { mode: "unavailable", error: "Telemetry source unavailable" },
    }),
  );
  await page.goto("/status");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Live status is temporarily unavailable" }),
  ).toContainText("Live status is temporarily unavailable");
  await expect(page.getByText("healthy", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
});
test("status marks an old snapshot stale and readings unknown", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot("2000-01-01T00:00:00.000Z") }),
  );
  await page.goto("/status");
  await expect(page.getByText("Stale snapshot", { exact: true })).toBeVisible();
  await expect(
    page.locator(".portal-status-list [data-state=unknown]"),
  ).toHaveCount(7);
});
test("status missing samples remain unknown with no invented replica counts", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot(new Date().toISOString()) }),
  );
  await page.goto("/status");
  await expect(page.getByText("PostgreSQL", { exact: true })).toBeVisible();
  await expect(
    page.locator(".portal-status-list [data-state=unknown]"),
  ).toHaveCount(7);
  await expect(page.getByText(/\d+ \/ \d+ ready/)).toHaveCount(0);
});
test("anonymous client portal explains registration and approval", async ({
  page,
}) => {
  await page.goto("/portal");
  await expect(
    page
      .locator(".portal-login")
      .getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/confirmed after Ataimo reviews/)).toBeVisible();
  await expect(
    page.locator(".portal-login").getByRole("link", { name: "Sign up" }),
  ).toBeVisible();
});

test("cloud telemetry identifies Azure without calling it a local cluster", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({
      status: 200,
      json: { ...snapshot(new Date().toISOString()), environment: "azure-k3s" },
    }),
  );
  await page.goto("/status");
  await expect(page.getByText(/Azure K3s/)).toBeVisible();
  await expect(page.getByText(/local Kind/)).toHaveCount(0);
});
