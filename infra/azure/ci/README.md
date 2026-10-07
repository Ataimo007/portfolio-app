# GitHub Actions delivery

The pipeline reuses the Azure Terraform module, K3s Ansible provisioning playbook, existing Helm charts/values, identity synchronization, TLS and mail automation. Application and worker images are built on GitHub and published to Docker Hub for Linux AMD64. Kubernetes pulls immutable digest references. No application image is built or imported on the VM during CI deployment.

## Routes

| Trigger / resources                                                                                         | Behavior                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to `main`, expected Azure VM exists                                                                    | Quality checks → publish two images → inspect Azure → verify SSH host → Helm migrations/worker → Helm app → HTTPS health checks                                                                                                       |
| Manual `greenfield`, no VM/resource group/state exists                                                      | Same quality/build steps → Terraform plan/apply → Ansible K3s (Traefik disabled) → Helm dependencies/app → DNS-01 staging/production certificates → optional mail → workspace integrations → fresh DNS address records → HTTPS checks |
| Manual `greenfield`, VM already exists                                                                      | Switch to the app-only route; Terraform and dependency installation are skipped                                                                                                                                                       |
| No VM during an ordinary push, partial resource group, Azure lookup failure, or nonempty state without a VM | Fail rather than assume an empty environment or recreate resources                                                                                                                                                                    |

Application updates preserve databases, mail, broker, identity/social-provider configuration and existing Helm values. Migrations finish before the app is upgraded. Two-image updates are serialized by workflow concurrency; a failed migration prevents app upgrade. A failed readiness check is reported as failed delivery. There is no automatic rollback of schema changes. Infrastructure changes are deliberately outside normal push deployments.

Existing resources are discovered through authenticated Azure CLI, not guessed from Terraform state. Brownfield does not need Terraform state access. An empty remote backend is required for greenfield. Import/reconcile partial resources manually rather than allowing CI to adopt or delete them. Fresh plans reject deletes and replacements.

## Required GitHub settings

Create the `production` GitHub environment. Restrict its deployment branches to `main` and protect that branch. Workflows use the environment's secrets/variables. This is setup configuration, not a permission prompt imposed by the application.

Variables:

| Name                          | Value                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| `DOCKERHUB_USERNAME`          | Docker Hub account or organization login (public identifier) |
| `DOCKERHUB_APP_REPOSITORY`    | `owner/ataimo-portfolio`                                     |
| `DOCKERHUB_WORKER_REPOSITORY` | `owner/ataimo-portfolio-worker`                              |
| `AZURE_CLIENT_ID`             | Deployment Entra application/client ID                       |
| `AZURE_TENANT_ID`             | Tenant ID                                                    |
| `AZURE_SUBSCRIPTION_ID`       | Subscription ID                                              |
| `TF_STATE_RESOURCE_GROUP`     | Remote-state storage resource group (greenfield only)        |
| `TF_STATE_STORAGE_ACCOUNT`    | Remote-state storage account (greenfield only)               |
| `TF_STATE_CONTAINER`          | Blob container (greenfield only)                             |

Secrets:

| Name                                   | Purpose                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DOCKERHUB_TOKEN`                      | Docker Hub token with read/write access to both repositories; also installed as the cluster image pull credential   |
| `AZURE_SSH_PRIVATE_KEY`                | Existing dedicated key from `infra/azure/.local/ataimo-azure-ed25519`, or matching new dedicated key for a fresh VM |
| `SMTP2GO_USERNAME`, `SMTP2GO_PASSWORD` | Optional SMTP credentials for a new mail stack; existing mail is untouched on app updates                           |

Defaults match the current deployment: `AZURE_VM_NAME=ataimo-platform`, `AZURE_RESOURCE_GROUP=ataimo-platform-rg`, `AZURE_LOCATION=westeurope`, `AZURE_VM_SIZE=Standard_D2as_v5`, `AZURE_DNS_LABEL=ataimo-platform`, `AZURE_DNS_RESOURCE_GROUP=shared`, `ACME_EMAIL=edemataimo@gmail.com`, `AZURE_ADMIN_CIDRS=["0.0.0.0/0"]`, `MAIL_ENABLED=true`, `TF_STATE_KEY=ataimo-platform.tfstate`. The resource group must match `<AZURE_VM_NAME>-rg`, as defined by the existing Terraform module. Change these variables only when intentionally targeting another stack. The realm/routes currently require `ataimo.com`.

Docker Hub repositories must exist before the first run. Username is a variable, not a masked secret, so image outputs containing the namespace are not discarded by GitHub's secret-output protection. The token and SSH key must never be committed or pasted in chat.

Set secrets from local files without printing them:

```sh
gh secret set AZURE_SSH_PRIVATE_KEY --env production < infra/azure/.local/ataimo-azure-ed25519
gh secret set DOCKERHUB_TOKEN --env production
```

## Azure OIDC identity

Use a dedicated Entra application/service principal with a federated credential. The subject must match `repo:OWNER/REPOSITORY:environment:production`, issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`. No Azure client secret is required.

