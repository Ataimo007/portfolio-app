# Account security

The identity synchronization script enables Keycloak's native forgot-password
and email verification features when SMTP is configured. It reads the existing
Mailu credential from Kubernetes and never writes it to source control. Fresh
installations without SMTP keep email-required flows disabled until identity
synchronization is rerun after mail provisioning.

Native registrations must verify their email before completing authentication.
Password recovery starts with Forgot password on the branded sign-in page and
requires the time-limited email action link. Social account passwords remain
managed by the upstream provider. With trustEmail disabled, an upstream identity
whose email has not been verified may also be asked to verify its address;
provider claims do not silently bypass ownership checks.

The portal profile retains company, phone and time-zone editing and links to
the identity provider's account console for password, profile and session
management. App sessions currently expire within 30 minutes; ending a Keycloak
session or resetting a password does not immediately revoke already-issued
application sessions. Back-channel logout remains a separate hardening task.

Owner enrollment requires confirmation of the exact email address and access
to that inbox. Notification recipient addresses do not grant owner privileges.
No owner account was created for the unconfirmed admin@gmail.com address.

2026-10-08: cloud realm synchronization completed successfully with SMTP, email
verification and password recovery enabled. TypeScript and ESLint passed.
End-to-end reset email delivery and owner enrollment await address confirmation.
