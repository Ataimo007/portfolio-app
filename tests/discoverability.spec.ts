import { test, expect } from "@playwright/test";
import { certifications, projects } from "../content/site";

test("public pages expose canonical metadata and connected structured data", async ({
  page,
  request,
}) => {
  await page.goto("/about");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://ataimo.com/about",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Tyk.*API platforms/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://ataimo.com/about",
  );
  const data = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const parsed = data.map((text) => JSON.parse(text));
  expect(
    parsed.some(
      (item) =>
        item["@type"] === "ProfilePage" &&
        item.mainEntity["@id"] === "https://ataimo.com/#person",
    ),
  ).toBe(true);
  expect(
    parsed.some((item) =>
      item["@graph"]?.some(
        (node: Record<string, string>) =>
          node["@type"] === "WebSite" && node.url === "https://ataimo.com/",
      ),
    ),
  ).toBe(true);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const project of projects)
    expect(sitemap).toContain(`https://ataimo.com/projects/${project.slug}`);
  for (const cert of certifications)
    expect(sitemap).toContain(`https://ataimo.com/certifications/${cert.slug}`);
  expect(sitemap).not.toMatch(/ataimoedem\.com|\/portal<|\/admin<|\/signup</);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://ataimo.com/sitemap.xml");
  await page.goto(`/projects/${projects[0].slug}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    `${projects[0].title} | Ataimo Edem`,
  );
  await page.goto("/account/verify");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const session = await request.get("/api/auth/session");
  expect(session.headers()["x-robots-tag"]).toBe(
    "noindex, nofollow, noarchive",
  );
});
