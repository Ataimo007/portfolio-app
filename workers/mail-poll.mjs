import { ImapFlow } from "imapflow";
export async function pollMail(db) {
  if (
    !process.env.MAIL_HOST ||
    !process.env.MAIL_USER ||
    !process.env.MAIL_PASSWORD
  )
    return;
  const imap = new ImapFlow({
    host: process.env.MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    logger: false,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
  try {
    await imap.connect();
    const lock = await imap.getMailboxLock("INBOX");
    try {
      const state = imap.mailbox;
      if (!state) return;
      const validity = state.uidValidity.toString();
      const last = Math.max(0, Number(state.uidNext) - 1);
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const previous = await client.query(
          "SELECT * FROM mail_watch WHERE mailbox=$1 FOR UPDATE",
          [process.env.MAIL_USER],
        );
        if (
          previous.rowCount &&
          previous.rows[0].uid_validity === validity &&
          last > Number(previous.rows[0].last_uid)
        ) {
          const recipients = await client.query(
            "SELECT client_id FROM owner_accounts",
          );
          if (recipients.rowCount)
            await client.query(
              "INSERT INTO event_outbox(event_type,aggregate_id,payload) VALUES('mail.received',gen_random_uuid(),$1)",
              [
                JSON.stringify({
                  schemaVersion: 3,
                  recipientIds: recipients.rows.map((r) => r.client_id),
                }),
              ],
            );
        }
        await client.query(
          "INSERT INTO mail_watch(mailbox,uid_validity,last_uid) VALUES($1,$2,$3) ON CONFLICT(mailbox) DO UPDATE SET uid_validity=excluded.uid_validity,last_uid=excluded.last_uid",
          [process.env.MAIL_USER, validity, last],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout().catch(() => {});
  }
}
