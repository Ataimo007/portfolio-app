import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import https from "node:https";
assert.equal(
  process.env.ATAIMO_RUN_LIVE_CONSULTATION_TESTS,
  "1",
  "Set ATAIMO_RUN_LIVE_CONSULTATION_TESTS=1 to run temporary cloud consultation tests",
);
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
const accounts = ["owner", "client", "client"].map((role) => ({
  id: randomUUID(),
  role,
  token: randomBytes(32).toString("base64url"),
}));
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
let publishedId;
try {
  for (const account of accounts) {
    sql(
      `INSERT INTO client_profiles(id,issuer,subject,display_name,email) VALUES('${account.id}','https://verification.invalid','duration-${suffix}-${account.id}','Duration verification','verification-${suffix}@example.invalid');INSERT INTO portal_sessions(token_hash,client_id,roles,id_token,expires_at) VALUES('${createHash("sha256").update(account.token).digest("hex")}','${account.id}','["${account.role}"]','verification-placeholder',now()+interval '30 minutes');`,
    );
  }
  sql(`INSERT INTO owner_accounts(client_id) VALUES('${accounts[0].id}');`);
  const [owner, client, other] = accounts;
  const workspace = await call(client, "/api/portal");
  assert.equal(workspace.status, 200);
  const window = workspace.body.slots.find(
    (w) => new Date(w.ends_at) >= new Date("2026-11-01T00:00:00Z"),
  );
  assert.ok(window, "October availability is published");
  const start = new Date(
    Math.max(Date.now() + 86400000, new Date(window.starts_at).getTime()),
  );
  start.setUTCHours(16, 0, 0, 0);
  const baseRequest = {
    action: "request",
    slotId: window.id,
    startsAt: start.toISOString(),
    duration: 2,
    durationUnit: "hours",
    title: "Duration verification " + suffix,
    description:
      "Temporary verification of variable-duration approval and overlap protection.",
  };
  const first = await action(client, baseRequest);
  assert.equal(first.status, 200, first.body.error);
  const competing = await action(other, baseRequest);
  assert.equal(competing.status, 200);
  const separate = await action(other, {
    ...baseRequest,
    startsAt: new Date(start.getTime() + 3 * 3600000).toISOString(),
  });
  assert.equal(separate.status, 200);
  const job = (await call(client, "/api/portal")).body.jobs.find(
    (j) => j.id === first.body.jobId,
  );
  assert.equal(new Date(job.ends_at) - new Date(job.starts_at), 2 * 3600000);
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
  const others = (await call(other, "/api/portal")).body.jobs;
  assert.equal(
    others.find((j) => j.id === competing.body.jobId).booking_status,
    "declined",
  );
  const independent = others.find((j) => j.id === separate.body.jobId);
  assert.equal(independent.booking_status, "pending");
  assert.equal(
    (
      await action(owner, {
        action: "decision",
        bookingId: independent.booking_id,
        decision: "approved",
      })
    ).status,
    200,
  );
  assert.equal((await action(other, baseRequest)).status, 409);
  assert.equal(
    (await action(client, { ...baseRequest, duration: 0 })).status,
    400,
  );
  assert.equal(
    (
      await action(client, {
        ...baseRequest,
        duration: 2,
        durationUnit: "months",
      })
    ).status,
    400,
  );
  const future = new Date(Date.now() + 50 * 86400000);
  future.setUTCHours(6, Number.parseInt(suffix.slice(0, 2), 16) % 60, 0, 0);
  const published = await action(owner, {
    action: "availability",
    startsAt: future.toISOString(),
    duration: 1,
    durationUnit: "weeks",
  });
  assert.equal(published.status, 200, published.body.error);
  publishedId = (await call(owner, "/api/portal")).body.slots.find(
    (w) => w.starts_at === future.toISOString(),
  ).id;
  console.log(
    "Live consultation API: custom durations, approval, selective conflict decline, reserved times and week-long availability passed",
  );
} finally {
  const ids = accounts.map((a) => `'${a.id}'`).join(",");
  sql(
    `BEGIN;CREATE TEMP TABLE fixture_events AS SELECT id FROM event_outbox WHERE aggregate_id IN(SELECT id FROM consultancy_jobs WHERE client_id IN(${ids})) OR aggregate_id IN(SELECT id FROM conversations WHERE client_id IN(${ids}));DELETE FROM portal_notifications WHERE client_id IN(${ids}) OR event_id IN(SELECT id FROM fixture_events);DELETE FROM processed_events WHERE id IN(SELECT id FROM fixture_events);DELETE FROM event_outbox WHERE id IN(SELECT id FROM fixture_events);DELETE FROM messages WHERE sender_id IN(${ids});DELETE FROM bookings WHERE job_id IN(SELECT id FROM consultancy_jobs WHERE client_id IN(${ids}));DELETE FROM consultancy_jobs WHERE client_id IN(${ids});DELETE FROM conversation_messages WHERE sender_id IN(${ids});DELETE FROM mail_sends WHERE client_id IN(${ids});DELETE FROM client_profiles WHERE id IN(${ids});${publishedId ? `DELETE FROM availability_windows WHERE id='${publishedId}';` : ""}COMMIT;`,
  );
  sql(
    `DELETE FROM api_rate_limits WHERE key IN (${accounts.map((a) => "'actions:" + a.id + "'").join(",")});`,
  );
  assert.equal(
    sql(`SELECT count(*) FROM client_profiles WHERE id IN(${ids})`),
    "0",
  );
  console.log(
    "Temporary cloud consultation profiles, sessions, jobs and availability removed",
  );
}
