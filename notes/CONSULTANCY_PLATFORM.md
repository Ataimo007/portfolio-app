# Consultation platform — implementation plan and foundation

The second portfolio design stays unchanged. The new product is a private client portal alongside the public website. Booking policy confirmed by Ataimo: **request, then approve**. Private portal chat confirmed; external communications move to another platform only when required. Deployment revised to Kubernetes on one Azure VM; K3s recommended for the balance of footprint and usability. Exact domain and subscription type remain unspecified.

## Services and responsibilities

| Service | Responsibility |
| --- | --- |
| Next.js application | Public portfolio, protected client portal and consultant dashboard |
| PostgreSQL | Profiles, consultancy jobs, availability, bookings, chat history and durable event outbox |
| Keycloak | Registration, verified email, login, password recovery and client/consultant roles through OIDC |
| RabbitMQ | Reliable background notification and reminder jobs; runs in the same Kubernetes namespace |
| Worker (next implementation phase) | Publishes committed outbox events, consumes broker jobs and delivers notifications |
| K3s / Traefik ingress | Single-VM Kubernetes and HTTPS routing to application and Keycloak |
| Mailpit (local only) | Captures test emails; does not provide an internet mailbox |
| Docker Mailserver (optional mail overlay) | SMTP submission/delivery and IMAP mailbox storage for the custom domain |

RabbitMQ is the recommended broker for this workload: queues and routing for appointment confirmations, reminders and chat notifications. Kafka/Redpanda is a viable alternative if event replay and streaming analytics become requirements. Chat messages are persisted in PostgreSQL before notifications are queued. The browser never connects directly to the broker.

One PostgreSQL instance hosts two databases with separate roles: `portfolio` owned by `portal`, and `keycloak` owned by `keycloak`. The application does not access Keycloak's database. This single-host deployment has a shared failure domain; persistent volumes are not backups or high availability.

## User journeys

1. Anyone can view the portfolio and project pages.
2. Book consultation prompts Keycloak sign-in/registration. Account verification and password reset emails use SMTP.
3. A client chooses an available slot, provides context and submits a request. Pending requests reserve the slot until approved, rejected or expired. The expiry period and slot duration will be configurable; start with 30-minute slots and a 24-hour approval hold, subject to review.
4. Ataimo uses the consultant dashboard to manage availability, approve/reject requests, and mark jobs active or completed. Approval confirms the appointment and triggers a notification.
5. Clients see requested/upcoming, active and completed jobs, with job details, booking dates and a private conversation for each job.
6. Calendar uses the client's timezone for display and UTC instants in PostgreSQL. Include month/day selection, available slots, cancellation/rescheduling and downloadable ICS appointments. Google/Microsoft calendar synchronisation can follow if needed.
7. Chat begins with private persisted text messages and unread indicators. A short authenticated polling interval while the conversation is open is sufficient for the first release; introduce WebSockets if actual latency or load requires them. No broker credentials or client-supplied ownership claims reach the browser.

## Data and correctness

The initial database schema is in `infra/kubernetes/postgres/portal-schema.sql.inc`. It contains profiles, jobs, availability windows, bookings, messages and an outbox. Identity is keyed by OIDC issuer plus subject, rather than email address.

A PostgreSQL exclusion constraint rejects overlapping pending/approved appointments even when requests arrive concurrently. APIs must also validate that slots are in an availability window, in the future and within booking policy. Completed/cancelled bookings do not reserve time. Explicitly expire pending holds through a worker so abandoned requests cannot block the calendar indefinitely.

Every protected server operation checks session validity and record ownership. Only a consultant role assigned by the operator can view other clients or change job states. Registration must never grant that role. Form submissions validate input and origin/CSRF protection; role claims are verified server-side. Account deletion, retention and attachment upload policies are separate decisions; file uploads are outside the initial text-chat release.

Write each booking/chat change and its notification event in the same database transaction. Publish the outbox through a confirm channel, then mark it published. Consumers acknowledge after success, retry transient failures, and dead-letter persistent failures. Deduplicate by event ID; SMTP delivery itself can still duplicate if a worker crashes after the remote server accepts mail but before recording success. Notification failures must not lose or undo the booking/message.

## Implementation sequence and completion checks

