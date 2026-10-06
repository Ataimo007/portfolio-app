import assert from "node:assert/strict";
import webpush from "web-push";
import { sendPendingPush } from "../../workers/push.mjs";
const keys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;
const queries = [];
const row = {
  id: "notification-fixture",
  subscription_id: "subscription-fixture",
  endpoint: "https://fcm.googleapis.com/example",
  keys: {},
  kind: "message.created",
  owner: true,
};
const db = {
  query: async (sql, values) => {
    queries.push({ sql, values });
    return { rows: sql.startsWith("SELECT") ? [row] : [] };
  },
};
const original = webpush.sendNotification;
let payload;
try {
  webpush.sendNotification = async (_subscription, body) => {
    payload = JSON.parse(body);
  };
  await sendPendingPush(db);
  assert.equal(payload.url, "/admin");
  assert.equal(payload.body, "You have a new private message.");
  assert.ok(!JSON.stringify(payload).includes("@"));
  assert.ok(queries.some((q) => q.sql.includes("delivered_at=now()")));
  queries.length = 0;
  webpush.sendNotification = async () => {
    throw Object.assign(Error(), { statusCode: 410 });
  };
  await sendPendingPush(db);
  assert.ok(
    queries.some((q) => q.sql.startsWith("DELETE FROM push_subscriptions")),
  );
  queries.length = 0;
  webpush.sendNotification = async () => {
    throw Object.assign(Error(), { statusCode: 503 });
  };
  await sendPendingPush(db);
  assert.ok(queries.some((q) => q.sql.includes("attempts=attempts+1")));
  console.log(
    "Push delivery: generic payload, owner routing, expired endpoint removal and retry scheduling passed.",
  );
} finally {
  webpush.sendNotification = original;
}
