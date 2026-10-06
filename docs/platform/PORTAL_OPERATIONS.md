# Client portal operations

Current workspace additions, Azure integration and verification boundaries are documented in [WORKSPACE_COMPLETION.md](WORKSPACE_COMPLETION.md). The local setup and historical acceptance evidence below remain useful for Kind development.

The portfolio design and content are preserved. `/portal` adds client and owner workflows; `/status` is public and contains measured local Kind workload readiness only. These routes are not evidence of a cloud deployment.

## Deploy and migrate

```bash
bash infra/local-kubernetes/scripts/redeploy-app.sh
```

The script preserves/generated Helm-managed credentials, synchronizes the Keycloak confidential client, builds app and worker images, loads them into Kind, runs a Helm migration job, deploys the worker, and upgrades the app. Migration SQL in `db/migrations` runs transactionally under a PostgreSQL advisory lock; checksums reject edits to applied migrations. Add a new numbered migration for subsequent changes. Only the application `portal` PostgreSQL role is used at runtime. The earlier `infra/kubernetes/postgres/portal-schema.sql.inc` remains a historical draft and is not executed by this path.

The migration job and worker are packaged in the project Helm chart `infra/local-kubernetes/charts/portal-jobs`. Browser access continues through the single Envoy gateway. No broker, database or Prometheus endpoint is exposed publicly.

## Invite accounts

Public registration is enabled through the branded `/signup` flow; new accounts receive client access only. Social sign-in needs provider credentials. See [branded accounts](BRANDED_ACCOUNTS.md). The master-realm Keycloak administrator is an infrastructure account, not a portal user. Create/invite users in the `ataimo` realm:

```bash
python3 infra/local-kubernetes/scripts/manage-portal-user.py YOUR_USERNAME --role owner --create --email YOUR_EMAIL
python3 infra/local-kubernetes/scripts/manage-portal-user.py CLIENT_USERNAME --role client --create --email CLIENT_EMAIL
```

The command reads infrastructure credentials from Kubernetes Secrets and prompts privately for a temporary password. Do not send passwords in chat. Existing realm users can receive a role without `--create`. Owner invitations require OTP enrollment; first login also requires changing an invited temporary password. Use this invitation path for owners rather than manually bypassing enrollment. Owner identity has not been inferred. Demo-viewer is read-only and sees only its own authorized job data; no customer records are shared as a demo.

## Login and access boundaries

Authorization Code with S256 PKCE, random state/nonce, explicit ID-token signature/issuer/audience/expiry checks, confidential client authentication, and a five-minute encrypted login cookie. Application session cookies contain only a random opaque token; PostgreSQL stores its SHA-256 hash, validated roles and encrypted ID-token logout hint. Sessions expire no later than the ID token, capped at 30 minutes. No access/refresh token is stored in localStorage. Expired sessions require signing in again; automatic refresh and backchannel logout are not implemented. Role changes take effect at next login or session expiry. To revoke immediate access, remove that user's portal sessions in PostgreSQL as well as updating Keycloak.

All job, message and mutation APIs authorize server-side. Writes require exact configured Origin, bounded JSON input and per-account database-backed rate limits. Owner/admin manages all engagements; client accesses its own engagements; demo-viewer cannot mutate. Public pages and health routes do not require Keycloak. Provider failures lead to a sign-in recovery page, not a public-site dependency.

HTTP and non-Secure cookies are explicitly enabled only for local development. Cloud release must set HTTPS SITE_URL/issuer, remove ALLOW_LOCAL_HTTP, configure trusted TLS transport, and update exact Keycloak redirect/logout/origin URLs. Never reuse the local HTTP configuration as production auth settings.

## Consultation flow

