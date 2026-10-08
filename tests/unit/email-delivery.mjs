import assert from "node:assert/strict";
import { notificationMail, sendPendingEmail } from "../../workers/email.mjs";
const row = {
  id: "fixture",
  email: "admin@ataimo.com",
  kind: "welcome",
  payload: { name: "<script>unsafe</script>" },
  unsubscribe_token: "a".repeat(64),
};
const mail = notificationMail(row, "https://ataimo.com");
assert.equal(mail.from, "Ataimo <hello@ataimo.com>");
assert(!mail.html.includes("<script>"));
assert(mail.html.includes("Unsubscribe"));
assert(mail.headers["List-Unsubscribe-Post"]);
assert(mail.text.includes("email-preferences?token="));
row.kind = "message.created";
row.payload = { name: "Client", url: "https://attacker.invalid" };
assert(
  notificationMail(row, "https://ataimo.com").text.includes(
    "https://ataimo.com/portal",
  ),
);
const queries = [];
const client = {
  query: async (sql) => {
    queries.push(sql);
    return { rows: sql.startsWith("SELECT") ? [row] : [] };
  },
  release() {},
};
const db = { connect: async () => client };
let sent = 0;
await sendPendingEmail(db, async () => {
  sent++;
});
assert.equal(sent, 1);
assert(queries.some((q) => q.includes("delivered_at=now()")));
queries.length = 0;
row.unsubscribed_at = new Date();
await sendPendingEmail(db, async () => {
  sent++;
});
assert.equal(sent, 1);
assert(queries.some((q) => q.includes("skipped_at=now()")));
queries.length = 0;
row.unsubscribed_at = null;
await sendPendingEmail(db, async () => {
  throw Error("temporary SMTP failure");
});
assert(queries.some((q) => q.includes("attempts=attempts+1")));
assert(!queries.some((q) => q.includes("delivered_at=now()")));
console.log(
  "Email: escaped content, safe URLs, footer/header opt-out, delivery, opt-out suppression and retry passed.",
);
