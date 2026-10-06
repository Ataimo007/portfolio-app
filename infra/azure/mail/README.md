# Ataimo mail on Azure K3s

Receive-first Mailu is deployed in namespace `mail`, using the pinned upstream Helm chart 2.8.0 / Mailu 2024.06.58. The owner approved replacing the unused woza.me mail DNS records. The authenticated SMTP2GO relay is configured using port 587 with certificate-verified STARTTLS. Recipient-side external delivery remains to be tested.

## Mailboxes and access

| Address | Purpose |
| --- | --- |
| admin@ataimo.com | Separate administrator inbox for provider and platform accounts; Mailu administrator |
| ataimo@ataimo.com | Personal consultancy inbox |
| hello@ataimo.com | Alias delivering to ataimo@ataimo.com |
| contact@ataimo.com | Alias delivering to ataimo@ataimo.com |
| postmaster@ataimo.com | Operational alias delivering to admin@ataimo.com |

Webmail: https://webmail.ataimo.com/webmail/

Administration and password changes: https://webmail.ataimo.com/admin/

Bootstrap mailbox passwords are in `infra/azure/.local/mailbox-credentials.json` (0600), outside source bundles. These are initial credentials; subsequent password changes in Mailu do not update that file or reset the account on redeployment. Mail login is separate from portfolio SSO. Use the complete email address as the username.

| Mail-client setting | Value |
| --- | --- |
| Incoming server | mail.ataimo.com |
| Protocol | IMAP, port 993, SSL/TLS |
| Outgoing server | mail.ataimo.com |
| Submission | Port 587, STARTTLS, authentication required; alternatively port 465, SSL/TLS |
| Username | Full mailbox address |
| Password | Respective mailbox password or Mailu authentication token |

Local mailbox delivery is verified. Outbound routes through SMTP2GO using a Kubernetes Secret; direct Azure port-25 sending is not used. SMTP2GO rewrites the return-path to its verified em1028308.ataimo.com subdomain, whose CNAME provides SPF. Its s1028308._domainkey CNAME provides DKIM, and link.ataimo.com provides tracking. Root SPF remains `v=spf1 -all`; adding a root include is unnecessary with this verified return-path configuration. Recipient-side SPF/DKIM/DMARC results remain unverified until an authorized external message is received.

## Infrastructure

The mail foundation Helm chart owns the production `mail-tls` Certificate, cross-namespace ReferenceGrant and private Unbound resolver. Envoy terminates webmail HTTPS using that certificate. Mailu front uses its supported mail-only TLS mode and watches the same cert-manager Secret for mail-protocol certificates. The resolver validates public DNSSEC and forwards cluster.local lookups to CoreDNS. The upstream chart supports custom pod DNS for admin, Postfix, Rspamd and webmail; front and Dovecot retain Kubernetes DNS.

Mailu administration and Roundcube have distinct `mailu` and `roundcube` databases and restricted roles on PostgreSQL in namespace `database`. No additional SQL server runs. A private Redis cache/session store is required by Mailu; it is inaccessible outside the mail workload network policies. Mail content/DKIM keys/queue use a 20Gi local-path PVC; Redis has a separate 2Gi PVC. Mailboxes have 2Gi quotas, with a 10Gi domain quota. Single-node local-path storage is persistence, not a verified backup.

The source-preserving LoadBalancer service exposes SMTP 25, SMTP TLS 465, submission 587 and IMAPS 993 through K3s ServiceLB. Terraform's optional `mail_enabled` opens only those mail ports. HTTP/HTTPS stay with Envoy. Plaintext IMAP/POP3, broker and Prometheus are not exposed. Mailu network policies restrict web traffic to the Envoy pods and backend traffic to the mail workload. Postfix does not trust the entire Kubernetes pod CIDR for unauthenticated relaying.

ClamAV and content extraction are disabled for the initial 2 CPU / 8Gi VM. Monitoring/Console CPU reservations are reduced in cloud values; measured mail rollout scheduling passed. Mail deployments use Recreate to prevent concurrent writers to the shared queue/storage and avoid surge CPU demands. Upgrades can briefly interrupt mail connections. The VM is not HA; load testing and off-host restore remain pending.

## Reproduce and verify

From the repository root:

