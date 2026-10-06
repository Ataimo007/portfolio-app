import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { database, transaction } from "@/lib/db";
import {
  body,
  handle,
  json,
  limit,
  sameOrigin,
  PortalError,
} from "@/lib/portal-http";
const schema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(80)
      .max(100),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(20)
      .max(30),
  }),
});
function endpoint(value: string) {
  const url = new URL(value);
  const allowed = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
    "wns.windows.com",
  ];
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !allowed.some(
      (host) =>
        url.hostname === host ||
        (host === "wns.windows.com" && url.hostname.endsWith("." + host)),
    )
  )
    throw new PortalError(400, "This push service is not supported.");
  return url.href;
}
export async function GET() {
  return handle(async () => {
    const user = await requireSession();
    const subscriptions = await database().query(
      "SELECT endpoint FROM push_subscriptions WHERE client_id=$1",
      [user.clientId],
    );
    return json({
      endpoints: subscriptions.rows.map((row) => row.endpoint),
      available: Boolean(
        process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
      ),
      publicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    await limit("push:" + user.clientId, 10);
    if (!process.env.VAPID_PRIVATE_KEY)
      throw new PortalError(503, "Phone notifications are not configured yet.");
    const input = schema.parse(await body(request));
    const url = endpoint(input.endpoint);
    await transaction(async (client) => {
      await client.query(
        "SELECT id FROM client_profiles WHERE id=$1 FOR UPDATE",
        [user.clientId],
      );
      const count = await client.query(
        "SELECT count(*) FROM push_subscriptions WHERE client_id=$1 AND endpoint<>$2",
        [user.clientId, url],
      );
      if (Number(count.rows[0].count) >= 20)
        throw new PortalError(
          409,
          "This account already has 20 registered devices.",
        );
      const subscription = await client.query(
        "INSERT INTO push_subscriptions(client_id,endpoint,keys) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET client_id=excluded.client_id,keys=excluded.keys RETURNING id",
        [user.clientId, url, JSON.stringify(input.keys)],
      );
      await client.query(
        "DELETE FROM push_deliveries d USING portal_notifications n WHERE d.notification_id=n.id AND d.subscription_id=$1 AND n.client_id<>$2",
        [subscription.rows[0].id, user.clientId],
      );
    });
    return json({ message: "Notifications enabled for this device." });
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession();
    const input = z
      .object({ endpoint: z.string().max(2048) })
      .parse(await body(request));
    await database().query(
      "DELETE FROM push_subscriptions WHERE client_id=$1 AND endpoint=$2",
      [user.clientId, input.endpoint],
    );
    return json({ message: "Notifications disabled for this device." });
  });
}
