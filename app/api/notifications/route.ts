import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { database } from "@/lib/db";
import { body, handle, json, sameOrigin } from "@/lib/portal-http";
export async function GET() {
  return handle(async () => {
    const user = await requireSession();
    const result = await database().query(
      "SELECT n.id,n.kind,n.created_at,n.read_at,n.job_id,n.conversation_id,coalesce(j.title,CASE WHEN n.kind='account.login' THEN 'Account activity' WHEN n.kind='mail.received' THEN 'Owner mailbox' ELSE 'Private conversation' END) AS title FROM portal_notifications n LEFT JOIN consultancy_jobs j ON j.id=n.job_id WHERE n.client_id=$1 ORDER BY n.created_at DESC LIMIT 40",
      [user.clientId],
    );
    const unread = await database().query(
      "SELECT count(*)::int AS count FROM portal_notifications WHERE client_id=$1 AND read_at IS NULL",
      [user.clientId],
    );
    return json({
      unread: unread.rows[0].count,
      notifications: result.rows.map((n) => ({
        ...n,
        url:
          (user.isOwner ? "/admin" : "/portal") +
          (n.job_id
            ? "?job=" + n.job_id
            : n.conversation_id
              ? "?conversation=" + n.conversation_id
              : n.kind === "mail.received"
                ? "#mail"
                : ""),
      })),
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession();
    const input = z
      .object({ id: z.string().uuid().optional() })
      .parse(await body(request));
    await database().query(
      "UPDATE portal_notifications SET read_at=now() WHERE client_id=$1 AND read_at IS NULL AND ($2::uuid IS NULL OR id=$2)",
      [user.clientId, input.id || null],
    );
    return json({ message: "Notifications marked as read." });
  });
}
