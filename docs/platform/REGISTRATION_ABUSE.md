# Registration abuse: investigation and protection

## Finding and evidence

Investigated 14 October 2026 against the Azure K3s deployment. Classification:
**external public registration abuse confirmed; automated activity strongly
supported by generated names, rotating public IPs and unsolicited verification
complaints**. This is not evidence of server compromise or privilege escalation.

Before changes, the controller saved a full PostgreSQL backup, current
application/Keycloak/Envoy logs, deployment manifests, realm configuration,
identity metadata and an SMTP2GO complaint notice under an ignored private
`infra/azure/.local/registration-abuse-*` directory (0700; evidence files 0600).
The private source handoff is excluded from Git, Docker context and deployment
bundles because it includes third-party recipient information.

The baseline contained 51 non-service identity accounts: 2 email-verified and
49 unverified. Among the 49 candidate accounts, 45 have Keycloak `REGISTER`
events from 43 distinct public IPs, followed by 44 recorded
`SEND_VERIFY_EMAIL` events. Four candidates have no retained registration event,
so their creation source remains inconclusive. Candidate creation timestamps
range from 2026-10-09 11:33:37.554 UTC to 2026-10-14 01:17:45.192 UTC.
All 49 have zero recorded successful LOGIN events. No candidate has a current
portal session, consultation job or private message. One empty conversation
exists. Three have profile
rows; the owner Users detail endpoint creates a profile when a user is viewed,
so a profile row alone does not prove login.

The retained access window includes ten registration POSTs sharing the same
Chrome 142/Mac user-agent. A POST at 14 October 01:17:45.188 UTC returned 302
and correlates with the latest account creation at 01:17:45.192 UTC; forwarding
and peer addresses match. Exact request summaries are private.

The primary complaint account was created 2026-10-10 16:48:30.841 UTC,
registered at 16:48:30.850 and triggered verification at 16:48:31.475 from the
same public IP. The REGISTER details specify `register_method: form`,
OpenID Connect code flow and the portfolio callback URL. It remains enabled, email-unverified, with no successful login.
Two later action-token errors are `expired_code`, not successful verification.
The inactive-mailbox account was created 2026-10-12 01:04:45.224 UTC and triggered
verification at 01:04:45.909 from another public IP; it is also unverified with
no successful login. Exact addresses, IDs and IPs remain in private evidence.

Retained Envoy access logs cover 13 October 18:04 UTC to 14 October 04:31 UTC.
Older HTTP entries for the primary 10 October complaint account have rotated
out; Keycloak audit records and the database backup still preserve its form
registration metadata. Recent HTTP registration entries and source addresses
are captured privately; user-agent strings alone do not establish automation.

The owner's suppression-export excerpt reports one spam complaint and one
permanent inactive-address bounce. These are reported provider outcomes;
44 Keycloak send events do not prove 44 recipient inbox deliveries. The full
SMTP2GO activity/suppression export was not available through relay credentials.
One SMTP2GO complaint notice was preserved from the owner mailbox without
marking it read. Sender-reputation score/Inbox placement is not measurable
from these records; the complaint establishes a real reputation concern.

Tracked code/history searches found no Faker, bulk-user seed job or matching
victim addresses. Deployment runs schema migrations, not user population.
Gated integration scripts use fixed test names and owned plus-addresses or
reserved fixture domains, with cleanup. Commit `77039a3` contains such gated
workspace tests. Keycloak REGISTER events for unrelated addresses support the
external path instead of those tests; attribution of the four missing-event
accounts remains unproven.

## Root cause

`/api/auth/login?screen=signup` redirected to native Keycloak self-registration.
The realm allowed registration without a bot challenge or registration-specific
IP/email/send limits. Keycloak session-code/CSRF protection does not stop a bot
from initiating its own legitimate browser flow. Failed-password brute-force
protection does not limit successful registration or verification mail.

`Active` in the Users list meant enabled/default profile status, not verified.
Production `verifyEmail` was enabled and the suspect cohort received no
successful login; the app now also checks verified-email claims itself.

## Changes

- Direct Keycloak self-registration stays disabled, including on realm sync
  and fresh imports. Existing default login and all four social providers stay.
- `/signup` hosts signup and verification-resend forms. Existing signup links
  route there; the branded login page links to it.
- ALTCHA's self-hosted proof-of-work challenge is signed, expires after five
  minutes, binds to Envoy's client IP and is consumed once in PostgreSQL. Invalid,
  expired, altered, replayed or missing solutions cannot create an account or
  send verification mail. The body is bounded, origin checked and validated.
