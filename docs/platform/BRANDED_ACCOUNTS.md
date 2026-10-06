# Branded navigation and accounts

The public navigation has four entries: Home, Portfolio, Contact Us, and Login. Portfolio contains Experience, Projects, Expertise, Resume, and About Me. Download Resume remains on the Resume page. The disclosure supports native no-JavaScript interaction, keyboard activation, Escape, and outside-click dismissal.

`/login` and `/signup` start the existing confidential Authorization Code/S256 PKCE flow. They open custom portfolio-branded identity screens with username/email and password fields, ordinary Login and Sign up controls, validation and supported social-provider buttons. Passwords are submitted directly to the identity service, never proxied through application APIs. This uses the customized hosted sign-in option requested by the owner. User-facing text contains no Keycloak branding; the browser's identity hostname remains visible during authentication.

Registration is now public in the `ataimo` realm. New accounts inherit only the client role; owner/admin roles remain separately granted. Demo-viewer remains read-only even if it inherits client from realm defaults. Successful authentication creates/updates the corresponding PostgreSQL client profile and opaque application session using validated claims. No application-level user creation API or direct password grant was added. Password policy requires 12 characters and excludes username/email; temporary lockout protects repeated failures. Existing owner invitation and OTP enrollment remain supported.

The login theme extends the version-pinned `keycloak.v2` templates so password visibility, session checks, required-action forms, OTP, field validation, and broker login continue to use upstream behavior. The layout template is adapted from Keycloak 26.8.0 and should be reviewed during upgrades. Helm `identity-theme` packages text and self-hosted fonts in a ConfigMap mounted read-only by the identity Deployment. `deploy-identity.sh` synchronizes tokens from the application CSS, installs the theme, rolls identity by its content checksum, and synchronizes realm/client settings. Full deployment and app redeployment include this step.

## Social provider setup

No external provider credentials are present yet; Google, GitHub and LinkedIn are visibly disabled with a coming-soon explanation. These are not verified social login integrations. Configured providers render real identity-broker actions automatically. Google, GitHub, LinkedIn OpenID Connect and Microsoft are supported by the synchronization helper; existing other providers are preserved.

Create OAuth applications with each chosen provider. Their callback URLs are:

| Provider | Local callback |
| --- | --- |
| Google | `http://keycloak.ataimo.com/realms/ataimo/broker/google/endpoint` |
| GitHub | `http://keycloak.ataimo.com/realms/ataimo/broker/github/endpoint` |
| LinkedIn | `http://keycloak.ataimo.com/realms/ataimo/broker/linkedin/endpoint` |
| Microsoft | `http://keycloak.ataimo.com/realms/ataimo/broker/microsoft/endpoint` |

Providers can reject custom-domain HTTP callbacks. When they require HTTPS, use the intended HTTPS identity domain or a deliberately configured development HTTPS endpoint, then update issuer, hostname and callback configuration together. No public DNS or cloud change is implied. Provider-specific app approval and account verification are still external inputs.

Enter credentials privately with:

```bash
python3 infra/local-kubernetes/scripts/configure-social-login.py google
python3 infra/local-kubernetes/scripts/configure-social-login.py github
```

The helper prompts for ID/secret, preserves other providers, installs a Helm-managed Kubernetes Secret using stdin, and synchronizes enabled providers. Credentials are not written to repository files, command arguments or output. Local Helm release records also contain secret values: production requires the planned encrypted/external secret workflow. Provider account linking retains the default broker verification flow and does not blindly trust email claims.

Email verification/password-reset delivery is not enabled because SMTP is not configured. Registration works locally without email verification; this does not establish verified mailbox ownership. Before cloud release, configure transactional mail, verify-email and password recovery, HTTPS cookies/issuer, anti-abuse controls and production secret management.

## Verification

```bash
node tests/integration/account.mjs
node tests/integration/portal.mjs
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://ataimo.com npm test -- --workers=1 --timeout=90000
```

The account acceptance test creates a synthetic account through the real branded registration form, verifies password validation, client-only authorization and logout, captures desktop/mobile screens, and removes the account and PostgreSQL profile. It sends no email and does not claim social OAuth verification.

References: [Keycloak themes](https://www.keycloak.org/ui-customization/themes), [Keycloak administration](https://www.keycloak.org/docs/26.8.0/server_admin/).

Local acceptance on 5 October 2026: real account registration/login/authorization/logout checks and full portal integration passed; all 28 desktop/mobile regression cases passed in 27.0 seconds. Screenshots were inspected for the branded login/error/mobile states. Public navigation and Resume download were verified with keyboard and no-JavaScript paths. Application/worker are deployed to Kind; social providers remain awaiting real credentials and provider-side verification.

Provider logo update: the four options now show Google, LinkedIn, GitHub and Microsoft logos. Detailed registration, credentials, audience, callback/TLS and private setup steps are in [SOCIAL_LOGIN_SETUP.md](SOCIAL_LOGIN_SETUP.md). Microsoft uses delegated Graph User.Read and captures tenant/audience, following the pinned broker implementation.