Owner publishes individual 30-minute slots, between 30 minutes and 180 days ahead, entered in the device timezone. Calendar display uses the client's saved IANA timezone. Clients choose a published slot, enter a title/context and request it. A pending request does not reserve the slot; up to five pending requests per client are allowed. Approval locks the slot and uses a PostgreSQL exclusion constraint, confirms one request and declines competing requests atomically. Approving makes the job booked; the owner starts it to make it active. Owner may decline, cancel, or mark an active job completed. Historical conversations on closed jobs are read-only.

The first release limits the dashboard to 100 recent jobs and 200 available slots. It has no payments, external-calendar sync, meeting-provider integration, attachments, or external-calendar notifications. Owner mailbox and device notifications are described in [WORKSPACE_COMPLETION.md](WORKSPACE_COMPLETION.md).

## Private chat and events

Messages are durable PostgreSQL records, restricted to a client's job and owner/admin. A client-generated nonce makes retrying a send idempotent. Browser polling checks for new messages every three seconds, pauses while hidden and caps retained messages. There are no external messaging integrations or public chat rooms.

Job/booking/message changes and a versioned outbox record commit together. The worker publishes metadata-only events to `ataimo.portal.events.v1` (seven-day retention); message bodies are not sent to the broker. PostgreSQL deduplication of processed event IDs creates in-portal notifications. Delivery is at least once, not exactly once. Broker downtime leaves accepted records and pending events in PostgreSQL. Publisher retries use capped exponential backoff, then stop after eight failures. Invalid envelopes are acknowledged only after a sanitized dead-letter record is saved. Database failures are retried by the consumer. The owner mailbox sends real email through Mailu. The worker detects new mail and dispatches generic Web Push alerts when configured; see [WORKSPACE_COMPLETION.md](WORKSPACE_COMPLETION.md).

Inspect delivery privately:

```bash
kubectl -n app logs deployment/portfolio-worker
kubectl -n database exec postgres-0 -- psql -U ataimo -d portfolio -c "SELECT event_type,attempts,next_attempt_at FROM event_outbox WHERE published_at IS NULL;"
```

After resolving an exhausted publish failure, an administrator can retry selected outbox IDs by resetting attempts to zero and next_attempt_at to now(). Do not delete pending outbox records to clear an error. Notify recipients only after successful processing; the booking/message itself is already saved irrespective of notification state. This is a single worker/broker local stack, not HA.

## Status contract

The worker queries four fixed kube-state-metrics series through private Prometheus every 30 seconds. Workload readiness and desired counts map to seven allowlisted component IDs; labels, pod names, internal addresses and private data never enter the public snapshot. Healthy=all desired replicas ready, degraded=some ready, unavailable=none ready, unknown=missing/old/scaled-to-zero sample. Overall prioritizes unavailable, then degraded, then unknown. Collection failures retain the last snapshot; snapshots older than 120 seconds are stale/unknown. The public API caches reads for five seconds and caps requests per app instance; it never accepts a caller's query. It exposes no CPU/latency figures without measured source definitions. Readiness is not end-to-end functional availability.

## Verification

```bash
node tests/integration/portal.mjs
PORTAL_FAULT_TESTS=1 node tests/integration/portal.mjs
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://ataimo.com npm test -- --workers=1 --timeout=90000
```

Integration verification creates temporary synthetic Keycloak users and job/message/slot records and removes them afterward. Credentials stay in memory. Fault tests temporarily reject traffic to the local Kafka broker port, restore the exact firewall rule in finally, and verify persistence/recovery. A detached 90-second watchdog removes the rule if the test is interrupted. PORTAL_IDENTITY_FAULT_TESTS=1 similarly checks a bounded identity network outage. Use only the local Kind cluster while other testers know the broker connectivity will be interrupted. Screenshots/logs live in ignored `.local`; synthetic records are not real consultation activity. The Kafka topic retains synthetic verification envelopes until retention expires.

Worker-only changes can be built and deployed with `bash infra/local-kubernetes/scripts/redeploy-worker.sh`, using the bundled worker image without recompiling the portfolio.
