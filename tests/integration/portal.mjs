import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const base = process.env.PORTAL_TEST_URL || "http://ataimo.com";
const issuer = "http://keycloak.ataimo.com";
const env = {
  ...process.env,
  KUBECONFIG: process.env.KUBECONFIG || "/home/node/.kube/ataimo-kind",
};
const secret = JSON.parse(
  execFileSync(
    "kubectl",
    ["get", "secret", "keycloak-credentials", "-n", "identity", "-o", "json"],
    { env },
  ),
);
const adminPassword = Buffer.from(
  secret.data["admin-password"],
  "base64",
).toString();
const response = await fetch(
  issuer + "/realms/master/protocol/openid-connect/token",
  {
    method: "POST",
    body: new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      username: "admin",
      password: adminPassword,
    }),
  },
);
assert.equal(response.status, 200);
let token = (await response.json()).access_token;
async function kc(path, method = "GET", data) {
  const options = {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  };
  let r = await fetch(issuer + "/admin/realms/ataimo" + path, options);
  if (r.status === 401) {
    const refreshed = await fetch(
      issuer + "/realms/master/protocol/openid-connect/token",
      {
        method: "POST",
        body: new URLSearchParams({
          client_id: "admin-cli",
          grant_type: "password",
          username: "admin",
          password: adminPassword,
        }),
      },
    );
    assert.equal(refreshed.status, 200);
    token = (await refreshed.json()).access_token;
    options.headers.Authorization = "Bearer " + token;
    r = await fetch(issuer + "/admin/realms/ataimo" + path, options);
  }
  if (!r.ok) throw Error("Keycloak admin API " + r.status);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
const suffix = randomBytes(5).toString("hex"),
  users = [],
  contexts = [];
const browser = await chromium.launch({ headless: true });
const sql = (value) =>
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
      "-tA",
    ],
    { env, input: value, encoding: "utf8" },
  ).trim();
