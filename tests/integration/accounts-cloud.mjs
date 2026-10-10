import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "@playwright/test";
import pg from "pg";
import https from "node:https";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
assert.equal(
  process.env.ATAIMO_RUN_LIVE_ACCOUNT_TESTS,
  "1",
  "Set ATAIMO_RUN_LIVE_ACCOUNT_TESTS=1 to run temporary cloud account tests",
);
const env = {
  ...process.env,
  KUBECONFIG:
    process.env.KUBECONFIG || process.cwd() + "/infra/azure/.local/kubeconfig",
};
const kubectl =
  process.env.KUBECTL || process.cwd() + "/infra/azure/.local/bin/kubectl";
assert.equal(
  execFileSync(kubectl, ["config", "current-context"], {
    env,
    encoding: "utf8",
  }).trim(),
  "ataimo-azure",
);
const secret = (name) =>
  Object.fromEntries(
    Object.entries(
      JSON.parse(
        execFileSync(
          kubectl,
          ["get", "secret", name, "-n", "app", "-o", "json"],
          { env },
        ),
      ).data,
    ).map(([k, v]) => [k, Buffer.from(v, "base64").toString()]),
  );
const credentials = secret("portal-credentials"),
  integrations = secret("portal-integrations");
const forwards = [];
async function forward(namespace, service, remote) {
  const process = spawn(
    kubectl,
    ["port-forward", "-n", namespace, "service/" + service, ":" + remote],
    { env },
  );
  forwards.push(process);
  let output = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Kubernetes maintenance tunnel timed out")),
      20000,
    );
    process.on("error", reject);
    process.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    process.on("exit", () => {
      clearTimeout(timer);
      reject(Error("Kubernetes maintenance tunnel exited"));
    });
  });
  return port;
}
const created = [];
let db, browser;
const tag = "workspace-check-" + randomBytes(5).toString("hex");
const base = "https://ataimo.com";
let kc;
try {
  const kcPort = await forward("identity", "keycloak", 8080);
  const identityBase = "http://127.0.0.1:" + kcPort;
  const tokenResponse = await fetch(
    identityBase + "/realms/ataimo/protocol/openid-connect/token",
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: "portfolio-account-api",
        client_secret: credentials.KEYCLOAK_ACCOUNT_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    },
  );
  assert.equal(tokenResponse.status, 200);
  const token = (await tokenResponse.json()).access_token;
  kc = async (path, method = "GET", data) => {
    const r = await fetch(identityBase + "/admin/realms/ataimo" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    assert.ok(
      r.ok || (method === "DELETE" && r.status === 404),
      `Identity test operation ${method} ${path.split("?")[0]} failed: ${r.status}`,
    );
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  };
  const dbPort = await forward("database", "postgres", 5432);
  db = new pg.Client({
    host: "127.0.0.1",
    port: dbPort,
    user: credentials.PGUSER,
    password: credentials.PGPASSWORD,
    database: "portfolio",
  });
  await db.connect();
  for (const suffix of ["client", "owner"]) {
    const username = tag + "-" + suffix;
    const password = randomBytes(24).toString("base64url");
    await kc("/users", "POST", {
      username,
      firstName: "Workspace",
      lastName: "Verification " + suffix,
      email: "ataimo+" + username + "@ataimo.com",
      emailVerified: true,
      enabled: true,
      credentials: [{ type: "password", value: password, temporary: false }],
    });
    const user = (await kc("/users?username=" + username + "&exact=true"))[0];
    created.push({ ...user, password });
    if (suffix === "owner")
      await kc(`/users/${user.id}/role-mappings/realm`, "POST", [
        await kc("/roles/owner"),
      ]);
  }
  const providers = await kc("/identity-provider/instances");
  assert.equal(
    providers.filter(
      (p) =>
        ["google", "github", "linkedin", "microsoft"].includes(p.alias) &&
        p.trustEmail,
    ).length,
    4,
  );
  const realm = await kc("");
  assert.equal(realm.verifyEmail, true);
  console.log(
    "Live identity settings: trusted social email and native verification confirmed",
  );
  browser = await chromium.launch({
    headless: true,
    args: [
      "--host-resolver-rules=MAP ataimo.com 20.229.210.201,MAP keycloak.ataimo.com 20.229.210.201",
    ],
  });
  const clientContext = await browser.newContext();
  const ownerContext = await browser.newContext();
  function requestFor(context) {
    async function request(url, options = {}) {
      const cookies = await context.cookies(base);
      return new Promise((resolve, reject) => {
        const data =
          options.data === undefined ? undefined : JSON.stringify(options.data);
        const req = https.request(
          url,
          {
            method: options.method || "GET",
            lookup: (_host, _options, callback) =>
              callback(null, "20.229.210.201", 4),
            headers: {
              Cookie: cookies.map((c) => c.name + "=" + c.value).join("; "),
              ...(data
                ? {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(data),
                  }
                : {}),
              ...options.headers,
            },
            timeout: 20000,
          },
          (response) => {
            let text = "";
            response.on("data", (chunk) => {
              text += chunk;
            });
            response.on("end", () =>
              resolve({
                status: () => response.statusCode,
                json: async () => JSON.parse(text),
              }),
            );
          },
        );
        req.on("timeout", () =>
          req.destroy(Error("Live API request timed out")),
        );
        req.on("error", reject);
        req.end(data);
      });
    }
    return {
      get: (url) => request(url),
      post: (url, options) => request(url, { ...options, method: "POST" }),
    };
  }
  const clientAPI = requestFor(clientContext),
    ownerAPI = requestFor(ownerContext);
  async function login(context, person) {
    const page = await context.newPage();
    await page.goto(base + "/login");
    await page.locator("#username").fill(person.username);
    await page.locator("#password").fill(person.password);
    await page.locator("#kc-login").click();
    await page.waitForURL(base + "/portal", { timeout: 30000 });
    await page.close();
  }
  await login(clientContext, created[0]);
  await login(ownerContext, created[1]);
  const post = (context, path, data) =>
    requestFor(context).post(base + path, { headers: { Origin: base }, data });
  const clientId = (await (await clientAPI.get(base + "/api/portal")).json())
    .user.clientId;
  const ownerId = (await (await ownerAPI.get(base + "/api/portal")).json()).user
    .clientId;
  created[0].clientId = clientId;
  created[1].clientId = ownerId;
  assert.equal((await clientAPI.get(base + "/api/portal/users")).status(), 403);
  assert.equal(
    (
      await clientAPI.post(base + "/api/auth/account", {
        headers: { Origin: "https://example.invalid" },
        data: { action: "reset-password" },
      })
    ).status(),
    403,
  );
  const account = await (
    await clientAPI.get(base + "/api/auth/account")
  ).json();
  assert.ok(account.hasPassword);
  assert.ok(account.sessions.some((s) => s.current));
  assert.equal(
    (
      await post(clientContext, "/api/auth/account", {
        action: "revoke-device",
        id: "foreign-session",
      })
    ).status(),
    404,
  );
  assert.equal(
    (
      await post(clientContext, "/api/auth/account", {
        action: "personal",
        firstName: "Updated",
        lastName: "Verification",
      })
    ).status(),
    200,
  );
  assert.equal((await kc("/users/" + created[0].id)).firstName, "Updated");
  const link = await post(clientContext, "/api/auth/account", {
    action: "link",
    provider: "github",
  });
  assert.equal(link.status(), 200);
  const linkURL = new URL((await link.json()).redirect);
  assert.equal(linkURL.searchParams.get("kc_action"), "idp_link:github");
  assert.equal(linkURL.searchParams.get("code_challenge_method"), "S256");
  assert.ok(linkURL.searchParams.get("state"));
  assert.equal(
    (
      await post(ownerContext, "/api/auth/account", {
        action: "delete-account",
      })
    ).status(),
    403,
  );
  const directory = await ownerAPI.get(
    base + "/api/portal/users?search=" + tag,
  );
  assert.equal(directory.status(), 200);
  assert.equal((await directory.json()).users.length, 2);
  const details = await (
    await ownerAPI.get(base + "/api/portal/users?id=" + created[0].id)
  ).json();
  assert.ok(details.events.some((e) => e.type === "LOGIN"));
  const chat = await post(ownerContext, "/api/portal/users", {
    action: "chat",
    id: created[0].id,
  });
  assert.equal(chat.status(), 200);
  const thread = (await chat.json()).conversationId;
  assert.equal(
    (
      await post(clientContext, "/api/portal/conversations/" + thread, {
        body: "**Controlled workspace verification**",
        nonce: crypto.randomUUID(),
      })
    ).status(),
    201,
  );
  assert.ok(
    (
      await (
        await ownerAPI.get(base + "/api/portal/conversations/" + thread)
      ).json()
    ).messages.some((m) =>
      m.body.includes("Controlled workspace verification"),
    ),
  );
  assert.equal(
    (
      await post(ownerContext, "/api/portal/users", {
        action: "disable",
        id: created[1].id,
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(ownerContext, "/api/portal/users", {
        action: "close",
        id: created[0].id,
      })
    ).status(),
    200,
  );
  assert.equal((await clientAPI.get(base + "/api/portal")).status(), 401);
  assert.equal((await kc("/users/" + created[0].id)).enabled, false);
  assert.equal(
    (
      await post(ownerContext, "/api/portal/users", {
        action: "enable",
        id: created[0].id,
      })
    ).status(),
    200,
  );
  await clientContext.clearCookies();
  await login(clientContext, created[0]);
  console.log(
    "Live API: owner-only directory, CSRF, device ownership, personal update, link initiation, chat history, closure and session revocation passed",
  );
  assert.equal(
    (
      await post(clientContext, "/api/auth/account", {
        action: "reset-password",
      })
    ).status(),
    200,
  );
  const imap = new ImapFlow({
    host: integrations.MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user: integrations.MAIL_USER, pass: integrations.MAIL_PASSWORD },
    logger: false,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  let verificationToken;
  try {
    await imap.connect();
    const lock = await imap.getMailboxLock("INBOX");
    try {
      for (let attempt = 0; attempt < 4 && !verificationToken; attempt++) {
        const uids = await imap.search(
          { to: created[0].email, subject: "Reset your Ataimo password" },
          { uid: true },
        );
        for (const uid of uids.slice(-3).reverse()) {
          const message = await imap.fetchOne(
            String(uid),
            { source: true },
            { uid: true },
          );
          const parsed = await simpleParser(message.source);
          verificationToken = parsed.text?.match(
            /\/account\/verify\?token=([A-Za-z0-9_-]{43})/,
          )?.[1];
          if (verificationToken) break;
        }
        if (!verificationToken) await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout().catch(() => {});
  }
  assert.ok(
    verificationToken,
    "Verification email must arrive in the real mailbox",
  );
  const nextPassword = randomBytes(24).toString("base64url");
  assert.equal(
    (
      await post(clientContext, "/api/auth/account/verify", {
        token: verificationToken,
        inspect: true,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await post(clientContext, "/api/auth/account/verify", {
        token: verificationToken,
        password: nextPassword,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await post(clientContext, "/api/auth/account/verify", {
        token: verificationToken,
        password: nextPassword,
      })
    ).status(),
    410,
  );
  assert.equal((await clientAPI.get(base + "/api/portal")).status(), 401);
  created[0].password = nextPassword;
  await clientContext.clearCookies();
  await login(clientContext, created[0]);
  assert.equal(
    (
      await post(ownerContext, "/api/portal/users", {
        action: "delete",
        id: created[0].id,
        confirmation: "wrong",
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await post(ownerContext, "/api/portal/users", {
        action: "delete",
        id: created[0].id,
        confirmation: created[0].email,
      })
    ).status(),
    200,
  );
  assert.equal((await clientAPI.get(base + "/api/portal")).status(), 401);
  const deleted = await db.query(
    "SELECT email,display_name,account_status FROM client_profiles WHERE id=$1",
    [clientId],
  );
  assert.deepEqual(deleted.rows[0], {
    email: "",
    display_name: "Deleted account",
    account_status: "deleted",
  });
  console.log(
    "Live API: Mailu verification delivery, in-app password reset, one-use token, new-password login and permanent deletion passed",
  );
} finally {
  await browser?.close();
  if (db) {
    for (const person of created) {
      const profile =
        person.clientId ||
        (
          await db.query("SELECT id FROM client_profiles WHERE subject=$1", [
            person.id,
          ])
        ).rows[0]?.id;
      if (profile) {
        await db.query(
          "DELETE FROM event_outbox WHERE aggregate_id IN (SELECT id FROM conversations WHERE client_id=$1)",
          [profile],
        );
        await db.query("DELETE FROM portal_notifications WHERE client_id=$1", [
          profile,
        ]);
        await db.query(
          "DELETE FROM account_audit WHERE client_id=$1 OR actor_id=$1",
          [profile],
        );
        await db.query(
          "DELETE FROM email_deliveries WHERE email=$1 OR payload->>'email'=$1 OR payload->>'name' LIKE 'Workspace Verification%' OR payload->>'name'='Updated Verification'",
          [person.email],
        );
        await db.query("DELETE FROM client_profiles WHERE id=$1", [profile]);
      }
    }
    await db.end();
  }
  if (kc)
    for (const person of created) await kc("/users/" + person.id, "DELETE");
  for (const process of forwards) {
    process.kill();
    await Promise.race([
      once(process, "exit"),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }
  console.log("Temporary cloud account fixtures removed");
}
