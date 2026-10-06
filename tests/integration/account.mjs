import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const base = "http://ataimo.com",
  issuer = "http://keycloak.ataimo.com";
const env = {
  ...process.env,
  KUBECONFIG: process.env.KUBECONFIG || "/home/node/.kube/ataimo-kind",
};
assert.equal(
  execFileSync("kubectl", ["config", "current-context"], {
    env,
    encoding: "utf8",
  }).trim(),
  "kind-portfolio",
);
const secret = JSON.parse(
  execFileSync(
    "kubectl",
    ["get", "secret", "keycloak-credentials", "-n", "identity", "-o", "json"],
    { env },
  ),
);
const response = await fetch(
  issuer + "/realms/master/protocol/openid-connect/token",
  {
    method: "POST",
    body: new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      username: "admin",
      password: Buffer.from(secret.data["admin-password"], "base64").toString(),
    }),
  },
);
assert.equal(response.status, 200);
const token = (await response.json()).access_token;
const kc = async (path, method = "GET") => {
  const result = await fetch(issuer + "/admin/realms/ataimo" + path, {
    method,
    headers: { Authorization: "Bearer " + token },
  });
  assert.ok(result.ok, "Identity maintenance request failed");
  const text = await result.text();
  return text ? JSON.parse(text) : null;
};
const username = "registration-verification-" + randomBytes(5).toString("hex");
const password = randomBytes(24).toString("base64url");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
try {
  await page.goto(base + "/login");
  await page.locator("#username").waitFor();
  assert.equal(
    await page
      .locator("body")
      .innerText()
      .then((text) => /keycloak/i.test(text)),
    false,
  );
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
  await page.getByText(/Invalid username or password/i).waitFor();
  await page.screenshot({
    path: "infra/local-kubernetes/.local/account-login-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/signup");
  await page.locator("#username").fill(username);
  await page.locator("#email").fill(username + "@example.invalid");
  await page.locator("#firstName").fill("Registration");
  await page.locator("#lastName").fill("Verification");
  await page.locator("#password").fill("short");
  await page.locator("#password-confirm").fill("short");
  await page.locator("input[type=submit],button[type=submit]").click();
  await page.getByText(/minimum (password )?length/i).waitFor();
  await page.locator("#password").fill(password);
  await page.locator("#password-confirm").fill(password);
  await page.screenshot({
    path: "infra/local-kubernetes/.local/account-signup-desktop.png",
    fullPage: true,
  });
  await page.locator("input[type=submit],button[type=submit]").click();
  await page.waitForURL(base + "/portal", { timeout: 30000 });
  const portal = await context.request.get(base + "/api/portal");
  assert.equal(portal.status(), 200);
  const user = (await portal.json()).user;
  assert.ok(user.roles.includes("client"));
  assert.equal(user.isOwner, false);
  const ownerAction = await context.request.post(base + "/api/portal/actions", {
    headers: { Origin: base },
    data: {
      action: "availability",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(ownerAction.status(), 403);
  const out = await context.request.post(base + "/api/auth/logout", {
    headers: { Origin: base },
    maxRedirects: 0,
  });
  assert.equal(out.status(), 303);
  await page.goto(out.headers()["location"]);
  await context.clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/login");
  await page.locator("#username").waitFor();
  await page.screenshot({
    path: "infra/local-kubernetes/.local/account-login-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  console.log(
    "Branded login, invalid credentials, registration validation, client-only provisioning, logout and mobile layout passed",
  );
} finally {
  await browser.close();
  const users = await kc("/users?username=" + username + "&exact=true");
  for (const user of users) {
    assert.match(user.id, /^[a-f0-9-]+$/i);
    execFileSync(
      "kubectl",
      [
        "exec",
        "-i",
        "-n",
        "database",
        "postgres-0",
        "--",
        "psql",
        "-U",
        "ataimo",
        "-d",
        "portfolio",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        env,
        input: "DELETE FROM client_profiles WHERE subject='" + user.id + "';",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    await kc("/users/" + user.id, "DELETE");
  }
  console.log("Synthetic registration account and profile removed");
}