async function create(role) {
  const username = "portal-verification-" + suffix + "-" + users.length,
    password = randomBytes(24).toString("base64url");
  await kc("/users", "POST", {
    username,
    enabled: true,
    email: username + "@example.invalid",
    firstName: "Verification",
    lastName: role,
    credentials: [{ type: "password", value: password, temporary: false }],
  });
  const list = await kc("/users?username=" + username + "&exact=true");
  const u = { id: list[0].id, username, password };
  users.push(u);
  await kc("/users/" + u.id + "/role-mappings/realm", "POST", [
    await kc("/roles/" + role),
  ]);
  return u;
}
async function login(user, viewport) {
  const context = await browser.newContext({
    viewport: viewport || { width: 1440, height: 1000 },
  });
  contexts.push(context);
  const page = await context.newPage();
  await page.goto(base + "/portal");
  await page.locator(".portal-login").getByRole("link", { name: "Login", exact: true }).click();
  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(user.password);
  await page.locator("#kc-login").click();
  await page.waitForURL(base + "/portal", { timeout: 30000 });
  await page.getByRole("heading", { name: /workspace/i }).waitFor();
  const r = await context.request.get(base + "/api/portal");
  assert.equal(r.status(), 200, "SSO callback must create server session");
  const data = await r.json();
  assert.equal(data.user.roles.includes("owner"), user === users[0]);
  return { context, page, data };
}
async function action(context, data) {
  return context.request.post(base + "/api/portal/actions", {
    data,
    headers: { Origin: base },
  });
}
async function waitFor(check, timeout = 45000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Timed out waiting for worker delivery");
}
let jobA, jobB;
try {
  const anonymous = await browser.newContext();
  contexts.push(anonymous);
  assert.equal(
    (await anonymous.request.get(base + "/api/portal")).status(),
    401,
  );
  const bad = await anonymous.request.get(
    base + "/api/auth/callback/keycloak?code=invalid&state=invalid",
    { maxRedirects: 0 },
  );
  assert.equal(bad.status(), 307);
  assert.match(bad.headers().location, /auth=failed/);
  const tamper = await anonymous.request.get(base + "/api/auth/login", {
    maxRedirects: 0,
  });
  assert.equal(tamper.status(), 307);
  const tampered = await anonymous.request.get(
    base + "/api/auth/callback/keycloak?code=invalid&state=tampered",
    { maxRedirects: 0 },
  );
  assert.match(tampered.headers().location, /auth=failed/);
  console.log("Anonymous API and missing/tampered callback checks passed");
  const owner = await login(await create("owner"));
  const client = await login(await create("client"));
  const other = await login(await create("client"), {
    width: 390,
    height: 844,
  });
  const viewer = await login(await create("demo-viewer"));
  console.log(
    "Real Keycloak code/PKCE logins passed for owner, two clients, and read-only viewer",
  );
  const cookies = await client.context.cookies(base);
  const session = cookies.find((c) => c.name === "ataimo_session");
  assert.ok(session.httpOnly);
  assert.equal(session.sameSite, "Lax");
  assert.equal(
    (
      await action(client.context, {
        action: "availability",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await action(viewer.context, {
        action: "availability",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
      })
    ).status(),
    403,
  );
  const noOrigin = await client.context.request.post(
    base + "/api/portal/actions",
    { data: { action: "profile", timezone: "UTC" } },
  );
  assert.equal(noOrigin.status(), 403);
  const wrongOrigin = await client.context.request.post(
    base + "/api/portal/actions",
    {
      data: { action: "profile", timezone: "UTC" },
      headers: { Origin: "http://evil.invalid" },
    },
  );
  assert.equal(wrongOrigin.status(), 403);
  const starts = new Date(Date.now() + 2 * 86400000);
  starts.setUTCHours(12, 0, 0, 0);
  assert.equal(
    (
      await action(owner.context, {
        action: "availability",
        startsAt: starts.toISOString(),
      })
    ).status(),
    200,
  );
  const slots = (
    await (await client.context.request.get(base + "/api/portal")).json()
  ).slots;
  const slot = slots.find((s) => s.starts_at === starts.toISOString());
  assert.ok(slot);
  const title = "Verification consultation " + suffix;
  await client.page.reload();
  await client.page.locator("#request-title").waitFor();
  const calendarLabel =
    starts.toLocaleDateString("en", { month: "long", timeZone: "UTC" }) +
    " " +
    starts.getUTCDate() +
    ", available slots";
  if (starts.getUTCMonth() !== new Date().getMonth())
    await client.page.getByRole("button", { name: "Next month" }).click();
  await client.page
    .getByRole("button", { name: calendarLabel, exact: true })
    .click();
  await client.page
    .getByRole("button", { name: "12:00 PM", exact: true })
    .click();
  await client.page.locator("#request-title").fill(title);
  await client.page
    .locator("#request-description")
    .fill(
      "Synthetic acceptance test for consultation approval and private messaging.",
    );
  await client.page
    .getByRole("button", { name: "Request consultation", exact: true })
    .click();
  await client.page
    .getByRole("status")
    .filter({ hasText: "Consultation requested" })
    .waitFor();
  let data = await (
    await client.context.request.get(base + "/api/portal")
  ).json();
  jobA = data.jobs.find((j) => j.title === title);
  assert.equal(jobA.booking_status, "pending");
  const second = await action(other.context, {
    action: "request",
    slotId: slot.id,
    title: "Competing verification request " + suffix,
    description: "Synthetic competing request for the same consultation slot.",
  });
  assert.equal(second.status(), 200);
  const idB = (await second.json()).jobId;
  jobB = (
    await (await other.context.request.get(base + "/api/portal")).json()
  ).jobs.find((j) => j.id === idB);
  assert.equal(
    (
      await action(client.context, {
        action: "decision",
        bookingId: jobA.booking_id,
        decision: "approved",
      })
    ).status(),
    403,
  );
  const race = await Promise.all([
    action(owner.context, {
      action: "decision",
      bookingId: jobA.booking_id,
      decision: "approved",
    }),
    action(owner.context, {
      action: "decision",
      bookingId: jobB.booking_id,
      decision: "approved",
    }),
  ]);
  assert.deepEqual(race.map((r) => r.status()).sort(), [200, 409]);
  const finalA = (
      await (await client.context.request.get(base + "/api/portal")).json()
    ).jobs.find((j) => j.id === jobA.id),
    finalB = (
      await (await other.context.request.get(base + "/api/portal")).json()
    ).jobs.find((j) => j.id === jobB.id);
  assert.deepEqual([finalA.booking_status, finalB.booking_status].sort(), [
    "approved",
    "declined",
  ]);
  const active =
    finalA.status === "active"
      ? { job: finalA, client }
      : { job: finalB, client: other };
  const outsider = active.client === client ? other : client;
  assert.equal(
    (
      await outsider.context.request.get(
        base + "/api/portal/jobs/" + active.job.id + "/messages",
      )
    ).status(),
    404,
  );
  assert.equal(
    (
      await outsider.context.request.post(
        base + "/api/portal/jobs/" + active.job.id + "/messages",
        {
          data: { body: "Not allowed", nonce: randomUUID() },
          headers: { Origin: base },
        },
      )
    ).status(),
    404,
  );
  console.log(
    "Calendar request, owner authorization, atomic approval race, and cross-client isolation passed",
  );
  const message = {
    body: "Synthetic private message " + suffix,
    nonce: randomUUID(),
  };
  const path = base + "/api/portal/jobs/" + active.job.id + "/messages";
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await active.client.context.request.post(path, {
          data: message,
          headers: { Origin: base },
        })
      ).status(),
      201,
    );
  const history = (await (await owner.context.request.get(path)).json())
    .messages;
  assert.equal(history.filter((m) => m.body === message.body).length, 1);
  assert.equal(
    (
      await owner.context.request.post(path, {
        data: { body: "Synthetic owner reply", nonce: randomUUID() },
        headers: { Origin: base },
      })
    ).status(),
    201,
  );
  await active.client.page.reload();
  await active.client.page
    .getByRole("button", { name: "Open conversation" })
    .first()
    .click();
  await active.client.page
    .getByText("Synthetic owner reply", { exact: true })
    .waitFor();
  await waitFor(
    () =>
      Number(
        sql(
          "SELECT count(*) FROM portal_notifications WHERE job_id='" +
            active.job.id +
            "' AND kind='message.created';",
        ),
      ) > 0,
  );
  console.log(
    "Private chat, retry idempotency, browser polling, and Redpanda notifications passed",
  );
  const replay = JSON.parse(
    sql(
      "SELECT jsonb_build_object('schemaVersion',1,'id',id,'eventType',event_type,'jobId',aggregate_id,'recipientIds',payload->'recipientIds') FROM event_outbox WHERE aggregate_id='" +
        active.job.id +
        "' AND event_type='message.created' AND published_at IS NOT NULL LIMIT 1;",
    ),
  );
  await waitFor(
    () =>
      Number(
        sql(
          "SELECT count(*) FROM processed_events WHERE id='" + replay.id + "';",
        ),
      ) === 1,
  );
  const notificationCount = Number(
    sql(
      "SELECT count(*) FROM portal_notifications WHERE event_id='" +
        replay.id +
        "';",
    ),
  );
  execFileSync(
    "kubectl",
    [
      "exec",
      "-i",
      "-n",
      "streaming",
      "redpanda-0",
      "-c",
      "redpanda",
      "--",
      "rpk",
      "topic",
      "produce",
      "ataimo.portal.events.v1",
    ],
    {
      env,
      input: JSON.stringify(replay) + "\n",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(
    Number(
      sql(
        "SELECT count(*) FROM portal_notifications WHERE event_id='" +
          replay.id +
          "';",
      ),
    ),
    notificationCount,
  );
  console.log(
    "Duplicate Redpanda event replay produced no duplicate notification",
  );

  if (process.env.PORTAL_FAULT_TESTS === "1") {
    assert.equal(
      execFileSync("kubectl", ["config", "current-context"], {
        env,
        encoding: "utf8",
      }).trim(),
      "kind-portfolio",
    );
    const node = "portfolio-control-plane";
    const brokerIP = execFileSync(
      "kubectl",
      [
        "get",
        "pod",
        "redpanda-0",
        "-n",
        "streaming",
        "-o",
        "jsonpath={.status.podIP}",
      ],
      { env, encoding: "utf8" },
    ).trim();
    assert.match(brokerIP, /^\d+\.\d+\.\d+\.\d+$/);
    const rule = [
      "-d",
      brokerIP,
      "-p",
      "tcp",
      "--dport",
      "9093",
      "-m",
      "comment",
      "--comment",
      "ataimo-verification-" + suffix,
      "-j",
      "REJECT",
    ];
    const remove = () => {
      try {
        execFileSync(
          "docker",
          ["exec", node, "iptables", "--wait", "5", "-D", "FORWARD", ...rule],
          { stdio: "pipe" },
        );
      } catch {}
    };
    execFileSync(
      "docker",
      ["exec", node, "iptables", "--wait", "5", "-I", "FORWARD", ...rule],
      { stdio: "pipe" },
    );
    execFileSync(
      "docker",
      [
        "exec",
        "-d",
        node,
        "sh",
        "-c",
        'sleep 90; iptables --wait 5 "$@" 2>/dev/null || true',
        "watchdog",
        "-D",
        "FORWARD",
        ...rule,
      ],
      { stdio: "pipe" },
    );
    console.log(
      "Started controlled Kafka network outage; cleanup watchdog active",
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const outage = await active.client.context.request.post(path, {
        data: {
          body: "Synthetic broker-outage persistence check",
          nonce: randomUUID(),
        },
        headers: { Origin: base },
      });
      assert.equal(outage.status(), 201);
      assert.ok(
        Number(
          sql(
            "SELECT count(*) FROM event_outbox WHERE aggregate_id='" +
              active.job.id +
              "' AND published_at IS NULL;",
          ),
        ) > 0,
      );
      console.log(
        "Message saved with Kafka unreachable; unpublished outbox retained",
      );
      await new Promise((resolve) => setTimeout(resolve, 45000));
    } finally {
      remove();
    }
    await waitFor(
      () =>
        Number(
          sql(
            "SELECT count(*) FROM event_outbox WHERE aggregate_id='" +
              active.job.id +
              "' AND published_at IS NULL;",
          ),
        ) === 0,
      90000,
    );
    console.log(
      "Kafka network recovered and retained events published automatically",
    );
  }

  if (process.env.PORTAL_IDENTITY_FAULT_TESTS === "1") {
    assert.equal(
      execFileSync("kubectl", ["config", "current-context"], {
        env,
        encoding: "utf8",
      }).trim(),
      "kind-portfolio",
    );
    const node = "portfolio-control-plane";
    const ip = execFileSync(
      "kubectl",
      [
        "get",
        "pods",
        "-n",
        "identity",
        "-l",
        "app=keycloak",
        "-o",
        "jsonpath={.items[0].status.podIP}",
      ],
      { env, encoding: "utf8" },
    ).trim();
    assert.match(ip, /^\d+\.\d+\.\d+\.\d+$/);
    const rule = [
      "-d",
      ip,
      "-p",
      "tcp",
      "--dport",
      "8080",
      "-m",
      "comment",
      "--comment",
      "ataimo-identity-verification-" + suffix,
      "-j",
      "REJECT",
    ];
    execFileSync(
      "docker",
      ["exec", node, "iptables", "--wait", "5", "-I", "FORWARD", ...rule],
      { stdio: "pipe" },
    );
    execFileSync(
      "docker",
      [
        "exec",
        "-d",
        node,
        "sh",
        "-c",
        'sleep 90; iptables --wait 5 "$@" 2>/dev/null || true',
        "watchdog",
        "-D",
        "FORWARD",
        ...rule,
      ],
      { stdio: "pipe" },
    );
    try {
      for (const route of ["/", "/projects", "/api/health"])
        assert.equal((await anonymous.request.get(base + route)).status(), 200);
      assert.equal(
        (
          await active.client.context.request.get(base + "/api/portal")
        ).status(),
        200,
      );
      const failure = await anonymous.request.get(base + "/api/auth/login", {
        maxRedirects: 0,
      });
      assert.equal(failure.status(), 307);
      assert.match(failure.headers().location, /auth=unavailable/);
      console.log(
        "Identity outage preserved public content and existing sessions; new login showed recovery",
      );
    } finally {
      try {
        execFileSync(
          "docker",
          ["exec", node, "iptables", "--wait", "5", "-D", "FORWARD", ...rule],
          { stdio: "pipe" },
        );
      } catch {}
    }
  }
  assert.equal(
    (
      await action(owner.context, {
        action: "job-status",
        jobId: active.job.id,
        status: "completed",
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await active.client.context.request.post(path, {
        data: { body: "Closed job", nonce: randomUUID() },
        headers: { Origin: base },
      })
    ).status(),
    409,
  );
  await active.client.page.screenshot({
    path: "infra/local-kubernetes/.local/portal-client-" + suffix + ".png",
    fullPage: true,
  });
  await owner.page.reload();
  await owner.page.screenshot({
    path: "infra/local-kubernetes/.local/portal-owner-" + suffix + ".png",
    fullPage: true,
  });
  await other.page.reload();
  await other.page.getByRole("heading", { name: /workspace/i }).waitFor();
  await other.page.screenshot({
    path: "infra/local-kubernetes/.local/portal-mobile-" + suffix + ".png",
    fullPage: true,
  });
  assert.ok(
    await other.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile overflow",
  );
  const status = await anonymous.request.get(base + "/api/platform/status");
  assert.equal(status.status(), 200);
  const snapshot = await status.json();
  assert.equal(snapshot.mode, "live");
  assert.equal(snapshot.environment, "local-kind");
  assert.equal(snapshot.components.length, 7);
  assert.ok(!JSON.stringify(snapshot).includes("namespace"));
  sql(
    "UPDATE portal_sessions SET expires_at=now()-interval '1 second' WHERE client_id=(SELECT id FROM client_profiles WHERE subject='" +
      users[3].id +
      "');",
  );
  assert.equal(
    (await viewer.context.request.get(base + "/api/portal")).status(),
    401,
  );
  const out = await owner.context.request.post(base + "/api/auth/logout", {
    headers: { Origin: base },
    maxRedirects: 0,
  });
  assert.equal(out.status(), 303);
  assert.equal(
    (await owner.context.request.get(base + "/api/portal")).status(),
    401,
  );
  console.log(
    "Completion, measured public status, expired-session rejection, and local logout passed",
  );
  console.log(
    "Portal acceptance passed. Synthetic accounts and database records will be removed.",
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  if (users.length)
    await waitFor(
      () =>
        Number(
          sql(
            "SELECT count(*) FROM event_outbox e JOIN consultancy_jobs j ON j.id=e.aggregate_id JOIN client_profiles p ON p.id=j.client_id WHERE p.subject IN (" +
              users.map((u) => "'" + u.id + "'").join(",") +
              ") AND NOT EXISTS(SELECT 1 FROM processed_events x WHERE x.id=e.id);",
          ),
        ) === 0,
    ).catch(() =>
      console.error("Some synthetic events did not drain before cleanup"),
    );
  const ids = users.map((u) => "'" + u.id + "'").join(",");
  if (ids)
    sql(
      `BEGIN;CREATE TEMP TABLE test_clients AS SELECT id FROM client_profiles WHERE subject IN (${ids});CREATE TEMP TABLE test_jobs AS SELECT id FROM consultancy_jobs WHERE client_id IN(SELECT id FROM test_clients);DELETE FROM portal_notifications WHERE job_id IN(SELECT id FROM test_jobs);DELETE FROM processed_events WHERE id IN(SELECT id FROM event_outbox WHERE aggregate_id IN(SELECT id FROM test_jobs));DELETE FROM event_outbox WHERE aggregate_id IN(SELECT id FROM test_jobs);DELETE FROM messages WHERE job_id IN(SELECT id FROM test_jobs);DELETE FROM bookings WHERE job_id IN(SELECT id FROM test_jobs);DELETE FROM consultancy_jobs WHERE id IN(SELECT id FROM test_jobs);DELETE FROM client_profiles WHERE id IN(SELECT id FROM test_clients);DELETE FROM availability_windows WHERE starts_at='${new Date(new Date(Date.now() + 2 * 86400000).setUTCHours(12, 0, 0, 0)).toISOString()}' AND NOT EXISTS(SELECT 1 FROM bookings WHERE slot_id=availability_windows.id);COMMIT;`,
    );
  for (const user of users) await kc("/users/" + user.id, "DELETE");
}
