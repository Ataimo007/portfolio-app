# Single-VM Azure Kubernetes deployment

Target: **K3s** on one Azure Linux VM. k0s remains viable, but these manifests use K3s's `local-path` storage class and bundled Traefik ingress. This is a deployment foundation; portal product features are planned in `notes/CONSULTANCY_PLATFORM.md` and not yet integrated.

Use a static Azure public IP and SSD storage. Initial sizing estimate for the whole application stack: 4 vCPU / 8 GiB RAM; consider 16 GiB when running mailbox filtering and larger workloads. This is a starting estimate, not a measured requirement. Neither distribution's bare-cluster minimum is a capacity estimate for PostgreSQL, Keycloak, RabbitMQ and mail together.

## Before deployment

1. Confirm the actual website/domain and Azure subscription type. Replace every `example.invalid` in `kustomization.yaml`, `ingress.yaml`, and the optional `mail.yaml`.
2. Install a pinned supported K3s release on the VM, with secrets encryption enabled. Keep Kubernetes API/SSH restricted to operator IPs or VPN. Place local-path workload storage on an attached managed disk, not temporary VM storage. K3s installation and Azure provisioning are not performed by this repository.
3. Plan HTTPS certificates for both the application and Keycloak (`web-tls`). Use cert-manager or a documented certificate renewal workflow; the ingress template alone does not issue certificates.
4. Build/push the application image and replace `ataimo-portfolio:local` in `app.yaml`. Use registry pull credentials or VM registry integration as appropriate.
5. Generate secrets locally with `python3 scripts/init-kubernetes-secret.py`; set real SMTP credentials in the private output before applying. Do not reuse local test credentials for production.
6. Schedule off-VM encrypted backups for PostgreSQL, cluster state, broker data/configuration, secrets and mailboxes; demonstrate restoration. Local PVCs do not survive disk loss.

```sh
# Inspect rendered configuration; this does not connect to Azure.
kubectl kustomize infra/kubernetes
# After the above preparation, targeting the correct cluster:
kubectl apply -f infra/kubernetes/namespace.yaml
kubectl apply -f infra/kubernetes/platform-secret.local.json
kubectl apply -k infra/kubernetes
```

Each service uses one replica. PostgreSQL and RabbitMQ use persistent claims. Keycloak uses its own PostgreSQL database. Neither database nor broker has a public ingress. Keycloak health probes use its management port internally. The application reads only its own credentials; Kubernetes service-account tokens are not mounted into workloads.

Initial SQL and realm import run only for new data. Future schema and realm changes require migrations/admin updates; changing generated ConfigMaps or Secret values does not automatically rotate persistent database passwords or replace an existing realm.

The imported realm verifies email and does not allow password grants. Consultant roles are assigned by the operator, never by client signup. Restrict the Keycloak admin interface and remove temporary bootstrap access before public launch. NetworkPolicies/operator restrictions and backup automation must be finalized with the VM deployment configuration before launch.

## Email on Azure

Opening inbound NSG port 25 is necessary for incoming SMTP, but does not unblock Azure's outbound SMTP restrictions. Microsoft permits direct outbound port 25 for standard Enterprise Agreement and MCA-E subscriptions; other subscription types have restrictions. Use an authenticated outbound relay on port 587 if direct delivery is blocked. Incoming self-hosted mail and relayed outgoing mail can coexist.

Optional `mail.yaml` is deliberately excluded from the default Kustomization. It uses direct host ports 25, 587 and 993 because ordinary HTTP ingress does not transport SMTP/IMAP. Before applying it, configure the hostname, `mail-tls` Secret, DNS A/AAAA, MX, SPF, DKIM, DMARC and Azure public-IP reverse DNS, SMTP credentials/outbound relay and mailbox accounts. The example uses lightweight Rspamd filtering and omits antivirus and Fail2Ban; evaluate protections and resource requirements before launch. No internet mail delivery has been validated.

The mailbox deployment needs an account in its persistent config before it can become fully functional. Provision it using Docker Mailserver's documented `setup` command through `kubectl exec`, keeping passwords out of shell history. Portal identities and mailbox accounts are separate. A mail client can use IMAP/SMTP; a webmail UI is not included.

Allowed public NSG ports: 80/443 for web, plus 25/587/993 only if self-hosted mail is enabled. Restrict SSH/Kubernetes API to operators; keep database, broker and Keycloak management ports private. Confirm source-IP behaviour for mail through the single-node host-port setup. Do not enable an unauthenticated relay.

## Local infrastructure verification

`compose.yaml` is retained only as a local test harness, not the production deployment target. It runs the same database schema, Keycloak realm and broker images with local mail capture. Existing preview/dev-container workflows stay unchanged.

```sh
python3 scripts/init-compose-env.py
# If .env.compose already exists, keep it; the generator will not overwrite it.
docker compose --env-file .env.compose up -d postgres keycloak broker mailpit
```

## References

- K3s requirements: https://docs.k3s.io/installation/requirements
- K3s bundled networking: https://docs.k3s.io/networking/networking-services
- k0s requirements: https://docs.k0sproject.io/stable/system-requirements/
- Azure outbound SMTP: https://learn.microsoft.com/en-us/azure/virtual-network/troubleshoot-outbound-smtp-connectivity
- Azure reverse DNS: https://learn.microsoft.com/en-us/azure/dns/dns-reverse-dns-overview
- Docker Mailserver Kubernetes: https://docker-mailserver.github.io/docker-mailserver/latest/config/advanced/kubernetes/
