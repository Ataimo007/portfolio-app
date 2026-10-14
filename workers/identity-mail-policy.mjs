import { createHmac } from "node:crypto";
export function privacyHash(
  value,
  secret = process.env.ABUSE_HMAC_KEY || process.env.SESSION_SECRET,
) {
  if (!secret || secret.length < 32)
    throw Error("Abuse prevention key unavailable");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function canonicalEmail(email) {
  const [local, host] = email.trim().toLowerCase().split("@");
  if (host === "gmail.com" || host === "googlemail.com")
    return local.split("+")[0].replaceAll(".", "") + "@gmail.com";
  return local + "@" + host;
}
export function policyNumber(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000)
    throw Error("Invalid abuse policy: " + name);
  return value;
}
export async function consumeLimit(client, key, max, seconds) {
  const result = await client.query(
    "INSERT INTO api_rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN api_rate_limits.expires_at<=now() THEN 1 ELSE api_rate_limits.hits+1 END,expires_at=CASE WHEN api_rate_limits.expires_at<=now() THEN excluded.expires_at ELSE api_rate_limits.expires_at END RETURNING hits",
    [key, seconds],
  );
  return result.rows[0].hits <= max;
}
export async function reserveIdentityMail(pool, email) {
  const hash = privacyHash(canonicalEmail(email));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(740824)");
    const suppressed = await client.query(
      "SELECT 1 FROM identity_mail_suppressions WHERE email_hash=$1",
      [hash],
    );
    let outcome = suppressed.rowCount ? "suppressed" : "reserved";
    if (outcome === "reserved") {
      const limits = [
        [
          "identity-mail:cooldown:" + hash,
          1,
          policyNumber("IDENTITY_MAIL_COOLDOWN_SECONDS", 60),
        ],
        [
          "identity-mail:recipient:" + hash,
          policyNumber("IDENTITY_MAIL_RECIPIENT_HOURLY", 3),
          3600,
        ],
        [
          "identity-mail:global",
          policyNumber("IDENTITY_MAIL_GLOBAL_HOURLY", 20),
          3600,
        ],
      ];
      for (const [key, max, seconds] of limits) {
        if (!(await consumeLimit(client, key, max, seconds))) {
          outcome = "throttled";
          break;
        }
      }
    }
    await client.query(
      "INSERT INTO identity_mail_audit(email_hash,outcome) VALUES($1,$2)",
      [hash, outcome],
    );
    await client.query("COMMIT");
    return outcome === "reserved";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
