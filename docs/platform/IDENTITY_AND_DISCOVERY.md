# Identity controls and public discoverability

## SSO protection checked on 16 October 2026

The application initiates an OpenID Connect authorization-code flow through
Keycloak. Every login generates random state, nonce and an S256 PKCE challenge.
The encrypted, HttpOnly, Secure, SameSite=Lax login cookie expires after five
minutes. The callback consumes it and checks state, nonce and the verifier through
`openid-client`; signed ID tokens are checked against the configured issuer and
client. The browser receives an opaque app-session token rather than provider
credentials. Portal sessions expire within 30 minutes and disabled/closed app
profiles cannot use them. Account linking additionally checks that the returned
identity subject matches the signed-in account.

The portfolio client is confidential, has exact HTTPS redirects/origins, requires
PKCE and disables direct password grants. Owner/admin privileges come from
explicit identity roles, never from a public form or an email string.

Google, GitHub, LinkedIn and Microsoft remain enabled. The current first-broker
flow requires confirmation plus email ownership or existing-account
reauthentication when linking an existing account. It does not silently grant
an existing identity just because an email matches. Duplicate emails are disabled.
These are configured trusted providers (`trustEmail=true`): the application
requires Keycloak's verified-email claim and does not send an additional
verification message during ordinary social sign-in. This is trust in the
configured identity provider, not an independent verification of every provider's
internal anti-abuse controls.

The signup proof-of-work challenge applies to local password registration, not
to SSO. Social providers apply their own sign-in protections; this does not make
SSO immune to automation or compromised upstream accounts. Any native Keycloak
email, including account-link email, uses the durable SMTP suppression/send guard.
See [registration protection](REGISTRATION_ABUSE.md) for limits and investigation.

Live protocol checks confirmed the exact HTTPS callback, S256 challenge,
state/nonce and secure five-minute cookie. Missing and forged login-cookie
callbacks failed without creating an app session. No third-party passwords were
used; these checks do not claim a new end-to-end login at each social provider.

## Account quarantine

A fresh private database backup and identity snapshot were saved under ignored
`infra/azure/.local/account-quarantine-*` directories before account changes.
The 49 accounts other than the two previously verified users were disabled in
Keycloak, signed out, and their existing app profiles disabled. App sessions and
push subscriptions for those profiles were revoked. Identity/profile records,
consultations, messages and investigation evidence were retained.

This is an owner-requested quarantine of existing accounts, not proof that every
account was abusive, and not a permanent allowlist preventing future registration.
Service accounts required for application operation were excluded.

The owner account exists under the requested address. The second requested
address does not exactly match the existing verified identity; that identity is
temporarily preserved pending spelling clarification. Exact addresses remain in
the private journal. No identity was created, renamed or email-verified on the
owner's behalf.

The Users screen supports All statuses, Active, Pending verification, Disabled
and Closed. Filtering happens before pagination on the server, combines with
name/email search and resets the page when the category changes. Disabled/closed
status takes priority over unverified-email status in both lists and detail views.
The endpoint remains owner-only.

## Search implementation

- Centralized the public origin with the production fallback `https://ataimo.com`;
  removed the obsolete fallback domain from metadata, sitemap, robots and example
  environment configuration.
- Added distinct descriptions and matching canonical/Open Graph/Twitter metadata
  for the main portfolio pages and case studies.
- Connected Person and WebSite structured data through stable identifiers and
  added ProfilePage markup to About. Existing project markup now uses
  SoftwareSourceCode with the public case-study URL and author identity.
- Included all public credential pages in the sitemap. Did not fabricate update
  timestamps, ratings, employment claims or ranking signals.
- Kept workspace pages out of the sitemap and marked account/status/offline pages
  noindex. API responses now carry X-Robots-Tag. Authentication and authorization
  remain the privacy boundary; robots directives are not access control.

Regression checks cover structured data, page-specific metadata, canonical URLs,
public sitemap entries, API noindex headers, category search and cross-page
filtering. Browser fixtures use reserved example.invalid addresses and create no
real accounts or email.

## Search-console follow-up

These changes make the site's content easier to crawl and interpret; they do not
guarantee indexing or a ranking. The owner's search-console accounts are not
available to this session, so submission and ownership verification are not
claimed as completed.

1. Add the domain property `ataimo.com` in Google Search Console. Copy its DNS TXT
   verification value and add that exact value to the existing Azure DNS zone;
   retain it after verification. No token should be invented or committed.
2. Submit `https://ataimo.com/sitemap.xml` and inspect `/`, `/about`, `/projects`
   and `/platform` with URL Inspection. Review indexing and Core Web Vitals over
   time.
3. Add the site to Bing Webmaster Tools, either importing the verified Google
   property or using Bing's supplied ownership record, then submit the sitemap.
4. Keep the portfolio URL on LinkedIn and GitHub, and publish substantive case
   studies as real work can be disclosed. Avoid purchased links or invented
   results. No external profile edits or search-console submissions were made.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page),
[Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Delivery evidence

Local production build (Webpack), TypeScript and lint passed. All 16 focused
workspace/discoverability browser checks passed across desktop and mobile,
including combined filtering/search, reset pagination and empty categories.
A mobile pagination control initially overlapped the fixed bottom navigation;
scoped scroll padding/margins now retain clearance for native focus/scrolling.
The status-precedence and multi-batch pagination unit checks also passed.

The default local Turbopack build timed out in its CSS loader under resource
pressure; the alternate production build completed successfully. CI continues
to exercise the standard production build. Live deployment evidence will be
appended after the delivery run; no deployment success is inferred from a local
build alone.
