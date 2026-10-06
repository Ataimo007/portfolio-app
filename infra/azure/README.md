# Azure single-node deployment

The Azure VM and portfolio stack were deployed on 2026-10-05. Local Kind remains separate. Cloud HTTPS, username/password OIDC login/logout and fresh telemetry were verified against the VM IP. Public web DNS cutover was approved and executed; social-provider OAuth credentials remain unconfigured.

## Inputs

Use the machine with your authenticated Azure CLI, or authenticate Azure CLI inside the Dev Container. A login on macOS is not automatically available inside the container.

Provide a subscription ID, Azure region, approved VM size, SSH public/private key paths, administrator public CIDR and unique Azure DNS label. The selected size is Standard_D2as_v5 (2 vCPU, 8 GiB), with a 64 GiB OS disk and separate 128 GiB data disk. Check regional pricing and quota before applying. SSH and the Kubernetes API follow the supplied administrator CIDRs. The selected deployment profile explicitly uses 0.0.0.0/0, so SSH and the Kubernetes API are internet-accessible alongside HTTP/HTTPS.

Also provide an ACME email and the **authoritative DNS provider** for ataimo.com. The certificate chart supports Cloudflare API tokens and Azure DNS managed identity. A different provider needs its supported DNS solver/webhook before deployment. Cloudflare tokens need DNS Edit and Zone Read for this zone only; supply them interactively or through CLOUDFLARE_API_TOKEN, never in a committed file. For Azure DNS, set Terraform azure_dns_zone_id and fill the DNS subscription, resource group and generated identity client ID in the private configuration. DNS Zone Contributor is assigned only to the zone. This single-VM configuration uses node managed identity, not AKS workload identity; pods able to reach node IMDS can use that identity.

## Execution

```sh
infra/azure/scripts/install-tools.sh
cp infra/azure/terraform/terraform.tfvars.example infra/azure/terraform/terraform.tfvars
cp infra/azure/config.example.json infra/azure/.local/config.json
```

Replace placeholders in both private files. Azure CLI, SSH, kubectl and Helm must already be installed on the controller. The installer adds project-local Terraform and Ansible without replacing system versions.

```sh
infra/azure/scripts/plan.sh
infra/azure/scripts/apply.sh
```

The first command displays and saves the actual Azure plan; the second applies that saved plan. State, saved plans and private configuration are ignored by Git. Keep state backed up securely; an Azure Storage backend is a future improvement. The data disk is protected with prevent_destroy.

Before SSH, retrieve the VM SSH host public keys through authenticated Azure Run Command:

```sh
az vm run-command invoke --resource-group YOUR_RESOURCE_GROUP --name YOUR_VM_NAME \
  --command-id RunShellScript --scripts 'cat /etc/ssh/ssh_host_ed25519_key.pub'
```

Compare the trusted key with ssh-keyscan for the VM IP, then add the matching key to ~/.ssh/known_hosts. The playbooks require strict host verification and do not auto-accept an unknown host.

```sh
export SSH_PRIVATE_KEY="$HOME/.ssh/id_ed25519"
infra/azure/scripts/provision.sh
infra/azure/scripts/deploy.sh
export KUBECONFIG="$PWD/infra/azure/.local/kubeconfig"
kubectl get pods -A
helm list -A
```

Ansible mounts the dedicated disk before K3s starts, installs K3s v1.35.9+k3s1 with Traefik disabled, enables secrets encryption and installs matching kubectl plus Helm. It retrieves a private, separate kubeconfig with context ataimo-azure. It never overwrites the local Kind kubeconfig.

The VM builds AMD64 application and worker images from a filtered source archive, imports them directly into K3s containerd and installs dependencies through Helm. No remote registry is required for this first deployment. The source archive excludes environment files, private state, key files and local tooling; review your source tree for any other private material before running deploy.sh. Application credentials are generated anew in the cloud cluster. Existing local data is not migrated.

Envoy Gateway runs in ingress. K3s ServiceLB exposes its LoadBalancer service on the VM's ports 80/443; no separate Azure load balancer or Traefik is installed. Postgres stays in database with separate databases/users for the app, Keycloak and Grafana. Identity, monitoring, streaming and app retain their existing namespaces. Prometheus and broker ports remain internal. Redpanda Console requires a generated administrator password through an Envoy SecurityPolicy. Retrieve passwords privately from the appropriate cluster Secrets.

Deploy issues a staging DNS-01 certificate first, waits for it, then issues production and mounts its Secret on Envoy's HTTPS listeners. HTTP routes redirect to HTTPS. Public application routes are installed only after the production certificate is ready. DNS-01 can succeed before changing website A/CNAME records. cert-manager handles renewal; verify Certificate/Challenge events and renewal monitoring after deployment.

## DNS cutover

Terraform outputs the static public IP and Azure FQDN, such as your-label.westeurope.cloudapp.azure.com. Create:

| Record | Target |
| --- | --- |
| ataimo.com A | Terraform public_ip |
| keycloak.ataimo.com CNAME | Terraform vm_fqdn |
| grafana.ataimo.com CNAME | Terraform vm_fqdn |
| redpanda.ataimo.com CNAME | Terraform vm_fqdn |

For the apex, use an A record or your provider's supported ALIAS/CNAME flattening. Standard DNS cannot put a conventional CNAME alongside apex NS/SOA records. DNS proxying should initially be off so traffic reaches Envoy directly.

The verification script uses curl --resolve against the VM IP, validates trusted certificates, checks app/identity/Grafana responses, requires Console HTTP 401 and tests HTTP redirect. Remove the local ATAIMO gateway block in the Mac /etc/hosts when you want normal browser traffic to reach Azure. The local block currently points these names to localhost.

