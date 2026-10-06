import { test, expect } from "@playwright/test";
const ids = [
  "portfolio",
  "postgres",
  "keycloak",
  "redpanda",
  "grafana",
  "prometheus",
  "worker",
];
const snapshot = (generatedAt = new Date().toISOString()) => ({
  schemaVersion: 1,
  mode: "live",
  environment: "azure-k3s",
  generatedAt,
  staleAfterSeconds: 120,
  overall: "healthy",
  components: ids.map((id) => ({ id, state: "healthy", ready: 1, desired: 1 })),
  telemetry: {
    source: "prometheus",
    cpuPercent: 18.2,
    memoryPercent: 62.1,
    memoryUsedBytes: 5 * 2 ** 30,
    memoryTotalBytes: 8 * 2 ** 30,
    podsRunning: 27,
    uptimeSeconds: 90000,
  },
});
test("platform exposes measured resources and the complete mail path", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot() }),
  );
  await page.goto("/platform");
  await expect(
    page.getByText("Live data · Prometheus", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("18.2%", { exact: true })).toBeVisible();
  await expect(page.getByText("62.1%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "SMTP2GO", exact: true }).click();
  await expect(page.locator("figcaption")).toContainText(
    "Outbound mail relay over TLS 587",
  );
  await expect(page.getByText(/Port 22 is SSH/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("stale or missing telemetry never appears live", async ({ page }) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot("2000-01-01T00:00:00.000Z") }),
  );
  await page.goto("/platform");
  await expect(page.getByText(/Stale measurements/)).toBeVisible();
  await expect(
    page.locator(".telemetry-metrics dd").filter({ hasText: "Unavailable" }),
  ).toHaveCount(4);
  await expect(page.getByText("18.2%", { exact: true })).toHaveCount(0);
});
test("source outage supports recovery without invented metrics", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/platform/status", (route) =>
    route.fulfill(failed ? { status: 503, json: {} } : { json: snapshot() }),
  );
  await page.goto("/platform");
  await expect(page.getByText(/Connection unavailable/)).toBeVisible();
  failed = false;
  await page
    .getByRole("button", { name: "Refresh infrastructure telemetry" })
    .click();
  await expect(
    page.getByText("Live data · Prometheus", { exact: true }),
  ).toBeVisible();
});
test("homepage retains an accessible architecture with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot() }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The portfolio is/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Ataimo platform infrastructure" }),
  ).toBeVisible();
  await expect(page.getByTestId("webgl-scene")).toHaveCount(0);
});
test("layered architecture separates private services and external relay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: snapshot() }),
  );
  await page.goto("/platform");
  const diagram = page.locator(".platform-diagram svg");
  await expect(diagram.locator('[data-layer="2"]')).toHaveCount(5);
  await expect(diagram.locator('[data-layer="3"]')).toHaveCount(4);
  await expect(
    diagram.locator('[data-from="gateway"][data-to="console"]'),
  ).toHaveCount(1);
  await expect(
    diagram.locator('[data-from="gateway"][data-to="events"]'),
  ).toHaveCount(0);
  await expect(
    diagram.locator('[data-from="mail"][data-to="relay"]'),
  ).toHaveAttribute("marker-end", /external/);
  await expect(
    diagram.getByText("ONE AZURE VM", { exact: true }),
  ).toBeVisible();
  await expect(diagram.getByText("Not hosted on the Azure VM")).toBeVisible();
  await expect(page.locator(".platform-routes")).toContainText(
    "mail.ataimo.com",
  );
  await expect(page.locator(".platform-routes")).toContainText(
    "webmail.ataimo.com",
  );
  const logos = await diagram
    .locator("image")
    .evaluateAll(async (images) =>
      Promise.all(
        images.map(
          async (image) => (await fetch(image.getAttribute("href")!)).ok,
        ),
      ),
    );
  expect(logos.every(Boolean)).toBe(true);
  expect(
    await diagram
      .locator("[data-signal]")
      .first()
      .evaluate((el) => getComputedStyle(el).visibility),
  ).toBe("hidden");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".platform-diagram-scroll")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
});
const podSnapshot = () => ({
  ...snapshot(),
  telemetry: {
    ...snapshot().telemetry,
    pods: Array.from({ length: 7 }, (_, i) => ({
      name: `test-pod-${i}`,
      namespace: i % 2 ? "monitoring" : "app",
      phase: "Running",
      cpuMillicores: i * 10,
      memoryBytes: ((7 - i) * 2 ** 20) as number | null,
      ready: true,
      restarts: i,
    })),
  },
});
test("homepage ranks the top five CPU and memory consumers independently", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: podSnapshot() }),
  );
  await page.goto("/");
  const cpu = page.getByRole("region", { name: "Top 5 pods by CPU" });
  const memory = page.getByRole("region", { name: "Top 5 pods by memory" });
  await expect(cpu.locator("li")).toHaveCount(5);
  await expect(cpu.locator("li").first()).toContainText("test-pod-6");
  await expect(memory.locator("li").first()).toContainText("test-pod-0");
  await expect(
    page.getByRole("link", { name: "View all pod measurements" }),
  ).toHaveAttribute("href", "/platform#telemetry");
});
test("full pod view sorts and filters with missing measurements kept unavailable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixture = podSnapshot();
  fixture.telemetry.pods[0].memoryBytes = null;
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto("/platform#telemetry");
  const table = page.locator(".pod-table");
  await expect(table.locator("tbody tr")).toHaveCount(7);
  await expect(table.locator("tbody tr").first()).toContainText("test-pod-6");
  await table.getByRole("button", { name: /Memory/ }).click();
  await expect(table.locator("tbody tr").first()).toContainText("test-pod-1");
  await expect(table.locator("tbody tr").last()).toContainText("Unavailable");
  await page
    .getByLabel("Namespace", { exact: true })
    .selectOption("monitoring");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("stale pod readings disappear instead of being presented as live", async ({
  page,
}) => {
  await page.route("**/api/platform/status", (route) =>
    route.fulfill({
      json: { ...podSnapshot(), generatedAt: "2000-01-01T00:00:00.000Z" },
    }),
  );
  await page.goto("/platform");
  await expect(
    page.getByText("Pod measurements unavailable. Refresh to try again."),
  ).toBeVisible();
  await expect(page.locator(".pod-table")).toHaveCount(0);
});
test("public contact details are actionable on homepage and contact page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/contact"]) {
    await page.goto(path);
    await expect(
      page
        .locator("main")
        .getByRole("link", { name: "contact@ataimo.com", exact: true }),
    ).toHaveAttribute("href", "mailto:contact@ataimo.com");
    await expect(
      page
        .locator("main")
        .getByRole("link", { name: "+234 816 0594 893", exact: true }),
    ).toHaveAttribute("href", "tel:+2348160594893");
  }
});
