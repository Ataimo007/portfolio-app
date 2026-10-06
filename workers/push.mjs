import webpush from "web-push";
export async function sendPendingPush(db) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    "mailto:contact@ataimo.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  const result = await db.query(
    "SELECT d.id,d.attempts,s.id AS subscription_id,s.endpoint,s.keys,n.kind,n.job_id,EXISTS(SELECT 1 FROM owner_accounts o WHERE o.client_id=s.client_id) AS owner FROM push_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id JOIN portal_notifications n ON n.id=d.notification_id WHERE d.delivered_at IS NULL AND d.attempts<5 AND d.next_attempt_at<=now() ORDER BY d.next_attempt_at LIMIT 5",
  );
  for (const row of result.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: row.keys },
        JSON.stringify({
          id: row.id,
          body:
            row.kind === "mail.received"
              ? "Your owner mailbox has new email."
              : row.kind === "message.created"
                ? "You have a new private message."
                : "Your consultation workspace has an update.",
          url: row.owner ? "/admin" : "/portal",
        }),
        { TTL: 3600, timeout: 5000 },
      );
      await db.query(
        "UPDATE push_deliveries SET delivered_at=now() WHERE id=$1",
        [row.id],
      );
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        await db.query("DELETE FROM push_subscriptions WHERE id=$1", [
          row.subscription_id,
        ]);
      } else {
        await db.query(
          "UPDATE push_deliveries SET attempts=attempts+1,next_attempt_at=now()+least(3600,power(2,attempts+4))*interval '1 second' WHERE id=$1",
          [row.id],
        );
      }
    }
  }
}
