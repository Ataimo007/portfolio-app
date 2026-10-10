# Account and workspace restructuring

## Behavior

Accounts replaces Profile in site navigation and workspace tabs. Logout is in
site navigation. Introductory workspace copy, signed-in email and platform
status belong only to Overview. Desktop tabs share a single rail; mobile tabs
stay at the bottom with safe-area padding, icons and labels. Owners also see
Users. Admin Messages has a channel selector for client chat or the mailbox.

Client messages open the existing direct conversation automatically, creating
one if needed. Owners browse a vertical client list, then open the conversation.
Related consultations are accessible from the calendar control in the chat.
Existing consultation-specific threads remain available in the thread selector.
Bold, italic and inline code render as escaped React text; the list control
inserts plain-text list items. No arbitrary HTML is rendered.

Success confirmations dismiss after five or six seconds. Recoverable errors
remain visible. Installed PWA detection includes standard display modes and
Safari navigator.standalone; installation links, actions and anonymous install
copy are hidden inside the installed app.

## Identity and security

Only configured Google, GitHub, LinkedIn and Microsoft providers trust their
email assertions. Native account email verification remains enabled. Existing
account-link ownership checks are retained; matching email addresses alone do
not authorize linking to an existing account.

GET/POST /api/auth/account serves account details, personal name updates, active
identity sessions, device sign-out, linked providers, unlink and link requests.
Every operation derives the target identity from the authenticated app session.
Mutations require same-origin requests, client/owner permission and rate limits.
Provider linking uses Keycloak application-initiated action idp_link with OIDC
state, nonce and PKCE. Callback subject must match the original account.
The provider's consent/ownership screen is necessary; no account console is used.

Native password reset and self-deletion request a random single-use email link,
valid for 15 minutes. Only its SHA-256 hash is stored. Verification completes at
/account/verify in the app, calls Keycloak's admin API, and invalidates sessions.
Social-only accounts manage passwords with their provider. The URL token is
removed from browser history after loading, and the page sends no referrer. Account verification and authenticated workspaces do not load third-party analytics.
Password policy is enforced by Keycloak as well as minimum length validation.
Deletion removes the identity, personal profile data, direct chats and push subscriptions;
historical engagements remain under Deleted account. Owner deletion is blocked.

/api/portal/users is owner-only, including its backend reads and mutations.
It lists registered identities with search/pagination and exposes per-user sign-in
activity, sessions, consultation work and chat history. Disable and Close revoke
sessions immediately; Close is reversible and retains the profile. Permanent
delete requires the user's email confirmation. Owner identities are protected.

## Deployment

Migration 005 adds account state, hashed verification challenges, audit records
and identity-session mapping. Deploy automation creates portfolio-account-api,
a backend-only service-account client with user-management, realm-view and
event-view and identity-provider-view roles, not realm administrator privileges. Its client secret lives
only in the Kubernetes portal-credentials secret. Brownfield delivery synchronizes
credentials and identity settings before migrating and rolling out the app.
SMTP uses the existing Mailu authenticated TLS connection for transactional
verification mail. No new user-supplied deployment credentials are required.

Keycloak events are enabled with a seven-day retention. Older events may not
exist; device information is limited to active sessions, IP, application and time
reported by the identity provider, without fabricated device/browser names.

## Verification

Automated browser coverage uses controlled fixtures for desktop/mobile workspace
layout, chat formatting, admin controls, profile saving, installed PWA behavior,
and expiring success confirmations. Live integration evidence is recorded below
when available; fixture screenshots are not evidence of live identity operations.
