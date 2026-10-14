import assert from "node:assert/strict";
import { createChallenge, solveChallenge, verifySolution } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import {
  canonicalEmail,
  privacyHash,
  reserveIdentityMail,
} from "../../workers/identity-mail-policy.mjs";
process.env.ABUSE_HMAC_KEY = "x".repeat(64);
assert.equal(
  canonicalEmail(" A.Ta.Imo+fixture@GoogleMail.com "),
  "ataimo@gmail.com",
);
assert.equal(
  privacyHash(canonicalEmail("abc+one@gmail.com")),
  privacyHash(canonicalEmail("a.b.c+two@gmail.com")),
);
const key = "s".repeat(64),
  kkey = "k".repeat(64);
const challenge = await createChallenge({
  algorithm: "PBKDF2/SHA-256",
  cost: 1,
  counter: 5,
  deriveKey,
  expiresAt: new Date(Date.now() + 300000),
  hmacSignatureSecret: key,
  hmacKeySignatureSecret: kkey,
  data: { id: "fixture" },
});
const solution = await solveChallenge({
  challenge,
  deriveKey,
  hmacKeySignatureSecret: kkey,
});
assert(
  (
    await verifySolution({
      challenge,
      solution,
      deriveKey,
      hmacSignatureSecret: key,
      hmacKeySignatureSecret: kkey,
    })
  ).verified,
);
assert(
  !(
    await verifySolution({
      challenge,
      solution: { ...solution, derivedKey: "0".repeat(64) },
      deriveKey,
      hmacSignatureSecret: key,
      hmacKeySignatureSecret: kkey,
    })
  ).verified,
);
assert(
  !(
    await verifySolution({
      challenge: { ...challenge, signature: "invalid" },
      solution,
      deriveKey,
      hmacSignatureSecret: key,
      hmacKeySignatureSecret: kkey,
    })
  ).verified,
);
const state = { suppressed: false, hits: 0, outcomes: [] };
const client = {
  query: async (sql, args = []) => {
    if (sql.startsWith("SELECT 1 FROM identity_mail_suppressions"))
      return { rowCount: state.suppressed ? 1 : 0 };
    if (sql.startsWith("INSERT INTO api_rate_limits"))
      return { rows: [{ hits: ++state.hits }] };
    if (sql.startsWith("INSERT INTO identity_mail_audit"))
      state.outcomes.push(args[1]);
    return { rows: [], rowCount: 0 };
  },
  release() {},
};
const pool = { connect: async () => client };
state.suppressed = true;
assert.equal(await reserveIdentityMail(pool, "fixture@ataimo.com"), false);
assert.equal(state.hits, 0);
assert.equal(state.outcomes.at(-1), "suppressed");
state.suppressed = false;
state.hits = 10;
assert.equal(await reserveIdentityMail(pool, "fixture@ataimo.com"), false);
assert.equal(state.outcomes.at(-1), "throttled");
console.log(
  "Challenge solving, tampering rejection, Gmail alias normalization, suppression and cooldown denial passed.",
);
