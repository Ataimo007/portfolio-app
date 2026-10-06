import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import https from "node:https";
import { chromium } from "@playwright/test";
const root = process.cwd(),
  suffix = randomBytes(5).toString("hex"),
  origin = "https://ataimo.com",
  host = process.env.WORKSPACE_TEST_IP || "20.229.210.201";
const kubectl = [
  "--kubeconfig",
  root + "/infra/azure/.local/kubeconfig",
  "--context",
  "ataimo-azure",
];
const sql = (text) =>
  execFileSync(
    root + "/infra/azure/.local/bin/kubectl",
    [
      ...kubectl,
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
const accounts = ["owner", "client", "client", "demo-viewer", "client"].map(
  (role) => ({
    id: randomUUID(),
    role,
    token: randomBytes(32).toString("base64url"),
  }),
);
async function call(
  account,
  path,
  method = "GET",
  data,
  allowedOrigin = origin,
) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: host,
        servername: "ataimo.com",
        path,
        method,
        headers: {
          Host: "ataimo.com",
          ...(account ? { Cookie: "ataimo_session=" + account.token } : {}),
          Origin: allowedOrigin,
          "Content-Type": "application/json",
          ...(data
            ? { "Content-Length": Buffer.byteLength(JSON.stringify(data)) }
            : {}),
        },
        timeout: 20000,
      },
      (response) => {
        let text = "";
        response.on("data", (chunk) => (text += chunk));
        response.on("end", () => {
          let body;
          try {
            body = JSON.parse(text);
          } catch {
            body = {};
          }
          resolve({ status: response.statusCode, body });
        });
      },
    );
    request.on("timeout", () => request.destroy(Error("Request timed out")));
    request.on("error", reject);
    request.end(data ? JSON.stringify(data) : undefined);
  });
}
const action = (account, data, originOverride) =>
  call(account, "/api/portal/actions", "POST", data, originOverride);
