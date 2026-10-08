# Notifications and optional email

New native or social identities receive one welcome email when they first complete the portfolio's authenticated callback. Creating an account only through an identity administrator, without visiting the app, does not trigger this email. Subsequent completed sign-ins queue owner activity alerts; page refreshes and session checks do not.

Welcome and activity emails use `hello@ataimo.com`, with replies directed to `contact@ataimo.com`. Owner sign-in and incoming client-message alerts are delivered separately to `admin@ataimo.com` and `edemataimo@gmail.com`. Owner replies do not email the owner again. Private message bodies stay in the authenticated workspace. Each recipient has an independent unsubscribe preference.

Mail submission uses the existing Mailu SMTP account over TLS port 465. Mailu relays outbound external delivery through the already configured SMTP2GO service. No new SMTP credential is needed. Automatic SMTP submissions are not automatically copied to the owner's Sent folder; the existing interactive mailbox composer maintains its own Sent copies.

## Delivery and opt-out

Migration `003_notifications_email.sql` adds durable `email_deliveries` and `email_preferences`. Profile/session creation and their notifications commit together. Chat writes and email queue entries also commit together. Unique deduplication keys prevent a retried chat POST or repeated welcome scheduling from creating duplicate mail jobs. The worker checks persisted email jobs independently of broker connectivity and retries failed SMTP attempts with backoff, up to six attempts. Operators can inspect exhausted records rather than losing them silently.

Each message has a stable Message-ID and escaped HTML/plain-text versions. SMTP acceptance followed by a database commit failure can still cause a retry and duplicate delivery; SMTP does not provide exactly-once delivery. Unit tests verify retry behavior and unsubscribe suppression, not exactly-once SMTP.

Every optional email includes an unsubscribe footer and RFC 8058 headers. A GET opens a confirmation page without changing preferences; the confirmation form or one-click POST updates the opaque token's preference. Tokens are random, address-specific and require no login. Queued jobs check opt-out before sending. This does not disable account access, identity-provider security emails, in-app updates or push notifications. There is currently no public resubscribe control.

## In-app and PWA notifications

Signed-in users have a notification bell in the shared header. It shows unread counts, the latest 40 notifications, mark-read controls and links to the relevant conversation or owner mailbox. Requests are scoped to the current user; read mutations check origin and ownership. The header inbox refreshes on opening, visibility restoration and every 20 seconds while visible. Loading, empty, failure and recovery states are included.

Consultation review, approval/booking, decline, progress, tasks, completion, cancellation, private chat and owner mail use the existing event and Redpanda notification pipeline. Successful sign-in additionally creates owner inbox/push deliveries transactionally. Push payloads contain generic descriptions and workspace links rather than private message content. Push requires an authenticated device registration, browser permission and platform support; physical-device delivery must be verified on the intended phone.

Owner email destinations do not grant owner access. The exact intended identity must be enrolled with the owner role and sign in again. Until then, email alerts can operate, but there is no personal owner inbox/device to receive owner in-app/push updates.

## Checks

- `node tests/unit/email-delivery.mjs`: escaping, safe URLs, unsubscribe, success, suppression and SMTP retry.
- `node tests/unit/push-delivery.mjs`: generic push, owner routing, expired endpoints and retry.
- `tests/notifications.spec.ts`: desktop/mobile unread, read, recovery, empty and anonymous states.
- `NOTIFICATION_MAIL_TEST=1 node tests/integration/notifications-cloud.mjs`: controlled live native SSO, welcome/login/chat SMTP acceptance, notification isolation, read authorization, unsubscribe and responsive inbox. This sends five test emails to the owner's addresses and removes its temporary identities and workspace records. SMTP acceptance does not prove Gmail inbox placement.