- Shared PostgreSQL limits apply across app replicas: five registration-form
  attempts/hour/IP, three eligible requests/hour/canonical email and ten eligible
  requests/hour globally. Challenge issuance is limited to twenty/hour/IP.
  Gmail dot/plus variants share recipient budgets. Only challenge-verified
  requests consume the global eligible-request budget.
- New password accounts start with no password credential, email-unverified,
  with VERIFY_EMAIL required and
  only normal client roles. Keycloak's native signed email action handles
  verification and credential setup through a signed email link containing
  VERIFY_EMAIL and UPDATE_PASSWORD. The public
  requester cannot preselect credentials for someone else. Duplicate requests
  never overwrite credentials; app resends apply only to accounts created by
  the protected flow, marked with an admin-only registrationSource attribute.
- Users show `Pending verification`; closed/disabled states remain distinct.
  The app rejects an ID token unless `email_verified` is boolean true. Trusted
  social identities continue through their existing provider verification.
- A loopback-only SMTP guard sidecar shares the Keycloak pod. All native Keycloak
  email, including verification/resend/password reset, passes through its durable
  recipient/global budgets and suppression checks, then verified TLS to Mailu.
  It accepts only the configured identity sender, one recipient and bounded
  messages. Its SMTP listener has no Service or public port. Plain SMTP is confined
  to the pod loopback; remote mail forwarding is TLS. Failures deny mail.
- Mail budgets: one/60 seconds/canonical recipient, three/hour/recipient and
  twenty/hour globally. Authenticated app password/deletion verification uses
  the same budget. SMTP2GO suppressions are retained; confirmed complaint/bounce
  recipients are mirrored as keyed hashes, not published addresses.
- The sidecar uses a dedicated PostgreSQL role with only counters, suppression
  reads and mail-audit insertion. The stable abuse HMAC key is generated privately
  and shared via Kubernetes Secrets. No public CAPTCHA vendor credentials needed.
- Registration audit records include request ID, client IP, browser details,
  outcome and keyed email hash. Registration/mail audit retention is 30 days;
  expired challenges are pruned. Keycloak authentication/admin event metadata
  is retained for 30 days with admin request representations disabled to avoid
  storing submitted passwords. Privacy copy explains this processing.

ALTCHA proof-of-work raises automation cost; it does not establish personhood.
The durable mail ceiling is essential. If adaptive distributed abuse persists,
consider adding Turnstile/hCaptcha with provider credentials or temporarily
switching password signup to an owner-approved invitation flow. Public portfolio
and social sign-in can remain available during containment.

## Deployment and rollback

Migration `007_registration_abuse.sql` adds challenges, audit and suppression
tables without modifying user records. CI includes challenge/policy unit checks,
desktop/mobile form tests, existing tests and a Helm sidecar render.
`build:platform` bundles `identity-mail-guard.cjs` into the worker image.

The Azure delivery script runs migrations, configures the stable key and dedicated
DB role, deploys the theme/mail guard through Helm, switches realm SMTP to its
loopback listener and rolls the app. Brownfield updates keep this protection
wired in; no Azure VM recreation or new public port/domain is needed.

Thresholds are configurable through `REGISTRATION_IP_HOURLY`,
`REGISTRATION_GLOBAL_HOURLY`, `IDENTITY_MAIL_COOLDOWN_SECONDS`,
`IDENTITY_MAIL_RECIPIENT_HOURLY`, `IDENTITY_MAIL_GLOBAL_HOURLY`. Registration
settings belong to app environment; guard settings belong to the
`identity-mail-guard` Secret and authenticated app environment when changing the
shared mail policy. Preserve the generated `ABUSE_HMAC_KEY` across redeployments.
Do not rotate it without migrating suppression hashes and invalidating challenges.

Rollback the app release if needed, but keep direct registration disabled and
retain the latest guard image/sidecar and SMTP binding. Rolling Keycloak back to
an image with no guard while leaving loopback SMTP configured would stop email.
Do not drop the additive tables or delete suspect accounts/evidence. Restoring
the unprotected native signup path is not a safe rollback.

## Validation status

Local: production build, TypeScript, lint, Helm rendering and focused
challenge/policy tests. Desktop/mobile browser checks solve the actual widget,
submit a payload, show success and switch to resend; screenshots are ignored
review artifacts. No live test emails go to unrelated addresses.

Production: direct self-registration was immediately disabled after evidence
capture. Protected signup, durable mail guard and end-to-end verification are
pending the delivery run and owned-mailbox validation. The 45 confirmed, still-unverified form-registration accounts were reversibly
quarantined after checking current verification and session state; no accounts
were deleted. Their original enabled flags and IDs are preserved privately.
The two verified accounts and four inconclusive accounts remain unchanged.
Final live evidence will be recorded after rollout. Re-enable a quarantined
account only after owner review and email-owner credential recovery.
