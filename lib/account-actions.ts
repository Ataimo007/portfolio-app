import "server-only";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { database, transaction } from "./db";
import { tokenHash } from "./auth";
import {
  kc,
  revoke,
  subject,
  audit,
  type IdentityUser,
} from "./keycloak-admin";
import { PortalError, siteURL } from "./portal-http";
export async function challenge(
  clientId: string,
  purpose: "password" | "delete",
) {
  const id = await subject(clientId);
  const user = await kc<IdentityUser>(`/users/${id}`);
  if (!user.email || !user.emailVerified)
    throw new PortalError(
      409,
      "Verify your account email before requesting this operation.",
    );
  if (
    !process.env.MAIL_HOST ||
    !process.env.MAIL_USER ||
    !process.env.MAIL_PASSWORD
  )
    throw new PortalError(
      503,
      "Verification email is temporarily unavailable.",
    );
  const token = randomBytes(32).toString("base64url");
  await transaction(async (client) => {
    await client.query(
      "SELECT id FROM client_profiles WHERE id=$1 FOR UPDATE",
      [clientId],
    );
    await client.query(
      "UPDATE account_challenges SET consumed_at=now() WHERE client_id=$1 AND purpose=$2 AND consumed_at IS NULL",
      [clientId, purpose],
    );
    await client.query(
      "INSERT INTO account_challenges(token_hash,client_id,purpose,expires_at) VALUES($1,$2,$3,now()+interval '15 minutes')",
      [tokenHash(token), clientId, purpose],
    );
  });
  const url = new URL("/account/verify", siteURL());
  url.searchParams.set("token", token);
  const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465,
    secure: true,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    connectionTimeout: 8000,
    socketTimeout: 10000,
  });
  try {
    await transport.sendMail({
      from: "Ataimo <hello@ataimo.com>",
      to: user.email,
      subject:
        purpose === "password"
          ? "Reset your Ataimo password"
          : "Confirm deletion of your Ataimo account",
      text: `You requested ${purpose === "password" ? "a password reset" : "account deletion"}.\n\nOpen this link to confirm in the Ataimo app:\n${url.href}\n\nThis single-use link expires in 15 minutes. If you did not request this, ignore this email.`,
    });
  } catch {
    await database().query(
      "DELETE FROM account_challenges WHERE token_hash=$1",
      [tokenHash(token)],
    );
    throw new PortalError(
      503,
      "The verification email could not be sent. Please try again.",
    );
  } finally {
    transport.close();
  }
  await audit(clientId, clientId, purpose + ".requested");
}
export async function deleteIdentity(clientId: string, actorId: string) {
  const id = await subject(clientId);
  const roles = await kc<{ name: string }[]>(
    `/users/${id}/role-mappings/realm/composite`,
  );
  if (roles.some((r) => ["owner", "admin"].includes(r.name)))
    throw new PortalError(403, "The owner account cannot be deleted here.");
  await database().query(
    "UPDATE client_profiles SET account_status='closed' WHERE id=$1",
    [clientId],
  );
  await database().query("DELETE FROM portal_sessions WHERE client_id=$1", [
    clientId,
  ]);
  await kc(`/users/${id}`, "DELETE");
  await transaction(async (client) => {
    await client.query("DELETE FROM push_subscriptions WHERE client_id=$1", [
      clientId,
    ]);
    await client.query(
      "UPDATE client_profiles SET subject='deleted:'||id::text,display_name='Deleted account',email='',company='',phone='',account_status='deleted' WHERE id=$1",
      [clientId],
    );
    await client.query(
      "INSERT INTO account_audit(client_id,actor_id,action) VALUES($1,$2,'account.deleted')",
      [clientId, actorId],
    );
  });
}
export async function verifyChallenge(
  token: string,
  password?: string,
  confirm?: string,
) {
  return transaction(async (client) => {
    const found = await client.query(
      "SELECT c.*,p.account_status FROM account_challenges c JOIN client_profiles p ON p.id=c.client_id WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE OF c",
      [tokenHash(token)],
    );
    if (!found.rowCount || found.rows[0].account_status !== "active")
      throw new PortalError(
        410,
        "This verification link has expired or has been used. Request a new one from Accounts.",
      );
    const row = found.rows[0];
    if (row.purpose === "password") {
      if (!password || password.length < 12 || password.length > 128)
        throw new PortalError(400, "Use a password with 12 to 128 characters.");
      const id = await subject(row.client_id);
      await kc(`/users/${id}/reset-password`, "PUT", {
        type: "password",
        value: password,
        temporary: false,
      });
      await revoke(row.client_id, id);
      await audit(row.client_id, row.client_id, "password.changed");
    } else {
      if (confirm !== "DELETE")
        throw new PortalError(
          400,
          "Type DELETE to confirm permanent account deletion.",
        );
      await deleteIdentity(row.client_id, row.client_id);
    }
    await client.query(
      "UPDATE account_challenges SET consumed_at=now() WHERE token_hash=$1",
      [tokenHash(token)],
    );
    return row.purpose as "password" | "delete";
  });
}