```bash
export KUBECONFIG="$PWD/infra/azure/.local/kubeconfig"
export PATH="$PWD/infra/azure/.local/bin:$PATH"
bash infra/azure/scripts/deploy-mail.sh
python3 infra/azure/scripts/verify-mail.py --local-delivery
```

The deployment preserves existing Secrets and mailbox passwords, provisions dedicated database roles, discovers the resolver Service IP and installs the pinned Mailu chart plus existing gateway routes. It targets Azure-labelled nodes and does not modify Kind. Run after the cloud stack, production issuer, gateway and PostgreSQL exist. The cloud-wide deployment currently leaves mail as this explicit additional phase.

Enable `mail_enabled = true` in the private Terraform variables, plan/review/apply the mail NSG rule, then inspect `publish-mail-dns.py` and run it with `--execute` after mail readiness checks. DNS cutover is separate from workload deployment. The helper backs up old records, uses conditional writes, preserves unrelated TXT/web/SOA records, and refuses to reset an SPF record already changed for a relay. Do not rerun the receive-only cutover after enabling outbound email.

Azure DNS now has mail/webmail A records pointing to the static VM IP, MX preference 10 to mail.ataimo.com, one corrected receive-only SPF, the generated public Mailu DKIM selector and DMARC `p=none`. The original mail DNS backup is `infra/azure/.local/mail-dns-backup.json`. Public resolver answers were checked. Old caches can retain the prior records for their original one-hour TTL.

## SMTP2GO configuration and remaining checks

The owner registered SMTP2GO and verified the sender domain. Authentication against mail.smtp2go.com:587 passed from the Azure workload after certificate-verified STARTTLS. All three provider CNAME records resolved through the validating mail resolver. Outbound hold transports are replaced with normal SMTP/relay transports; relay TLS policy pins the expected SMTP2GO hostname and requires TLS 1.2 or newer. Credentials are in Secret mail/mailu-relay, managed by Helm mail-relay-credentials, and are not embedded in values files.

To configure or rotate credentials through a hidden password prompt:

```bash
python3 infra/azure/scripts/configure-mail-relay.py
bash infra/azure/scripts/deploy-mail.sh
```

Authentication is checked before replacing the Secret. The mail deployment detects that Secret and adds values/mail-relay.yaml automatically, preserving the relay across redeployment. Postfix restarts to load mounted override changes and updated credentials. Base values remain a receive-first profile when no relay Secret exists.

Remaining: send one message to an owner-authorized external recipient, confirm receipt and inspect its authentication headers; verify an inbound reply. Keycloak verification/password-reset SMTP still needs a separate service identity and delivery tests. Off-host mail/database backup, restore and future certificate renewal remain unverified. Rotate any SMTP password shared in chat using the hidden-prompt helper.

Verified in this phase: trusted HTTPS webmail/admin login, public TLS on 465/993, STARTTLS/authentication on 587, external TCP reachability on 25 from two independent probes, local SMTP delivery into both IMAP inboxes, alias routing in delivery logs, unknown-recipient rejection, unauthenticated relay denial, persistent volumes and PostgreSQL migrations. Controlled test messages were removed. At the receive-first checkpoint, no real external email was sent. Relay authentication was subsequently verified; third-party inbound receipt, external outbound delivery, received-message authentication alignment, off-host backup/restore and a future certificate-renewal cycle remain unverified.

## Sources

- Mailu Helm chart: https://github.com/Mailu/helm-charts
- Mailu configuration: https://mailu.io/2024.06/configuration.html
- SMTP2GO registration/review: https://support.smtp2go.com/hc/en-gb/articles/223087427-New-Account-Limits-and-the-Review-Process
- Azure SMTP restrictions: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/troubleshoot-outbound-smtp-connectivity

## Mail clients and authorized external test

See [CLIENT_SETUP.md](CLIENT_SETUP.md) for macOS Mail and Gmail mobile settings and the Gmail web limitation. The authorized test to edemataimo@gmail.com was submitted through Mailu and accepted by SMTP2GO on 6 October 2026. Inbox placement, received authentication headers and inbound reply remain pending owner confirmation.

2026-10-06 owner verification: the external SMTP2GO test was received, replied to, and mailbox access worked on a phone through IMAP. Earlier recipient-confirmation-pending notes are superseded by this owner confirmation. Received SPF/DKIM/DMARC headers and off-host restore remain separate verification items.