The app-only route needs Azure resource read access and VM Run Command (used to verify the actual SSH host key); SSH itself uses the dedicated key. Fresh provisioning needs Contributor for the platform resources, DNS Zone Contributor on the existing `shared/ataimo.com` zone, permissions to assign the VM's DNS managed identity role, and Storage Blob Data Contributor on the state container. Role-assignment management requires an appropriately scoped RBAC administrator identity; Contributor alone cannot create that assignment. These role requirements can be split into separate identities later if desired.

See [GitHub Azure OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure), [Docker build actions](https://docs.docker.com/build/ci/github-actions/) and [Terraform Azure backend](https://developer.hashicorp.com/terraform/language/backend/azurerm).

## Remote Terraform state

Provision a dedicated private Azure Storage account/container outside the workload module. Disable public blob access, enable blob versioning and soft delete, and grant the OIDC principal Blob Data Contributor. The committed partial `backend.tf` is initialized using the configured identifiers and OIDC/Azure AD authentication with state locking. It never uploads state, plans, kubeconfig or private controller files as workflow artifacts.

The current stack’s state was migrated to the Azure backend on 2026-10-07; see [remote state settings](../state/README.md). Private local backups remain ignored. Before managing this infrastructure from another controller, initialize that same remote backend; do not create a second empty state and apply against the live stack. Brownfield app updates work without migrating that state.

To migrate deliberately from the logged-in controller, back up local state in private storage, use the committed partial backend block, then run `terraform init -migrate-state` with the chosen resource group, storage account, container and key. Use `use_azuread_auth=true` and the local Azure CLI identity for that migration; CI uses `use_oidc=true`. Verify `terraform state list` contains the current resources before removing the private backup. No migration is executed automatically by the pipeline.

## First run and later pushes

1. Authenticate GitHub CLI and choose the destination repository.
2. Configure Docker Hub repositories, GitHub environment, variables/secrets and Azure OIDC.
3. Push `main`. The current Azure VM is discovered, so this first run is an app-only deployment.
4. Inspect the Actions summary for selected route and both digest references, then check the live site.
5. For a genuinely empty target, select **Build and deploy portfolio → Run workflow → greenfield**. Provide an empty remote backend first. The workflow will never delete the current VM to simulate greenfield.

Public web/IP records are created only after fresh TLS and workload readiness. Conflicting existing DNS records stop cutover instead of replacing another target. Mail installation creates the standard mailboxes and aliases. The pipeline leaves MX/SPF/DKIM cutover and SMTP2GO domain-verification records to an explicit mail cutover when existing mail DNS is present; do not reset provider-verified records. On a genuinely empty zone it publishes the new MX/DKIM/DMARC and an appropriate receive-only SPF record; verified SMTP2GO manages its own sender records. Social-provider client credentials, provider verification and owner-role/MFA enrollment are not inferred or regenerated by CI.

## Verification status

Local application lint/typecheck/build and all 68 desktop/mobile tests passed. Routing and non-destructive-plan unit tests passed. Helm lint/rendering verifies private pull credentials on app, migration and worker. Ansible syntax and actionlint validate the new deployment definitions. Secret scanning excludes private state, environment files, keys and controller artifacts. A real GitHub run, Docker Hub publication, registry-pull rollout and fresh-cloud provisioning remain unverified until repository/authentication and deployment settings are supplied.

Remote state is provisioned: `TF_STATE_RESOURCE_GROUP=ataimo-terraform-rg`, `TF_STATE_STORAGE_ACCOUNT=ataimotfstate`, `TF_STATE_CONTAINER=tfstate`, `TF_STATE_KEY=ataimo-platform.tfstate`. The existing 15-resource state was migrated and verified without applying cloud-resource changes. Grant the deployment OIDC identity Blob Data Contributor on that state storage before infrastructure runs.