let browser;
const jobIds = [];
let slotId;
try {
  for (const account of accounts) {
    sql(
      `INSERT INTO client_profiles(id,issuer,subject,display_name,email) VALUES('${account.id}','https://verification.invalid','${suffix}-${account.id}','Verification ${account.role}','verification-${suffix}@example.invalid');INSERT INTO portal_sessions(token_hash,client_id,roles,id_token,expires_at) VALUES('${createHash("sha256").update(account.token).digest("hex")}','${account.id}','["${account.role}"]','verification-placeholder',now()+interval '2 hours');`,
    );
  }
  sql(`INSERT INTO owner_accounts(client_id) VALUES('${accounts[0].id}');`);
  const [owner, client, other, viewer] = accounts;
  assert.equal((await call(null, "/api/portal")).status, 401);
  assert.equal((await call(client, "/api/portal/mail")).status, 403);
  assert.equal(
    (
      await action(client, {
        action: "availability",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
      })
    ).status,
    403,
  );
  assert.equal(
    (await action(viewer, { action: "profile", timezone: "UTC" })).status,
    403,
  );
  assert.equal(
    (
      await action(
        client,
        { action: "profile", timezone: "UTC" },
        "https://evil.invalid",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await action(client, {
        action: "profile",
        timezone: "Africa/Lagos",
        company: "Verification organization",
        phone: "+234000000000",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(client, "/api/portal")).body.user.company,
    "Verification organization",
  );
  const start = new Date(Date.now() + 12 * 86400000);
  start.setUTCHours(13, Number.parseInt(suffix.slice(0, 2), 16) % 60, 0, 0);
  assert.equal(
    (
      await action(owner, {
        action: "availability",
        startsAt: start.toISOString(),
      })
    ).status,
    200,
  );
  slotId = (await call(client, "/api/portal")).body.slots.find(
    (s) => s.starts_at === start.toISOString(),
  ).id;
  const requested = await action(client, {
    action: "request",
    slotId,
    title: "Acceptance consultation " + suffix,
    description:
      "Controlled verification of consultation lifecycle and task progress.",
  });
  assert.equal(requested.status, 200);
  jobIds.push(requested.body.jobId);
  const job = (await call(client, "/api/portal")).body.jobs.find(
    (j) => j.id === jobIds[0],
  );
  assert.equal(
    (
      await action(owner, {
        action: "decision",
        bookingId: job.booking_id,
        decision: "approved",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(client, "/api/portal")).body.jobs.find((j) => j.id === job.id)
      .status,
    "booked",
  );
  assert.equal(
    (
      await action(owner, {
        action: "job-status",
        jobId: job.id,
        status: "active",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await action(owner, {
        action: "task-add",
        jobId: job.id,
        title: "Verify delivery",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await action(owner, {
        action: "job-status",
        jobId: job.id,
        status: "completed",
      })
    ).status,
    409,
  );
  const task = (await call(client, "/api/portal")).body.jobs.find(
    (j) => j.id === job.id,
  ).tasks[0];
  assert.equal(
    (
      await action(client, {
        action: "task-update",
        jobId: job.id,
        taskId: task.id,
        completed: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await action(owner, {
        action: "task-update",
        jobId: job.id,
        taskId: task.id,
        completed: true,
      })
    ).status,
    200,
  );
  const chatPath = `/api/portal/jobs/${job.id}/messages`;
  const message = {
    body: "Controlled consultation message",
    nonce: randomUUID(),
  };
  assert.equal((await call(client, chatPath, "POST", message)).status, 201);
  assert.equal((await call(client, chatPath, "POST", message)).status, 201);
  assert.equal((await call(owner, chatPath)).body.messages.length, 1);
  assert.equal(
    (
      await call(owner, chatPath, "POST", {
        body: "Controlled owner consultation reply",
        nonce: randomUUID(),
      })
    ).status,
    201,
  );
  assert.equal((await call(other, chatPath)).status, 404);
  const thread = (await call(client, "/api/portal/conversations", "POST")).body
    .id;
  const directPath = "/api/portal/conversations/" + thread;
  const direct = { body: "Controlled direct message", nonce: randomUUID() };
  assert.equal((await call(client, directPath, "POST", direct)).status, 201);
  assert.equal((await call(client, directPath, "POST", direct)).status, 201);
  assert.equal((await call(owner, directPath)).body.messages.length, 1);
  assert.equal((await call(other, directPath)).status, 404);
  assert.equal(
    (
      await call(owner, directPath, "POST", {
        body: "Controlled owner reply",
        nonce: randomUUID(),
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call(client, "/api/portal/push", "POST", {
        endpoint: "http://127.0.0.1/private",
        keys: { p256dh: "a".repeat(87), auth: "a".repeat(22) },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(owner, "/api/portal/mail?status=1")).body.available,
    true,
  );
  console.log(
    "Live API: booking approval → booked → active, task completion guard, profiles, private chat retries and cross-client isolation passed.",
  );
  browser = await chromium.launch({
    headless: true,
    args: [`--host-resolver-rules=MAP ataimo.com ${host}`],
  });
  for (const account of [client, owner]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addCookies([
      {
        name: "ataimo_session",
        value: account.token,
        domain: "ataimo.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto(origin + (account.role === "owner" ? "/admin" : "/portal"));
    await page.getByRole("heading", { name: /workspace/i }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: /^messages$/i }).click();
    await page
      .getByRole("button", {
        name:
          account.role === "owner"
            ? "Verification client"
            : "Your conversation with Ataimo",
        exact: true,
      })
      .first()
      .click();
    await page.getByText("Controlled owner reply", { exact: true }).waitFor();
    await page.screenshot({
      path: `.impeccable/review/workspace-live-${account.role}-mobile.png`,
      fullPage: true,
    });
    await context.close();
  }
  console.log(
    "Live mobile browser: client and owner direct chat rendered, owner reply received, no horizontal overflow.",
  );
  if (process.env.WORKSPACE_MAIL_TEST === "1") {
    const subject = "Ataimo workspace acceptance " + suffix,
      nonce = randomUUID();
    const sent = await call(owner, "/api/portal/mail", "POST", {
      nonce,
      to: "ataimo@ataimo.com",
      subject,
      text: "Controlled in-app mail acceptance test " + suffix,
    });
    assert.equal(sent.status, 200);
    assert.match(sent.body.message, /saved to Sent/);
    assert.equal(
      (
        await call(owner, "/api/portal/mail", "POST", {
          nonce,
          to: "ataimo@ataimo.com",
          subject,
          text: "Controlled in-app mail acceptance test " + suffix,
        })
      ).status,
      200,
    );
    const folders = {};
    for (const folder of ["inbox", "sent"]) {
      let email;
      for (let attempt = 0; attempt < 12; attempt++) {
        const response = await call(owner, "/api/portal/mail?folder=" + folder);
        assert.equal(response.status, 200);
        email = response.body.messages.find((m) => m.subject === subject);
        if (email) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert.ok(email, "Controlled email must appear in " + folder);
      folders[folder] = { uid: email.uid, uidValidity: email.uidValidity };
      const read = await call(
        owner,
        `/api/portal/mail?folder=${folder}&uid=${email.uid}&validity=${email.uidValidity}`,
      );
      assert.equal(read.status, 200);
      assert.match(read.body.text, new RegExp(suffix));
    }
    console.log(
      "Live mailbox: self-addressed email sent once, received and read in Inbox and Sent.",
    );
    const keys = JSON.parse(
      execFileSync(
        root + "/infra/azure/.local/bin/kubectl",
        [
          ...kubectl,
          "get",
          "secret",
          "mailu-credentials",
          "-n",
          "mail",
          "-o",
          "json",
        ],
        { encoding: "utf8" },
      ),
    );
    const { ImapFlow } = await import("imapflow");
    const imap = new ImapFlow({
      host,
      tls: { servername: "mail.ataimo.com" },
      port: 993,
      secure: true,
      auth: {
        user: "ataimo@ataimo.com",
        pass: Buffer.from(keys.data["ataimo-password"], "base64").toString(),
      },
      logger: false,
    });
    await imap.connect();
    try {
      for (const folder of ["INBOX", "Sent"]) {
        const lock = await imap.getMailboxLock(folder);
        try {
          const ids = await imap.search({ header: { subject } }, { uid: true });
          if (ids?.length) await imap.messageDelete(ids, { uid: true });
        } finally {
          lock.release();
        }
      }
    } finally {
      await imap.logout();
    }
  }
  assert.equal(
    (
      await action(owner, {
        action: "job-status",
        jobId: job.id,
        status: "completed",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(client, chatPath, "POST", {
        body: "Closed",
        nonce: randomUUID(),
      })
    ).status,
    409,
  );
  let delivered = false;
  for (let i = 0; i < 25; i++) {
    if (
      Number(
        sql(
          `SELECT count(*) FROM portal_notifications WHERE client_id='${client.id}' AND kind='message.created';`,
        ),
      ) >= 2
    ) {
      delivered = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(delivered, "Redpanda must deliver private notifications");
  const device = accounts[4],
    endpoint = "https://fcm.googleapis.com/workspace-verification-" + suffix;
  const { default: webpush } = await import("web-push");
  const pushKeys = {
    p256dh: webpush.generateVAPIDKeys().publicKey,
    auth: randomBytes(16).toString("base64url"),
  };
  assert.equal(
    (
      await call(other, "/api/portal/push", "POST", {
        endpoint,
        keys: pushKeys,
      })
    ).status,
    200,
  );
  assert.ok(
    (await call(other, "/api/portal/push")).body.endpoints.includes(endpoint),
  );
  assert.equal(
    (
      await call(device, "/api/portal/push", "POST", {
        endpoint,
        keys: pushKeys,
      })
    ).status,
    200,
  );
  assert.ok(
    !(await call(other, "/api/portal/push")).body.endpoints.includes(endpoint),
  );
  assert.ok(
    (await call(device, "/api/portal/push")).body.endpoints.includes(endpoint),
  );
  assert.equal(
    (await call(device, "/api/portal/push", "DELETE", { endpoint })).status,
    200,
  );
  console.log(
    "Live push API: registration, account ownership transfer and device opt-out passed; no provider delivery attempted.",
  );
  console.log(
    "Live completion/read-only history and Redpanda notification delivery passed. Temporary fixtures removed below.",
  );
} finally {
  await browser?.close();
  const ids = accounts.map((a) => `'${a.id}'`).join(",");
  sql(
    `BEGIN;CREATE TEMP TABLE fixture_events AS SELECT id FROM event_outbox WHERE aggregate_id IN(SELECT id FROM consultancy_jobs WHERE client_id IN(${ids})) OR aggregate_id IN(SELECT id FROM conversations WHERE client_id IN(${ids}));DELETE FROM portal_notifications WHERE client_id IN(${ids}) OR event_id IN(SELECT id FROM fixture_events);DELETE FROM processed_events WHERE id IN(SELECT id FROM fixture_events);DELETE FROM event_outbox WHERE id IN(SELECT id FROM fixture_events);DELETE FROM messages WHERE sender_id IN(${ids});DELETE FROM bookings WHERE job_id IN(SELECT id FROM consultancy_jobs WHERE client_id IN(${ids}));DELETE FROM consultancy_jobs WHERE client_id IN(${ids});DELETE FROM conversation_messages WHERE sender_id IN(${ids});DELETE FROM mail_sends WHERE client_id IN(${ids});DELETE FROM client_profiles WHERE id IN(${ids});${slotId ? `DELETE FROM availability_windows WHERE id='${slotId}';` : ""}COMMIT;`,
  );
}
