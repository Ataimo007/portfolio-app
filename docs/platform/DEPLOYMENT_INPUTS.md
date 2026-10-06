# Deployment inputs and decisions

Do not paste credentials into chat. Configure them in the execution environment or the agreed secret mechanism. Local implementation should proceed without these where possible.

| Input | Needed for | Current status |
| --- | --- | --- |
| Actual GitHub app repository, visibility, branch and registry | Publish image, CI/GitOps, honest source references | Unknown; workspace has no Git remote |
| Azure tenant/subscription and actual offer | Account validation and production eligibility | Not supplied/verified |
| Region, maximum monthly cost, acceptable VM/storage sizing | Resource worksheet and real pricing/plan | Unknown |
| Approval for billable provisioning | Apply Terraform/deploy | Not given by this planning request |
| Domain ownership/registrar/DNS authority for ataimo.com | Certificate/DNS cutover and mail records | Target known; control unverified |
| Canonical apex/www choice and auth/webmail hostnames | URLs, redirect URIs and TLS | Proposed, not configured |
| Approved admin access (SSH/VPN/IP) | Private control plane/admin/monitoring | Unknown |
| Owner identity/MFA and optional demo access intent | Keycloak bootstrap/access policy | Role policy known; identity/demo details pending |
| Secrets approach and protected Terraform state backend | Bootstrap, GitOps and recovery | SOPS/age proposed; backend pending |
| Off-host backup destination, retention and access | Real backups/restore test | Unknown |
| Selected mail platform and confirmed mailbox/alias names | Supported mail deployment | Unselected; names are proposals only |
| Approved SMTP2GO account/domain/quotas/traffic eligibility | Real outbound relay | Unverified |
| Authorized external email test destinations | End-to-end mail acceptance | Not provided |
| Restoration test environment and budget | Demonstrated recovery/RPO/RTO | Unknown |

## Scope choices for plan review

The handoff now establishes an owner-admin plus optional demo access release, not public consultancy signup. Preserve the existing consultancy schema and defer booking/jobs/private chat as a later milestone unless the owner explicitly wants them folded back into the release. Redpanda is the new target broker. Mail platform selection waits on official support, resource fit and deployment-port validation; do not assume webmail SSO works.

## Deployment constraints verified from official guidance

Visual Studio monthly Azure credits are for dev/test only; do not approve production hosting solely because credits exist. Check the real offer and eligible paid production path. Azure outbound TCP/25 restrictions are subscription-dependent; authenticated outbound relay TCP/587 is the intended design. Cloudflare web protection does not proxy native SMTP/IMAP, and mail DNS on the same public IP exposes that origin address. External inbound acceptance and message authentication require real tests.

## Local Kind execution update

The existing cluster is named `portfolio`, with a healthy ARM64 Kind node and default local-path storage. No Azure subscription, DNS change, remote registry or production SMTP credentials are needed for this milestone. Docker Desktop currently exposes approximately 8 GiB total memory; real capacity and load acceptance must precede production sizing. Owner identity provisioning and final OIDC callback/client settings remain inputs for the next authentication phase.