## Remaining live checks

The successful Azure deployment and completed checks are recorded in VALIDATION.md. Login/logout and fresh cloud telemetry were verified. Verify your real account registration, owner-role assignment, booking approval and private-chat workflows after public DNS cutover. Configure provider OAuth credentials using docs/platform/SOCIAL_LOGIN_SETUP.md after DNS/TLS cutover; merely displaying logos does not enable SSO. SMTP/password-reset email, backups/restore and HA are not established by this deployment. A single VM is a single point of failure; its persistent disk is not a backup.

## Current implementation evidence

See VALIDATION.md for the checks actually run. Cloud installation scripts are implementation, not proof of a deployed service.

After SSH host verification is established, up.sh runs plan, apply, provision and deploy in order. For a newly created VM, use the separate steps above to obtain its host key after apply before provisioning. To configure cloud social providers explicitly:

```sh
KUBECONFIG="$PWD/infra/azure/.local/kubeconfig" \
  python3 infra/local-kubernetes/scripts/configure-social-login.py --context ataimo-azure google
```

Repeat for github, linkedin and microsoft after registering the documented HTTPS callback URLs.

Validation used the official [K3s configuration](https://docs.k3s.io/installation/configuration), [ServiceLB networking](https://docs.k3s.io/networking/networking-services), [cert-manager Helm installation](https://cert-manager.io/docs/installation/helm/) and [Envoy Basic Authentication](https://gateway.envoyproxy.io/docs/tasks/security/basic-auth/) documentation.

After DNS cutover, grant your registered account the owner role using the cloud context explicitly:

```sh
KUBECONFIG="$PWD/infra/azure/.local/kubeconfig" \
  python3 infra/local-kubernetes/scripts/manage-portal-user.py --context ataimo-azure YOUR_USERNAME --role owner
```

This enables the application's booking review and client-management permissions and requires OTP enrollment at the next login. It changes identity roles; it is not part of automatic public registration.

The automated host check is `python3 infra/azure/scripts/trust-host.py`. It retrieves the ED25519 host key through authenticated Azure Run Command, compares it with SSH keyscan and writes a private project known_hosts file used by Ansible.

If Azure resource writes fail with RequestDisallowedByAzure and an MFA requirement, run `python3 infra/azure/scripts/login-mfa.py` in the controller terminal. This requests the MFA authentication claim with device-code login while retaining the selected subscription. Complete the browser authentication yourself, then regenerate the Terraform plan. Read access and obtaining an ARM token do not prove a session can create resources. See Microsoft's [MFA troubleshooting](https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-troubleshooting#troubleshooting-multifactor-authentication-mfa).

## Deployed environment — 2026-10-05

- Resource group: ataimo-platform-rg; region: westeurope; size: Standard_D2as_v5.
- Public IP: 20.229.210.201; Azure FQDN: ataimo-platform.westeurope.cloudapp.azure.com.
- K3s v1.35.9+k3s1, Traefik disabled before startup, persistent 128 GiB data disk.
- Dedicated SSH pair: infra/azure/.local/ataimo-azure-ed25519 and its .pub file, ignored by Git. Do not commit or share the private key.
- Kubeconfig: infra/azure/.local/kubeconfig, context ataimo-azure; default local Kind configuration is preserved.
- Namespaces: database, identity, monitoring, streaming, app, ingress and cert-manager.
- PostgreSQL databases: portfolio, keycloak and grafana, with separate application users.
- Redpanda has a small single-node resource profile in values/redpanda.yaml; the VM-native images are imported directly into K3s containerd.
- Production certificate covers ataimo.com, keycloak.ataimo.com, grafana.ataimo.com and redpanda.ataimo.com; expiry 2027-01-03T17:21:32Z. Renewal is configured, not yet observed over a renewal cycle.

DNS changes for the site are deliberately separate from infrastructure deployment. `python3 infra/azure/scripts/publish-dns.py` previews the four-domain cutover. Use --execute only after explicit approval of replacing the existing apex A record. It preserves mail and www, validates the inspected existing records, stores a backup and uses conditional updates. The approved apex A record is now 20.229.210.201; keycloak, grafana and redpanda CNAMEs target ataimo-platform.westeurope.cloudapp.azure.com. Authoritative answers were verified. The Azure zone's two stale Olitt nameserver entries were removed; the registrar was already correct.

Retrieve administrator credentials privately from cluster Secrets (monitoring/grafana-credentials, identity/keycloak-credentials, streaming/console-basic-auth). Public registration gives client access; grant your chosen account the owner role separately using the documented helper. No owner account is automatically assigned.

### Deploy application-only updates

After local checks, run `bash infra/azure/scripts/deploy-app.sh` from the project root. It uploads the filtered source bundle, builds a new native image on the VM, imports it to K3s and updates only the portfolio Helm release using its existing values. It does not rerun infrastructure installation, database migrations, identity synchronization or certificate issuance. Use the full deployment flow when those components change.

Public Google consent assets: `https://ataimo.com/privacy`, `https://ataimo.com/terms`, and `https://ataimo.com/brand/ataimo-google-logo.png`. Editable exports are in `public/brand`; configuration steps are in `docs/platform/SOCIAL_LOGIN_SETUP.md`.

## Receive-first mail

Mailu and Roundcube are now deployed in `mail`, with dedicated PostgreSQL databases in `database`, encrypted mail-client access, private DNSSEC resolver, Envoy webmail routing and public mail DNS. Mailbox and client settings, deployment commands and the pending SMTP2GO relay are documented in [mail/README.md](mail/README.md). The authenticated SMTP2GO relay is configured; external recipient delivery testing and Keycloak mail delivery remain pending.
