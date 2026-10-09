import { test, expect } from "@playwright/test";
import { projects, profile } from "../content/site";
import { validateContact } from "../lib/contact";
import {
  cameraBlend,
  cameraSegment,
} from "../components/scroll-camera-controller";
test("all main routes, keyboard access, project journeys and real resume", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  for (const name of [
    "About Me",
    "Experience",
    "Projects",
    "Expertise",
    "Resume",
    "Contact Me",
    "Home",
  ]) {
    const mobile = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    if (await mobile.isVisible()) await mobile.click();
    if (
      ["About Me", "Experience", "Projects", "Expertise", "Resume"].includes(
        name,
      )
    )
      await page.locator(".portfolio-menu > summary").click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { includeHidden: true })
        .getByRole("link", { name, exact: true, includeHidden: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.getByRole("link", { name: /Explore My Work/ }).click();
  for (const p of projects) {
    await page
      .getByRole("link", {
        name: new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await expect(page.locator("h1")).toHaveText(p.title);
    await expect(
      page.getByRole("link", {
        name: p.private ? "Explore public PoC" : "View repository",
      }),
    ).toHaveAttribute("href", p.url);
    if (p.private)
      await expect(
        page.getByText("Private source · Public PoC available.", {
          exact: false,
        }),
      ).toBeVisible();
    await page.getByRole("link", { name: "← All projects" }).click();
  }
  await expect(
    page.locator("footer").getByRole("link", { name: /GitHub/ }),
  ).toHaveAttribute("href", profile.github);
  await expect(
    page.locator("footer").getByRole("link", { name: /LinkedIn/ }),
  ).toHaveAttribute("href", profile.linkedin);
  await page.goto("/resume");
  const downloadPromise = page.waitForEvent("download");
  await page
    .locator("main")
    .getByRole("link", { name: "Download Resume" })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "ataimo-edem-resume.pdf",
  );
  const pdf = await request.get("/resume/ataimo-edem-resume.pdf");
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  expect(errors).toEqual([]);
});
test("contact validation and honest unconfigured response", async ({
  page,
  request,
  baseURL,
}) => {
  expect(
    validateContact({
      name: "Ada",
      email: "bad",
      company: "",
      message: "A useful conversation",
    }),
  ).toBeNull();
  expect(
    validateContact({
      name: " Ada ",
      email: "ada@example.test",
      company: "",
      message: "A useful conversation",
    })?.name,
  ).toBe("Ada");
  await page.goto("/contact");
  await page.getByRole("button", { name: /Send message/ }).click();
  await expect(page.getByRole("status")).toBeEmpty();
  await page.getByLabel("Name", { exact: true }).fill("Ada");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.test");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Discuss enterprise API architecture.");
  await page.getByRole("button", { name: /Send message/ }).click();
  await expect(page.getByRole("status")).toContainText(
    "Sending is not configured",
  );
  const invalid = await request.post("/api/contact", {
    headers: { origin: new URL(baseURL!).origin },
    data: { name: "", email: "bad", company: "", message: "" },
  });
  expect(invalid.status()).toBe(400);
  const cross = await request.post("/api/contact", {
    headers: { origin: "https://example.test" },
    data: {},
  });
  expect(cross.status()).toBe(403);
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: profile.phone, exact: true }),
  ).toHaveAttribute("href", profile.phoneHref);
});
test("responsive layout, reduced motion and WebGL degradation", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByTestId("webgl-scene")).toHaveCount(0);
  await expect(page.locator(".topology-fallback")).toBeVisible();
  for (const route of [
    "/",
    "/about",
    "/experience",
    "/projects",
    "/expertise",
    "/resume",
    "/contact",
    ...projects.map((p) => `/projects/${p.slug}`),
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }),
  );
  await page.goto("/");
  if (info.project.name === "desktop") {
    const canvas = page.locator('canvas[data-ready="true"]');
    await expect(canvas).toBeVisible();
    const first = await canvas.screenshot();
    await page.mouse.move(1100, 200);
    await expect
      .poll(async () => !(await canvas.screenshot()).equals(first))
      .toBe(true);
    await canvas.evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost")),
    );
    await expect(page.getByTestId("webgl-scene")).toHaveCount(0);
    await expect(page.locator(".topology-fallback")).toBeVisible();
  } else {
    await expect(page.getByTestId("webgl-scene")).toHaveCount(1);
  }
});
test("semantic content and navigation without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator("h1")).toBeVisible();
  await page.locator(".portfolio-menu > summary").click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await expect(page.locator("h1")).toBeVisible();
  await page
    .getByRole("link", {
      name: /Enterprise Developer Portal Migration Automation/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "The problem", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("email adapter handles unconfigured, successful and failed delivery without sending real email", async () => {
  const { sendContact } = await import("../lib/send-contact");
  const data = {
    name: "Ada",
    email: "ada@example.test",
    company: "Example",
    message: "A useful conversation.",
  };
  const originalFetch = globalThis.fetch;
  const saved = [
    process.env.RESEND_API_KEY,
    process.env.CONTACT_FROM,
    process.env.CONTACT_TO,
  ];
  try {
    delete process.env.RESEND_API_KEY;
    expect(await sendContact(data)).toBe("unconfigured");
    process.env.RESEND_API_KEY = "synthetic-test-key";
    process.env.CONTACT_FROM = "sender@example.test";
    process.env.CONTACT_TO = "recipient@example.test";
    globalThis.fetch = async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload.reply_to).toBe(data.email);
      expect(payload.text).toContain(data.message);
      return new Response("{}", { status: 200 });
    };
    expect(await sendContact(data)).toBe("sent");
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    await expect(sendContact(data)).rejects.toThrow("Delivery failed");
  } finally {
    globalThis.fetch = originalFetch;
    ["RESEND_API_KEY", "CONTACT_FROM", "CONTACT_TO"].forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  }
});

test("route demonstration switches analysis and output", async ({ page }) => {
  await page.goto("/projects/route-collision-analyzer");
  const demo = page.locator(".route-demo");
  await expect(demo.locator("pre")).not.toContainText("Order history");
  await page.getByLabel("Match mode").selectOption("broad");
  await expect(demo.locator("pre")).toContainText("Order history");
  await page.getByLabel("Output", { exact: true }).selectOption("JSON");
  expect(JSON.parse(await demo.locator("pre").innerText())).toHaveLength(3);
  await page.getByLabel("Output", { exact: true }).selectOption("CSV");
  await expect(demo.locator("pre")).toContainText("domain,path,name");
});

test("homepage motion responds to scrolling and respects reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const card = page.locator(".work-card").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-revealed", "true");
  await expect(card).toBeVisible();
  if (info.project.name === "desktop") {
    await page.mouse.move(200, 300);
    await expect
      .poll(() =>
        page
          .locator(".interactive-background")
          .evaluate((e) =>
            (e as HTMLElement).style.getPropertyValue("--pointer-x"),
          ),
      )
      .not.toBe("");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((e) => e.getAnimations().length))
    .toBe(0);
  await expect
    .poll(() =>
      page
        .locator(".interactive-background")
        .evaluate((e) =>
          (e as HTMLElement).style.getPropertyValue("--pointer-x"),
        ),
    )
    .toBe("");
  await expect(card).toBeVisible();
});

