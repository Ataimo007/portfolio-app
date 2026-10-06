import assert from "node:assert/strict";
import https from "node:https";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const root = process.cwd(),
  kubectl = root + "/infra/azure/.local/bin/kubectl",
  args = [
    "--kubeconfig",
    root + "/infra/azure/.local/kubeconfig",
    "--context",
    "ataimo-azure",
  ],
  suffix = randomBytes(6).toString("hex"),
  username = "workspace-sso-verification-" + suffix,
  password = randomBytes(24).toString("base64url");
const secret = JSON.parse(
  execFileSync(
    kubectl,
    [
      ...args,
      "get",
      "secret",
      "keycloak-credentials",
      "-n",
      "identity",
      "-o",
      "json",
    ],
    { encoding: "utf8" },
  ),
);
async function request(path, method = "GET", body, token, form = false) {
  return new Promise((resolve, reject) => {
    const content = body
      ? form
        ? new URLSearchParams(body).toString()
        : JSON.stringify(body)
      : null;
    const req = https.request(
      {
        hostname: "20.229.210.201",
        servername: "keycloak.ataimo.com",
        path,
        method,
        timeout: 15000,
        headers: {
          Host: "keycloak.ataimo.com",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(content
            ? {
                "Content-Type": form
                  ? "application/x-www-form-urlencoded"
                  : "application/json",
                "Content-Length": Buffer.byteLength(content),
              }
            : {}),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = {};
          }
          resolve({ status: res.statusCode, data });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(Error("Identity request timed out")));
    req.end(content);
  });
}
let id, browser, token;
try {
  const auth = await request(
    "/realms/master/protocol/openid-connect/token",
    "POST",
    {
      client_id: "admin-cli",
      grant_type: "password",
      username: "admin",
      password: Buffer.from(secret.data["admin-password"], "base64").toString(),
    },
    null,
    true,
  );
  assert.equal(auth.status, 200);
  token = auth.data.access_token;
  const created = await request(
    "/admin/realms/ataimo/users",
    "POST",
    {
      username,
      enabled: true,
      email: username + "@example.invalid",
      emailVerified: true,
      firstName: "Verification",
      lastName: "SSO",
      credentials: [{ type: "password", value: password, temporary: false }],
    },
    token,
  );
  assert.equal(created.status, 201);
  const lookup = await request(
    "/admin/realms/ataimo/users?username=" + username + "&exact=true",
    "GET",
    null,
    token,
  );
  id = lookup.data[0].id;
  assert.match(id, /^[a-f0-9-]{36}$/i);
  const role = await request(
    "/admin/realms/ataimo/roles/client",
    "GET",
    null,
    token,
  );
  assert.equal(
    (
      await request(
        "/admin/realms/ataimo/users/" + id + "/role-mappings/realm",
        "POST",
        [role.data],
        token,
      )
    ).status,
    204,
  );
  browser = await chromium.launch({
    headless: true,
    args: [
      "--host-resolver-rules=MAP ataimo.com 20.229.210.201, MAP keycloak.ataimo.com 20.229.210.201",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("https://ataimo.com/login");
  await page.locator("#username").waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".impeccable/review/login-live-mobile.png",
    fullPage: true,
  });
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
  await page.waitForURL("https://ataimo.com/portal", { timeout: 30000 });
  await page
    .getByRole("heading", { name: "Your workspace", exact: true })
    .waitFor();
  const data = await page.evaluate(async () => {
    const response = await fetch("/api/portal");
    return { status: response.status, body: await response.json() };
  });
  assert.equal(data.status, 200);
  assert.equal(data.body.user.isOwner, false);
  assert.ok(data.body.user.roles.includes("client"));
  assert.equal(data.body.user.company, "");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "ataimo_session",
  );
  assert.ok(cookie.secure && cookie.httpOnly);
  assert.equal(cookie.sameSite, "Lax");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(
    (url) =>
      url.hostname === "ataimo.com" && url.pathname !== "/api/auth/logout",
    { timeout: 30000 },
  );
  const ended = await page.evaluate(async () => {
    const r = await fetch("/api/portal");
    return r.status;
  });
  assert.equal(ended, 401);
  console.log(
    "Live mobile SSO: branded sign-in, real code/PKCE callback, client session, secure cookies and logout passed. Temporary identity removed.",
  );
  await context.close();
} finally {
  await browser?.close();
  if (id) {
    execFileSync(
      kubectl,
      [
        ...args,
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
        input: `DELETE FROM client_profiles WHERE issuer='https://keycloak.ataimo.com/realms/ataimo' AND subject='${id}';`,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    await request("/admin/realms/ataimo/users/" + id, "DELETE", null, token);
  }
}
