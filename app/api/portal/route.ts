import { requireSession } from "@/lib/auth";
import { database } from "@/lib/db";
import { handle, json } from "@/lib/portal-http";

export async function GET() {
  return handle(async () => {
    const user = await requireSession();
    const [jobs, slots, notifications, reserved] = await Promise.all([
      database().query(
        `SELECT j.id,j.client_id,j.title,j.description,j.status,j.created_at,j.updated_at,p.display_name AS client_name,
 (SELECT count(*)::int FROM messages m WHERE m.job_id=j.id AND m.sender_id=j.client_id) AS client_messages,
 coalesce((SELECT jsonb_agg(t ORDER BY t.created_at) FROM job_tasks t WHERE t.job_id=j.id),'[]'::jsonb) AS tasks,
 coalesce((SELECT jsonb_agg(h ORDER BY h.created_at) FROM job_history h WHERE h.job_id=j.id),'[]'::jsonb) AS history,
 b.id AS booking_id,b.status AS booking_status,b.starts_at,b.ends_at FROM consultancy_jobs j
 JOIN client_profiles p ON p.id=j.client_id LEFT JOIN bookings b ON b.job_id=j.id
 WHERE ($1::boolean OR j.client_id=$2) ORDER BY j.created_at DESC LIMIT 100`,
        [user.isOwner, user.clientId],
      ),
      database().query(
        `SELECT w.id,w.starts_at,w.ends_at FROM availability_windows w WHERE w.ends_at>now() ORDER BY w.starts_at LIMIT 200`,
      ),
      database().query(
        "SELECT n.id,n.kind,n.job_id,n.created_at,n.read_at,coalesce(j.title,CASE WHEN n.kind='mail.received' THEN 'Owner mailbox' ELSE 'Private conversation' END) AS title FROM portal_notifications n LEFT JOIN consultancy_jobs j ON j.id=n.job_id WHERE n.client_id=$1 ORDER BY n.created_at DESC LIMIT 20",
        [user.clientId],
      ),
      database().query(
        "SELECT starts_at,ends_at FROM bookings WHERE status IN ('approved','completed') AND ends_at>now() ORDER BY starts_at LIMIT 2000",
      ),
    ]);
    return json({
      user,
      jobs: jobs.rows,
      slots: slots.rows,
      reserved: reserved.rows,
      notifications: notifications.rows,
    });
  });
}
