import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import {
  body,
  handle,
  json,
  limit,
  PortalError,
  sameOrigin,
} from "@/lib/portal-http";
import { event, jobAccess, owners } from "@/lib/portal";

import { durationEnd } from "@/lib/consultation-duration";

const durationFields = {
  duration: z.number().int().min(1).max(525600).default(30),
  durationUnit: z
    .enum(["minutes", "hours", "days", "weeks", "months"])
    .default("minutes"),
};
const uuid = z.string().uuid();
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    slotId: uuid,
    startsAt: z.string().datetime({ offset: true }).optional(),
    ...durationFields,
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(4000),
  }),
  z.object({
    action: z.literal("availability"),
    startsAt: z.string().datetime({ offset: true }),
    ...durationFields,
  }),
  z.object({
    action: z.literal("decision"),
    bookingId: uuid,
    decision: z.enum(["approved", "declined"]),
  }),
  z.object({
    action: z.literal("job-status"),
    jobId: uuid,
    status: z.enum(["active", "completed", "cancelled"]),
  }),
  z.object({
    action: z.literal("task-add"),
    jobId: uuid,
    title: z.string().trim().min(1).max(200),
  }),
  z.object({
    action: z.literal("task-update"),
    jobId: uuid,
    taskId: uuid,
    completed: z.boolean(),
  }),
  z.object({ action: z.literal("notifications-read") }),
  z.object({ action: z.literal("cancel-request"), jobId: uuid }),
  z.object({
    action: z.literal("profile"),
    timezone: z.string().min(1).max(80),
    company: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
  }),
]);
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    await limit("actions:" + user.clientId, 30);
    const input = schema.parse(await body(request));
    const value = await transaction(async (client) => {
      if (input.action === "notifications-read") {
        await client.query(
          "UPDATE portal_notifications SET read_at=now() WHERE client_id=$1 AND read_at IS NULL",
          [user.clientId],
        );
        return { message: "Updates marked as read." };
      }
      if (input.action === "profile") {
        try {
          new Intl.DateTimeFormat("en", { timeZone: input.timezone });
        } catch {
          throw new PortalError(400, "Choose a valid timezone.");
        }
        await client.query(
          "UPDATE client_profiles SET timezone=$1,company=coalesce($3,company),phone=coalesce($4,phone) WHERE id=$2",
          [input.timezone, user.clientId, input.company, input.phone],
        );
        return { message: "Profile preferences updated." };
      }
      if (input.action === "request") {
        await client.query(
          "SELECT id FROM client_profiles WHERE id=$1 FOR UPDATE",
          [user.clientId],
        );
        const count = await client.query(
          "SELECT count(*) FROM consultancy_jobs WHERE client_id=$1 AND status='requested'",
          [user.clientId],
        );
        if (Number(count.rows[0].count) >= 5)
          throw new PortalError(
            409,
            "You already have five requests awaiting a decision.",
          );
        const slot = await client.query(
          `SELECT * FROM availability_windows WHERE id=$1 AND ends_at>now() FOR UPDATE`,
          [input.slotId],
        );
        if (!slot.rowCount)
          throw new PortalError(409, "That slot is no longer available.");
        const startsAt =
          input.startsAt || new Date(slot.rows[0].starts_at).toISOString();
        const endsAt = durationEnd(
          startsAt,
          input.duration,
          input.durationUnit,
        );
        if (
          new Date(startsAt).getTime() < Date.now() + 30 * 60000 ||
          new Date(startsAt) < new Date(slot.rows[0].starts_at) ||
          new Date(endsAt) > new Date(slot.rows[0].ends_at)
        )
          throw new PortalError(
            400,
            "Choose a future time and duration within the available window.",
          );
        const taken = await client.query(
          "SELECT id FROM bookings WHERE status IN ('approved','completed') AND tstzrange(starts_at,ends_at,'[)') && tstzrange($1::timestamptz,$2::timestamptz,'[)')",
          [startsAt, endsAt],
        );
        if (taken.rowCount)
          throw new PortalError(
            409,
            "That time overlaps a confirmed consultation. Choose another time.",
          );
        const duplicate = await client.query(
          "SELECT b.id FROM bookings b JOIN consultancy_jobs j ON j.id=b.job_id WHERE j.client_id=$1 AND b.slot_id=$2 AND b.starts_at=$3 AND b.status='pending'",
          [user.clientId, input.slotId, startsAt],
        );
        if (duplicate.rowCount)
          throw new PortalError(409, "You have already requested that time.");
        const job = await client.query(
          "INSERT INTO consultancy_jobs(client_id,title,description) VALUES($1,$2,$3) RETURNING id",
          [user.clientId, input.title, input.description],
        );
        await client.query(
          "INSERT INTO bookings(job_id,slot_id,starts_at,ends_at) VALUES($1,$2,$3,$4)",
          [job.rows[0].id, input.slotId, startsAt, endsAt],
        );
        await client.query(
          "INSERT INTO job_history(job_id,status,actor_id) VALUES($1,'requested',$2)",
          [job.rows[0].id, user.clientId],
        );
        await event(client, "booking.requested", job.rows[0].id, [
          user.clientId,
          ...(await owners(client)),
        ]);
        return {
          message:
            "Consultation requested. Your time is confirmed only after approval.",
          jobId: job.rows[0].id,
        };
      }
      if (input.action === "cancel-request") {
        const job = await jobAccess(input.jobId, user, client);
        if (job.client_id !== user.clientId || job.status !== "requested")
          throw new PortalError(
            409,
            "Only your pending requests can be withdrawn. Contact Ataimo to change a confirmed booking.",
          );
        await client.query(
          "UPDATE consultancy_jobs SET status='cancelled',updated_at=now() WHERE id=$1",
          [job.id],
        );
        await client.query(
          "UPDATE bookings SET status='cancelled',decided_at=now() WHERE job_id=$1 AND status='pending'",
          [job.id],
        );
        await event(client, "job.cancelled", job.id, [
          user.clientId,
          ...(await owners(client)),
        ]);
        return { message: "Consultation request withdrawn." };
      }
      if (!user.isOwner)
        throw new PortalError(403, "Owner access is required.");
      if (input.action === "task-add" || input.action === "task-update") {
        const job = await jobAccess(input.jobId, user, client);
        if (!["booked", "active"].includes(job.status))
          throw new PortalError(
            409,
            "Tasks can be edited for booked or active work.",
          );
        if (input.action === "task-add") {
          const count = await client.query(
            "SELECT count(*) FROM job_tasks WHERE job_id=$1",
            [job.id],
          );
          if (Number(count.rows[0].count) >= 100)
            throw new PortalError(
              409,
              "This engagement has reached its task limit.",
            );
          await client.query(
            "INSERT INTO job_tasks(job_id,title) VALUES($1,$2)",
            [job.id, input.title],
          );
        } else {
          const changed = await client.query(
            "UPDATE job_tasks SET completed=$1,updated_at=now() WHERE id=$2 AND job_id=$3 RETURNING id",
            [input.completed, input.taskId, job.id],
          );
          if (!changed.rowCount) throw new PortalError(404, "Task not found.");
        }
        await event(client, "task.updated", job.id, [job.client_id]);
        return { message: "Task progress saved." };
      }
      if (input.action === "availability") {
        const date = new Date(input.startsAt);
        if (
          date.getTime() < Date.now() + 30 * 60000 ||
          date.getTime() > Date.now() + 180 * 86400000
        )
          throw new PortalError(
            400,
            "Choose a time between 30 minutes and six months from now.",
          );
        const endsAt = durationEnd(
          input.startsAt,
          input.duration,
          input.durationUnit,
        );
        if (new Date(endsAt).getTime() > date.getTime() + 366 * 86400000)
          throw new PortalError(400, "Availability can span up to one year.");
        await client.query(
          "INSERT INTO availability_windows(starts_at,ends_at) VALUES($1,$2)",
          [
            input.startsAt,
            durationEnd(input.startsAt, input.duration, input.durationUnit),
          ],
        );
        return { message: "Consultation availability published." };
      }
      if (input.action === "decision") {
        const initial = await client.query(
          "SELECT slot_id FROM bookings WHERE id=$1",
          [input.bookingId],
        );
        if (!initial.rowCount) throw new PortalError(404, "Booking not found.");
        await client.query(
          "SELECT id FROM availability_windows WHERE id=$1 FOR UPDATE",
          [initial.rows[0].slot_id],
        );
        const found = await client.query(
          "SELECT b.*,j.client_id FROM bookings b JOIN consultancy_jobs j ON j.id=b.job_id WHERE b.id=$1 FOR UPDATE OF b,j",
          [input.bookingId],
        );
        const booking = found.rows[0];
        if (booking.status !== "pending")
          throw new PortalError(409, "This request has already been decided.");
        if (
          input.decision === "approved" &&
          new Date(booking.starts_at).getTime() <= Date.now()
        )
          throw new PortalError(
            409,
            "This slot has passed. Decline it and publish a new time.",
          );
        await client.query(
          "UPDATE bookings SET status=$1,decided_at=now(),decided_by=$2 WHERE id=$3",
          [input.decision, user.clientId, input.bookingId],
        );
        await client.query(
          "UPDATE consultancy_jobs SET status=$1,updated_at=now() WHERE id=$2",
          [
            input.decision === "approved" ? "booked" : "cancelled",
            booking.job_id,
          ],
        );
        await client.query(
          "INSERT INTO job_history(job_id,status,actor_id) VALUES($1,$2,$3)",
          [
            booking.job_id,
            input.decision === "approved" ? "booked" : "cancelled",
            user.clientId,
          ],
        );
        await event(client, "booking." + input.decision, booking.job_id, [
          booking.client_id,
        ]);
        if (input.decision === "approved") {
          const others = await client.query(
            "UPDATE bookings SET status='declined',decided_at=now(),decided_by=$2 WHERE status='pending' AND tstzrange(starts_at,ends_at,'[)') && tstzrange($1::timestamptz,$3::timestamptz,'[)') RETURNING job_id",
            [booking.starts_at, user.clientId, booking.ends_at],
          );
          for (const other of others.rows) {
            const job = await client.query(
              "UPDATE consultancy_jobs SET status='cancelled',updated_at=now() WHERE id=$1 RETURNING client_id",
              [other.job_id],
            );
            await event(client, "booking.declined", other.job_id, [
              job.rows[0].client_id,
            ]);
          }
        }
        return {
          message:
            input.decision === "approved"
              ? "Consultation approved."
              : "Consultation declined.",
        };
      }
      const job = await jobAccess(input.jobId, user, client);
      await client.query(
        "SELECT id FROM consultancy_jobs WHERE id=$1 FOR UPDATE",
        [job.id],
      );
      const current = await client.query(
        "SELECT status FROM consultancy_jobs WHERE id=$1",
        [job.id],
      );
      if (
        !["requested", "booked", "active"].includes(current.rows[0].status) ||
        (input.status === "active" && current.rows[0].status !== "booked") ||
        (input.status === "completed" && current.rows[0].status !== "active")
      )
        throw new PortalError(409, "This job cannot make that transition.");
      await client.query(
        "UPDATE consultancy_jobs SET status=$1,updated_at=now() WHERE id=$2",
        [input.status, job.id],
      );
      if (input.status !== "active") {
        if (input.status === "completed") {
          const pending = await client.query(
            "SELECT id FROM job_tasks WHERE job_id=$1 AND NOT completed LIMIT 1",
            [job.id],
          );
          if (pending.rowCount)
            throw new PortalError(
              409,
              "Complete the outstanding tasks before closing this engagement.",
            );
        }
        await client.query(
          "UPDATE bookings SET status=$1 WHERE job_id=$2 AND status IN ('pending','approved')",
          [input.status, job.id],
        );
      }
      await client.query(
        "INSERT INTO job_history(job_id,status,actor_id) VALUES($1,$2,$3)",
        [job.id, input.status, user.clientId],
      );
      await event(client, "job." + input.status, job.id, [job.client_id]);
      return { message: "Job " + input.status + "." };
    });
    return json(value, 200);
  });
}
