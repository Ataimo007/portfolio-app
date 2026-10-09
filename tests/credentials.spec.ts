import { test, expect } from "@playwright/test";
import { certifications } from "../content/site";

test("credential cards navigate to earned records with supplied identifiers and dates", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const credential of certifications) {
    await page.goto("/resume");
    const card = page
      .locator(".certification-card")
      .filter({ hasText: credential.title });
    await expect(card.locator("time")).toHaveText(
      `Issued ${credential.issued}`,
    );
    await card
      .getByRole("link", {
        name: `${credential.title} credential details`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/certifications/${credential.slug}$`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      credential.title,
    );
    await expect(page.locator("main")).toContainText(credential.credentialId);
    await expect(page.locator("main")).toContainText(
      credential.certificationNumber,
    );
    await expect(page.locator(".credential-information time")).toHaveAttribute(
      "datetime",
      credential.earnedDate,
    );
    await expect(page.locator(".credential-information time")).toHaveText(
      credential.earned,
    );
    await expect(page.locator(".credential-emblem img")).toHaveAttribute(
      "src",
      new RegExp(credential.badge),
    );
    await expect(page.locator("main")).not.toContainText(
      /expir|active status|currently valid/i,
    );
    await expect(page.locator(".credential-skills li")).toHaveCount(
      credential.skills.length,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Back to résumé" }).click();
    await expect(page).toHaveURL(/\/resume$/);
  }
  const unknown = await request.get("/certifications/not-a-credential");
  expect(unknown.status()).toBe(404);
});