1. **Infrastructure foundation (this change):** local Compose, isolated databases and schema, imported Keycloak realm, broker and mail capture. Production container build, Kustomize manifests and optional Kubernetes mailbox manifest are prepared. Check service health, OIDC discovery, schema ownership and overlap rejection.
2. **Authentication and portal:** integrate an established OIDC/session library, login/logout, client profile and consultant authorization. Verify registration → email verification → login, both account isolation and consultant access. A public page must still work if login services are unavailable.
3. **Booking and jobs:** availability management, request/approval calendar, client dashboard and job states. Verify timezone/DST handling, overlapping concurrent requests, cancellation and expiry of unapproved holds.
4. **Chat and notification worker:** per-job conversations, unread state, outbox → broker → SMTP flow, retries and reminders. Verify client isolation, refresh persistence and broker outages without data loss. Add external messaging only after the channel is chosen.
5. **Production/mail:** configure exact domains, TLS, SMTP credentials, mailbox accounts, DNS and operator access. Test backups and restores, external mail delivery/receipt, and the full booking-to-chat flow before deployment.

The current portfolio app does **not yet** read these tables, perform Keycloak login, consume the broker, display a calendar or offer chat. Compose is the tested foundation for these phases, not a claim that those product features are complete.

## Local setup

```sh
python3 scripts/init-compose-env.py
# Generator refuses to overwrite an existing .env.compose.
docker compose --env-file .env.compose up -d postgres keycloak broker mailpit
# Current portfolio built as its production container, optional:
docker compose --env-file .env.compose --profile app up -d --build app
```

Local endpoints: Keycloak `http://localhost:8080`, RabbitMQ management `http://localhost:15672`, captured emails `http://localhost:8025`, optional app container `http://localhost:3002`. Existing portfolio preview on port 3000 is separate. Credentials are in the ignored, private `.env.compose`; no sample shared passwords are committed.

The realm is `portfolio`, confidential client `portfolio`, PKCE S256 enabled, password grant disabled. The imported callback URL is based on `SITE_URL`. If developing the app on port 3000 later, configure that URL deliberately. Browser and container must agree on one public issuer; the internal Keycloak URL is a transport detail and must never replace the validated issuer. Localhost in a container is not the host machine.

Initial SQL and realm import apply on first creation only. Changing environment passwords does not change existing database/broker accounts. Realm import skips existing realms. Future changes require migrations/admin updates; do not delete persistent volumes to upgrade a real deployment.

Stop without deleting data: `docker compose --env-file .env.compose stop`. Avoid `down -v` unless intentionally discarding local data.

## Production configuration

The deployment target is Kubernetes on a single Azure VM. See [`infra/kubernetes/README.md`](../infra/kubernetes/README.md) for K3s selection, sizing assumptions, rendering/applying manifests, secrets, certificates, storage and Azure mail requirements. Compose remains a local integration-test harness only. No Azure VM or live Kubernetes cluster has been created or modified.

Mailbox access remains separate from portal identity. Docker Mailserver supplies SMTP/IMAP, not an included webmail interface. Keycloak does not automatically provision mailboxes. Website, identity service and worker submit mail through authenticated SMTP.

## Custom-domain email and DNS

Yes, addresses such as `hello@ataimo.com` are possible if that is the domain owned by Ataimo. On Azure, opening NSG port 25 does not override subscription-level outbound SMTP restrictions; use an authenticated outbound relay when direct SMTP delivery is blocked. Treat the domain name here as an example until confirmed.

- Website: use A/AAAA records to the host, or a CNAME for a subdomain such as `www` to a hosting target. An ordinary CNAME cannot coexist with MX/TXT at the same name; use A/AAAA or the DNS provider's supported apex flattening/ALIAS when the root also hosts email records.
- Identity: `auth.<domain>` routes to Keycloak through the HTTPS proxy.
- Email: `mail.<domain>` needs a DNS-only A/AAAA record; the domain's MX points there. Configure matching PTR/reverse DNS through the host, SPF, DKIM and DMARC. Do not proxy SMTP/IMAP through an ordinary web proxy.
- Host: static public address, reachable inbound SMTP 25 and permitted outbound SMTP (or an authenticated outbound relay), SMTP submission 587 and IMAPS 993. A web CNAME alone does not supply these capabilities.
- Mail reliability: spam filtering, patching, certificate renewal, monitoring, reputation and mailbox backups remain ongoing operations. A hosted mailbox provider plus SMTP relay is a valid alternative if the server cannot support mail; it still uses the same custom domain.

## Primary references

- Keycloak containers: https://www.keycloak.org/server/containers
- Keycloak production: https://www.keycloak.org/server/configuration-production
- RabbitMQ tutorials: https://www.rabbitmq.com/tutorials
- PostgreSQL exclusion constraints: https://www.postgresql.org/docs/current/rangetypes.html
- Docker Mailserver setup: https://docker-mailserver.github.io/docker-mailserver/latest/examples/tutorials/basic-installation/
- Mail DNS/PTR: https://docs.mailcow.email/getstarted/prerequisite-dns/
- DNS record types: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
