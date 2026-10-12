import assert from "node:assert/strict";
import { configuredMailboxes } from "../../workers/mail-accounts.mjs";
const env = {
  MAIL_HOST: "mail.example.test",
  MAIL_USER: "ataimo@ataimo.com",
  MAIL_PASSWORD: "personal-fixture-password",
  MAIL_ADMIN_PASSWORD: "admin-fixture-password",
};
const accounts = configuredMailboxes(env);
assert.deepEqual(
  accounts.map((a) => [a.id, a.address]),
  [
    ["ataimo", "ataimo@ataimo.com"],
    ["admin", "admin@ataimo.com"],
  ],
);
assert.equal(
  accounts.find((a) => a.id === "admin").password,
  env.MAIL_ADMIN_PASSWORD,
);
assert.equal(
  accounts.find((a) => a.id === "ataimo").password,
  env.MAIL_PASSWORD,
);
assert.equal(
  accounts.find((a) => a.id === "arbitrary@example.test"),
  undefined,
);
assert.deepEqual(configuredMailboxes({}), []);
assert.deepEqual(configuredMailboxes({ ...env, MAIL_HOST: "" }), []);
assert.deepEqual(
  configuredMailboxes({ ...env, MAIL_ADMIN_PASSWORD: "" }).map((a) => a.id),
  ["ataimo"],
);
assert.deepEqual(
  configuredMailboxes({ ...env, MAIL_PASSWORD: "" }).map((a) => a.id),
  ["admin"],
);
console.log(
  "Mailbox credential isolation, allowlist, missing credentials and legacy default passed.",
);