test("camera thresholds and damping are independent of refresh rate", () => {
  const settle = (hz: number) => {
    let value = 0;
    for (let i = 0; i < hz; i++) value += (1 - value) * cameraBlend(1 / hz);
    return value;
  };
  expect(settle(60)).toBeCloseTo(settle(140), 12);
  expect(cameraSegment(0).mix).toBe(0);
  expect(cameraSegment(0.3).mix).toBe(1);
  expect(cameraSegment(0.6).mix).toBe(0);
  expect(cameraSegment(0.8).mix).toBe(1);
});

test("persistent canvas follows scroll without remounting", async ({
  page,
}, info) => {
  if (info.project.name !== "desktop") return;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }),
  );
  await page.goto("/");
  const canvas = page.locator('canvas[data-ready="true"]');
  await expect(canvas).toHaveCount(1);
  await canvas.evaluate((element) =>
    element.setAttribute("data-continuity", "same"),
  );
  const hero = await canvas.screenshot();
  await page.evaluate(() =>
    window.scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * 0.45,
      behavior: "instant",
    }),
  );
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(hero))
    .toBe(true);
  await expect(canvas).toHaveAttribute("data-continuity", "same");
  await page.evaluate(() =>
    window.scrollTo({
      top: (document.documentElement.scrollHeight - innerHeight) * 0.9,
      behavior: "instant",
    }),
  );
  await page.locator(".contact-callout-content").scrollIntoViewIfNeeded();
  await expect(page.locator(".contact-callout-content")).toHaveAttribute(
    "data-revealed",
    "true",
  );
  await expect(canvas).toHaveAttribute("data-continuity", "same");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveCount(0);
});
