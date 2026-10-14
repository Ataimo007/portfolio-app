import "server-only";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import {
  createChallenge,
  randomInt,
  verifySolution,
  type Payload,
} from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { database, transaction } from "./db";
import { PortalError } from "./portal-http";
import {
  canonicalEmail,
  privacyHash,
  policyNumber,
  consumeLimit,
} from "../workers/identity-mail-policy.mjs";
export function registrationIP(request: Request) {
  const ip = request.headers.get("x-envoy-external-address");
  if (ip && isIP(ip)) return ip;
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_LOCAL_HTTP === "true"
  )
    return "127.0.0.1";
  throw new PortalError(
    503,
    "Registration protection is temporarily unavailable.",
  );
}
export async function registrationAudit(
  request: Request,
  outcome: string,
  email?: string,
) {
  await database().query(
    "INSERT INTO registration_audit(request_id,email_hash,ip,user_agent,outcome) VALUES($1,$2,$3,$4,$5)",
    [
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.headers.get("x-request-id") || "",
      )
        ? request.headers.get("x-request-id")
        : randomUUID(),
      email ? privacyHash(canonicalEmail(email)) : null,
      registrationIP(request),
      request.headers.get("user-agent")?.slice(0, 512) || "",
      outcome,
    ],
  );
}
export async function newRegistrationChallenge(request: Request) {
  const hash = privacyHash(registrationIP(request));
  const accepted = await transaction((c) =>
    consumeLimit(c, "registration:challenge:" + hash, 20, 3600),
  );
  if (!accepted)
    throw new PortalError(
      429,
      "Too many verification attempts. Please try again later.",
    );
  const id = randomUUID(),
    expires = new Date(Date.now() + 300000);
  const challenge = await createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: 1000,
    counter: randomInt(200, 500),
    deriveKey,
    expiresAt: expires,
    data: { id },
    hmacSignatureSecret: privacyHash("registration-challenge-signature"),
    hmacKeySignatureSecret: privacyHash("registration-challenge-key"),
  });
  await database().query(
    "INSERT INTO registration_challenges(id,ip_hash,challenge,expires_at) VALUES($1,$2,$3,$4)",
    [id, hash, JSON.stringify(challenge), expires],
  );
  await database().query(
    "DELETE FROM registration_challenges WHERE expires_at<now()-interval '1 hour'",
  );
  await database().query(
    "DELETE FROM registration_audit WHERE created_at<now()-interval '30 days'",
  );
  await database().query(
    "DELETE FROM identity_mail_audit WHERE created_at<now()-interval '30 days'",
  );
  return challenge;
}
export async function verifyRegistrationChallenge(
  request: Request,
  encoded: string,
) {
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new PortalError(400, "Complete the verification check again.");
  }
  const id = payload?.challenge?.parameters?.data?.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  )
    throw new PortalError(400, "Complete the verification check again.");
  const stored = await database().query(
    "SELECT challenge FROM registration_challenges WHERE id=$1 AND ip_hash=$2 AND expires_at>now() AND consumed_at IS NULL",
    [id, privacyHash(registrationIP(request))],
  );
  if (!stored.rowCount)
    throw new PortalError(
      400,
      "This verification check expired or was already used.",
    );
  let valid = false;
  try {
    valid = (
      await verifySolution({
        challenge: stored.rows[0].challenge,
        solution: payload.solution,
        deriveKey,
        hmacSignatureSecret: privacyHash("registration-challenge-signature"),
        hmacKeySignatureSecret: privacyHash("registration-challenge-key"),
      })
    ).verified;
  } catch {}
  if (!valid)
    throw new PortalError(400, "Complete the verification check again.");
  const used = await database().query(
    "UPDATE registration_challenges SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING id",
    [id],
  );
  if (!used.rowCount)
    throw new PortalError(400, "This verification check was already used.");
}
export async function registrationAttempt(request: Request) {
  const accepted = await transaction((c) =>
    consumeLimit(
      c,
      "registration:ip:" + privacyHash(registrationIP(request)),
      policyNumber("REGISTRATION_IP_HOURLY", 5),
      3600,
    ),
  );
  if (!accepted)
    throw new PortalError(
      429,
      "Too many account requests. Please try again later.",
    );
}
export async function registrationLimits(request: Request, email: string) {
  const recipient = privacyHash(canonicalEmail(email));
  const accepted = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(740825)");
    if (
      !(await consumeLimit(
        client,
        "registration:recipient:" + recipient,
        3,
        3600,
      ))
    )
      return false;
    return consumeLimit(
      client,
      "registration:global",
      policyNumber("REGISTRATION_GLOBAL_HOURLY", 10),
      3600,
    );
  });
  if (!accepted) {
    await registrationAudit(request, "throttled", email);
    throw new PortalError(
      429,
      "Too many account requests. Please try again later.",
    );
  }
}
export async function emailSuppressed(email: string) {
  return Boolean(
    (
      await database().query(
        "SELECT 1 FROM identity_mail_suppressions WHERE email_hash=$1",
        [privacyHash(canonicalEmail(email))],
      )
    ).rowCount,
  );
}
