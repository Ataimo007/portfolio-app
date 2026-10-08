import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

export async function queueEmail(
  client: PoolClient,
  email: string,
  kind: string,
  key: string,
  payload: Record<string, string>,
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const normalized = email.toLowerCase();
  await client.query(
    "INSERT INTO email_preferences(email) VALUES($1) ON CONFLICT DO NOTHING",
    [normalized],
  );
  await client.query(
    "INSERT INTO email_deliveries(dedupe_key,email,kind,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [key + ":" + normalized, normalized, kind, JSON.stringify(payload)],
  );
}
export async function ownerAlert(
  client: PoolClient,
  kind: "account.login" | "message.created",
  key: string,
  payload: Record<string, string>,
) {
  for (const email of ["admin@ataimo.com", "edemataimo@gmail.com"])
    await queueEmail(client, email, kind, key, payload);
  if (kind !== "account.login") return;
  const id = randomUUID();
  await client.query("INSERT INTO processed_events(id) VALUES($1)", [id]);
  await client.query(
    "INSERT INTO portal_notifications(event_id,client_id,kind) SELECT $1,client_id,'account.login' FROM owner_accounts ON CONFLICT DO NOTHING",
    [id],
  );
  await client.query(
    "INSERT INTO push_deliveries(notification_id,subscription_id) SELECT n.id,s.id FROM portal_notifications n JOIN push_subscriptions s ON s.client_id=n.client_id WHERE n.event_id=$1 ON CONFLICT DO NOTHING",
    [id],
  );
}
