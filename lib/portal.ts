import "server-only";
import type { PoolClient } from "pg";
import type { Session } from "./auth";
import { database } from "./db";
import { PortalError } from "./portal-http";

export async function jobAccess(
  id: string,
  user: Session,
  client?: PoolClient,
) {
  const result = await (client || database()).query(
    "SELECT * FROM consultancy_jobs WHERE id=$1 AND ($2::boolean OR client_id=$3)" +
      (client ? " FOR UPDATE" : ""),
    [id, user.isOwner, user.clientId],
  );
  if (!result.rowCount) throw new PortalError(404, "Job not found.");
  return result.rows[0];
}
export async function event(
  client: PoolClient,
  type: string,
  jobId: string,
  recipientIds: string[],
) {
  await client.query(
    "INSERT INTO event_outbox(event_type,aggregate_id,payload) VALUES($1,$2,$3)",
    [
      type,
      jobId,
      JSON.stringify({
        schemaVersion: 1,
        jobId,
        recipientIds: [...new Set(recipientIds)],
      }),
    ],
  );
}
export async function owners(client: PoolClient) {
  const result = await client.query("SELECT client_id FROM owner_accounts");
  return result.rows.map((row) => row.client_id as string);
}
