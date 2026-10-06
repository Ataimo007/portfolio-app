# Social login setup

All four branded buttons display their provider logos. The owner confirmed a successful Google sign-in on Azure on 5 October 2026. The remaining providers need their own application credentials and successful login checks; a logo alone does not establish an active integration.

## Required inputs

| Provider | Register the application | Credentials and additional input |
| --- | --- | --- |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/overview), create a Web application OAuth client | Client ID, client secret; consent-screen branding/audience and test users while in testing |
| GitHub | [Developer settings → OAuth Apps](https://github.com/settings/developers), create an OAuth App | Client ID, client secret; homepage and authorization callback URL |
| LinkedIn | [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps), create an app | Client ID, client secret; request **Sign In with LinkedIn using OpenID Connect** in Products; complete any required LinkedIn Page/app verification |
| Microsoft | [Microsoft Entra admin center](https://entra.microsoft.com), App registrations → New registration, Web platform | Application (client) ID, client-secret **value** (not its ID), secret expiry; supported account audience and optional tenant UUID |

Use separate development and production registrations when practical. These are provider OAuth credentials, not your personal passwords and not the portfolio's internal OIDC client secret. Do not paste secrets into chat or commit them to files. The private setup command below prompts for them.

## Azure production registrations

The live application and broker now use HTTPS. Set the homepage to `https://ataimo.com` and register these exact callbacks:

| Provider | Authorized redirect / callback URI |
| --- | --- |
| Google | `https://keycloak.ataimo.com/realms/ataimo/broker/google/endpoint` |
| GitHub | `https://keycloak.ataimo.com/realms/ataimo/broker/github/endpoint` |
| LinkedIn | `https://keycloak.ataimo.com/realms/ataimo/broker/linkedin/endpoint` |
| Microsoft | `https://keycloak.ataimo.com/realms/ataimo/broker/microsoft/endpoint` |

These callbacks go to the identity broker. Do not register the app's separate `/api/auth/callback/keycloak` endpoint with social providers.

### Google

1. Open Google Auth Platform and create/select a project.
2. Configure Branding with the application name, support email, homepage, and authorized domain `ataimo.com`. Supply genuine privacy-policy/terms URLs if required; do not invent pages.
3. Set Audience to External for public clients; add your account as a test user while testing.
4. In Clients, create a Web application client and add the Google callback above under Authorized redirect URIs.
5. Save the client ID and secret privately when shown. Use `openid profile email`; no Gmail API access is needed.

### GitHub

1. Open Settings → Developer settings → OAuth Apps → New OAuth App.
2. Set application name, homepage `https://ataimo.com`, and the GitHub callback above.
3. Register the application, copy its Client ID, and generate a client secret.
4. This integration uses `read:user user:email`; do not grant repository permissions.

### LinkedIn

1. Open the Developer Portal → Create app. Complete the application/company Page details and any ownership verification.
2. In Products, request Sign In with LinkedIn using OpenID Connect; wait for approval if required.
3. In Auth, add the LinkedIn callback above to Authorized redirect URLs.
4. Copy the Client ID and Client Secret from Auth. Required scopes are `openid profile email`.

### Microsoft

1. Open Microsoft Entra admin center → App registrations → New registration.
2. Choose the supported account types. For both work/school and personal Microsoft accounts, select the matching combined audience.
3. Add a Web redirect URI using the Microsoft callback above.
4. Copy Application (client) ID. Under Certificates & secrets, create a client secret and save its **Value**, plus expiry, immediately.
5. Under API permissions, ensure delegated Microsoft Graph `User.Read` is available. Complete administrator consent if your tenant requires it.
6. Use tenant `common` for the combined audience, `organizations` for work/school, `consumers` for personal accounts, or the tenant UUID for one organization.

### Configure the Azure cluster privately

Run from the project root in the Dev Container:

```bash
export KUBECONFIG="$PWD/infra/azure/.local/kubeconfig"
export PATH="$PWD/infra/azure/.local/bin:$PATH"
python3 infra/local-kubernetes/scripts/configure-social-login.py google --context ataimo-azure
python3 infra/local-kubernetes/scripts/configure-social-login.py github --context ataimo-azure
python3 infra/local-kubernetes/scripts/configure-social-login.py linkedin --context ataimo-azure
python3 infra/local-kubernetes/scripts/configure-social-login.py microsoft --context ataimo-azure
```

The commands prompt privately for secrets. Providers remain unverified until a real login and account-linking test passes. Local Kind still uses HTTP and needs a separate HTTPS/accepted localhost origin before enabling these registrations there.

## Permissions and endpoints

| Provider | Permissions used by this integration | Endpoint configuration |
| --- | --- | --- |
| Google | `openid profile email` | Built-in provider supplies Google authorization/token/user profile endpoints |
| GitHub | `read:user user:email` | Built-in provider supplies GitHub OAuth and profile/email API endpoints; no repo/admin permissions |
| LinkedIn | `openid profile email` | Built-in LinkedIn OpenID Connect provider supplies endpoints; avoid the retired legacy sign-in scopes |
| Microsoft | Delegated Microsoft Graph `User.Read` | Built-in provider uses `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`, `/token`, and Microsoft Graph `/v1.0/me/` |

You do not need to supply custom auth/token endpoints for these built-in providers. Enable the matching permissions/products in each provider registration. Microsoft account audience must match registration: `common` for the configured mix of organizational/personal accounts, `organizations` for work/school accounts, `consumers` for personal accounts, or a tenant UUID for one organization. Your app registration's supported account types must permit that choice. Tenant-specific consent policy can require administrator approval. The helper now captures this choice and configures Graph User.Read.

## Store credentials privately

From the Dev Container, targeting the local Kind cluster:

```bash
python3 infra/local-kubernetes/scripts/configure-social-login.py google
python3 infra/local-kubernetes/scripts/configure-social-login.py github
python3 infra/local-kubernetes/scripts/configure-social-login.py linkedin
python3 infra/local-kubernetes/scripts/configure-social-login.py microsoft
```

Each command asks for client ID and a hidden client-secret prompt. Microsoft also asks for tenant/audience. The helper preserves other providers, writes a Helm-managed Kubernetes Secret through stdin, and configures the realm's provider. Passwords/secrets are not printed, passed as shell arguments, or written into repository configuration. Helm release records contain the local secret values, as with other local credentials. The repository deployment values contain only configuration and Secret references.

## Verify before declaring enabled

After an accepted callback origin and credentials are configured, test a real account for each enabled provider: first login, subsequent login, consent denial, logout, existing-email linking and a new client's portal access. Email linking retains the broker's verification flow; an external email alone must not grant owner access. Rotate credentials before expiry and repeat login after rotation. Provider-side test audiences/consent must include the accounts used for verification. Email verification/password reset still requires separate SMTP configuration.

Sources: [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies), [GitHub OAuth registration](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [LinkedIn OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [Microsoft registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app), [Microsoft credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials), [pinned Microsoft broker source](https://github.com/keycloak/keycloak/blob/26.8.0/services/src/main/java/org/keycloak/social/microsoft/MicrosoftIdentityProvider.java).

## Published application branding

Use the same app name, **Ataimo Edem**, across the portfolio and Google consent screen.

| Field | Value |
| --- | --- |
| Application home page | `https://ataimo.com` |
| Application privacy policy | `https://ataimo.com/privacy` |
| Application terms of service | `https://ataimo.com/terms` |
| Authorized domain | `ataimo.com` |
| Google redirect URI | `https://keycloak.ataimo.com/realms/ataimo/broker/google/endpoint` |
| Logo upload file | `public/brand/ataimo-google-logo.png` (120×120) |
| Full-resolution logo | `public/brand/ataimo-app-logo.png` (512×512) |

In Google Auth Platform → Branding, enter those values and select the PNG from your project folder. Use a support email you control. Confirm domain ownership in Google Search Console using the account that manages the OAuth project, following Google's instructions. If it supplies a DNS verification TXT record, add that exact record alongside other TXT records without replacing SPF or ACME records.

Google Auth Platform → Audience controls Testing versus In production. While testing, add your Google account under Test users. Publishing the audience and verifying public branding are separate steps: complete the applicable branding review after the public pages are reachable. Using only basic `openid profile email` identity scopes avoids requesting Gmail or other sensitive API access; it does not guarantee exemption from Google's branding review. Do not add APIs or scopes this app does not use.

The policies describe the currently deployed service, not a future mail or analytics system. Review them as the operator before using them for a production consent submission. Update them when processors, retention rules or service functionality change.

Google guidance: [Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies), [Manage app branding](https://support.google.com/cloud/answer/15549049).

### Microsoft publisher-domain association

The owner-provided association document is maintained at `public/.well-known/microsoft-identity-association.json` and served at `https://ataimo.com/.well-known/microsoft-identity-association.json`. It associates application ID `26526d95-2632-4564-9a48-d741ca3d07c9`. This is public application metadata, not a client secret. Hosting the document does not by itself establish Microsoft verification approval; complete the publisher-domain verification in the Microsoft console.
