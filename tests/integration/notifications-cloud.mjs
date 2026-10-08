import assert from "node:assert/strict";
import https from "node:https";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
if (process.env.NOTIFICATION_MAIL_TEST !== "1")
  throw Error(
    "Set NOTIFICATION_MAIL_TEST=1 to send controlled welcome/login/message tests to the owner’s addresses.",
  );
const root = process.cwd(),
  marker = "Notification verification " + randomBytes(5).toString("hex");
const k = root + "/infra/azure/.local/bin/kubectl",
  ka = [
    "--kubeconfig",
    root + "/infra/azure/.local/kubeconfig",
    "--context",
    "ataimo-azure",
  ];
const sql = (text) =>
  execFileSync(
    k,
    [
      ...ka,
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
      "-tA",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
assert.equal(
  sql("SELECT to_regclass('public.email_deliveries');"),
  "email_deliveries",
  "Deploy notification migration before acceptance testing.",
);
const owner = { id: randomUUID(), token: randomBytes(32).toString("hex") },
  client = { id: randomUUID(), token: randomBytes(32).toString("hex") };
const testEmail =
  "notification-" + randomBytes(5).toString("hex") + "@example.invalid";
function call(user, path, method = "GET", data, includeOrigin = true) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "20.229.210.201",
        servername: "ataimo.com",
        path,
        method,
        headers: {
          Host: "ataimo.com",
          ...(user ? { Cookie: "ataimo_session=" + user.token } : {}),
          ...(includeOrigin ? { Origin: "https://ataimo.com" } : {}),
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
      (res) => {
        let text = "";
        res.on("data", (s) => (text += s));
        res.on("end", () => {
          let body;
          try {
            body = JSON.parse(text);
          } catch {
            body = {};
          }
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on("timeout", () => req.destroy(Error("Request timeout")));
    req.on("error", reject);
    req.end(data ? JSON.stringify(data) : undefined);
  });
}
let conversation, browser;
const fixture = root + "/infra/azure/.local/notification-sso-test.mjs";
try {
  for (const [account, role] of [
    [owner, "owner"],
    [client, "client"],
  ])
    sql(
      `INSERT INTO client_profiles(id,issuer,subject,display_name,email) VALUES('${account.id}','https://verification.invalid','${account.id}','${marker}','${testEmail}');INSERT INTO portal_sessions(token_hash,client_id,roles,id_token,expires_at) VALUES('${createHash("sha256").update(account.token).digest("hex")}','${account.id}','["${role}"]','test',now()+interval '1 hour');`,
    );
  sql(`INSERT INTO owner_accounts(client_id) VALUES('${owner.id}');`);
  const sso = readFileSync("tests/integration/sso-cloud.mjs", "utf8")
    .replace(
      'email: username + "@example.invalid"',
      'email: "hello@ataimo.com"',
    )
    .replace(
      'firstName: "Verification"',
      `firstName: ${JSON.stringify(marker)}`,
    )
    .replace('lastName: "SSO"', 'lastName: "Test"');
  writeFileSync(fixture, sso, { mode: 0o600 });
  execFileSync("node", [fixture], { stdio: "pipe", timeout: 120000 });
  assert.equal((await call(null, "/api/notifications")).status, 401);
  const before = await call(owner, "/api/notifications");
  assert.equal(before.status, 200);
  assert(before.body.notifications.some((n) => n.kind === "account.login"));
  const created = await call(client, "/api/portal/conversations", "POST", {});
  assert([200, 201].includes(created.status));
  const threads = await call(client, "/api/portal/conversations");
  conversation = threads.body.conversations[0].id;
  const nonce = randomUUID();
  assert.equal(
    (
      await call(client, "/api/portal/conversations/" + conversation, "POST", {
        body: "Controlled notification acceptance " + marker,
        nonce,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call(client, "/api/portal/conversations/" + conversation, "POST", {
        body: "Controlled notification acceptance " + marker,
        nonce,
      })
    ).status,
    201,
  );
  const count = Number(
    sql(
      `SELECT count(*) FROM email_deliveries WHERE kind='message.created' AND payload->>'name'='${marker}';`,
    ),
  );
  assert.equal(count, 2);
  let inbox;
  for (let i = 0; i < 30; i++) {
    inbox = await call(owner, "/api/notifications");
    if (
      inbox.body.notifications.some((n) => n.conversation_id === conversation)
    )
      break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const notification = inbox.body.notifications.find(
    (n) => n.conversation_id === conversation,
  );
  assert(notification);
  assert(notification.url.includes("conversation=" + conversation));
  const isolated = await call(client, "/api/notifications");
  assert(!isolated.body.notifications.some((n) => n.id === notification.id));
  assert.equal(
    (await call(client, "/api/notifications", "POST", { id: notification.id }))
      .status,
    200,
  );
  assert(
    (await call(owner, "/api/notifications")).body.notifications.find(
      (n) => n.id === notification.id,
    ).read_at === null,
  );
  assert.equal(
    (
      await call(
        owner,
        "/api/notifications",
        "POST",
        { id: notification.id },
        false,
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(owner, "/api/notifications", "POST", { id: notification.id }))
      .status,
    200,
  );
  const optout = sql(
    `INSERT INTO email_preferences(email) VALUES('${testEmail}') RETURNING unsubscribe_token;`,
  ).split("\n")[0];
  assert.match(optout, /^[a-f0-9]{64}$/);
  assert.equal(
    (await call(null, "/api/email/unsubscribe?token=" + optout, "POST")).status,
    200,
  );
  assert(
    sql(
      `SELECT unsubscribed_at IS NOT NULL FROM email_preferences WHERE email='${testEmail}';`,
    ).startsWith("t"),
  );
  let delivered;
  for (let i = 0; i < 45; i++) {
    delivered = Number(
      sql(
        `SELECT count(*) FROM email_deliveries WHERE payload->>'name' IN ('${marker}','${marker} Test') AND delivered_at IS NOT NULL;`,
      ),
    );
    if (delivered === 5) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(
    delivered,
    5,
    "Welcome and both pairs of owner alerts must be accepted by SMTP",
  );
  let welcomeReceived = false;
  for (let attempt = 0; attempt < 6 && !welcomeReceived; attempt++) {
    const inbox = await call(owner, "/api/portal/mail?folder=inbox");
    assert.equal(inbox.status, 200);
    for (const message of inbox.body.messages
      .filter((m) => m.subject === "Welcome to Ataimo")
      .slice(0, 5)) {
      const detail = await call(
        owner,
        `/api/portal/mail?folder=inbox&uid=${message.uid}&validity=${message.uidValidity}`,
      );
      if (detail.body.text?.includes(marker)) {
        assert(detail.body.from.includes("hello@ataimo.com"));
        assert(detail.body.text.includes("Unsubscribe"));
        welcomeReceived = true;
        break;
      }
    }
    if (!welcomeReceived) await new Promise((r) => setTimeout(r, 1000));
  }
  assert(
    welcomeReceived,
    "Welcome must arrive in the owner's local alias inbox with an opt-out footer",
  );
  browser = await chromium.launch({
    args: ["--host-resolver-rules=MAP ataimo.com 20.229.210.201"],
  });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
    });
    await context.addCookies([
      {
        name: "ataimo_session",
        value: owner.token,
        domain: "ataimo.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto("https://ataimo.com/projects");
    await page.locator(".notification-center > summary").click();
    await expect(
      page.getByRole("region", { name: "Your notifications" }),
    ).toBeVisible();
    await expect(
      page
        .locator(".notification-panel")
        .getByText("New private message", { exact: true }),
    ).toBeVisible();
    const box = await page.locator(".notification-panel").boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width + 1);
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await page.screenshot({
      path: `.impeccable/review/notifications-live-${width}.png`,
    });
    await context.close();
  }
  console.log(
    "Live notifications: native SSO queues one welcome + two login alerts; incoming chat queues two alerts despite retry; all five SMTP deliveries accepted; owner/client isolation, read authorization, unsubscribe and desktop/mobile inbox passed.",
  );
} finally {
  await browser?.close();
  try {
    unlinkSync(fixture);
  } catch {}
  sql(
    `DELETE FROM push_deliveries WHERE notification_id IN (SELECT id FROM portal_notifications WHERE client_id='${owner.id}' OR client_id='${client.id}' ${conversation ? `OR conversation_id='${conversation}'` : ""});DELETE FROM portal_notifications WHERE client_id='${owner.id}' OR client_id='${client.id}' ${conversation ? `OR conversation_id='${conversation}'` : ""};${conversation ? `DELETE FROM event_outbox WHERE aggregate_id='${conversation}';DELETE FROM conversations WHERE id='${conversation}';` : ""}DELETE FROM client_profiles WHERE id IN ('${owner.id}','${client.id}');DELETE FROM email_deliveries WHERE payload->>'name' IN ('${marker}','${marker} Test');DELETE FROM email_preferences WHERE email='${testEmail}';`,
  );
}
