# Terraform remote state

Created in the current subscription, West Europe:

| GitHub production variable | Value |
| --- | --- |
| `TF_STATE_RESOURCE_GROUP` | `ataimo-terraform-rg` |
| `TF_STATE_STORAGE_ACCOUNT` | `ataimotfstate` |
| `TF_STATE_CONTAINER` | `tfstate` |
| `TF_STATE_KEY` | `ataimo-platform.tfstate` |

`bootstrap.py` creates/reuses the separately tagged state resource group and account, configures Standard LRS StorageV2, HTTPS/TLS 1.2 minimum, disabled public blob/shared-key access, versioning and 30-day blob/container soft delete. It grants the authenticated administrator Storage Blob Data Contributor and creates the private container. It writes non-credential backend identifiers into ignored `.local/state-backend.json`; it never prints or publishes Terraform state. This bootstrap storage is deliberately outside the application Terraform module so deleting/rebuilding workloads does not delete their state backend.

On this controller, the existing local state was backed up privately and migrated with:

```sh
terraform -chdir=infra/azure/terraform init -migrate-state -force-copy -lockfile=readonly -backend-config=../.local/state-backend.json
```

The destination blob was confirmed absent before copying. Remote state lineage, all 15 managed resource addresses/identities and outputs match the private original backup. State lock acquisition/release passed. No Terraform apply, VM recreation or workload deployment was needed for this migration. Preserve the private backups in `.local`; do not commit or upload them to Actions artifacts.

New controllers initialize the committed partial `backend.tf` using these identifiers and their own Azure identity. GitHub Actions uses Azure OIDC/Azure AD auth; local administrators use Azure CLI/Azure AD auth. The pipeline's OIDC service principal still needs Storage Blob Data Contributor on this account/container before it can read or lock state. Do not use storage account keys or introduce a second local state for the same live stack.

See [Azure backend authentication and locking](https://docs.hashicorp.com/terraform/language/backend/azurerm) and [Azure recovery settings](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-enable).
