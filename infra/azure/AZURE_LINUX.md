# Azure Linux node profile and OS replacement

Terraform selects the pinned x64 Gen2 Azure Linux 3 Marketplace image `MicrosoftCBLMariner:azure-linux-3:azure-linux-3-gen2:3.20260923.01`. The VM remains Standard_E2as_v5 in West Europe. The `source_image` object is configurable; changing it replaces the VM and reattaches the separately managed data disk. The disk retains `prevent_destroy`. Normal brownfield GitHub Actions runs update application images only and do not replace the OS.

Ansible installs signed node packages through `tdnf`, loads overlay and bridge networking modules, persists IP forwarding, installs checksum-verified K3s/kubectl/Helm and disables Traefik. Azure Linux uses K3s's bundled containerd; no separate Docker daemon is installed. Fresh deployment must use published `APP_IMAGE` and `WORKER_IMAGE` references. The manual deploy playbook and GitHub Actions both support those references. The Ubuntu provisioning path remains available for rollback.

The standard Marketplace image has no active SELinux policy. Provisioning refuses an active SELinux image rather than silently weakening host security; an enforcing profile needs its own tested K3s policy. Azure Linux's default INPUT and FORWARD policies remain DROP. A systemd service installs a dedicated INPUT chain for HTTP/HTTPS, the Kubernetes API, published mail ports, internal pod traffic and private VXLAN traffic before K3s starts. Azure NSG rules still govern internet access; K3s manages its forwarding and network-policy chains.

## Replacement procedure

1. Validate the exact image, packages, K3s, DNS, local-path volumes, exposed services and reboot behavior on a temporary private VM of the same size. Remove the temporary VM, NIC and OS disk after verification.
2. Save the Terraform plan and verify it changes only the VM and its data-disk attachment. Save the current VM metadata, original SSH host identity and deployment/stateful-set replica counts in ignored private controller storage.
3. Archive `/etc/rancher` privately. It includes the existing node password; the main cluster datastore, encryption material, container images and persistent volumes are already under `/var/lib/rancher/k3s` on the dedicated disk. Existing mail and configured SSO providers should not be discarded as test fixtures.
4. Gracefully scale down deployments and stateful sets, wait for database/mail/broker pods to exit, stop K3s, sync filesystems and deallocate the VM. Snapshot both the old OS disk and the data disk before applying the replacement plan. This step causes a planned single-node service interruption.
5. Apply the inspected Terraform plan, regenerate outputs and authenticate the replacement SSH host key using Azure Run Command and `scripts/trust-host.py`.
6. Provision using the saved node configuration:

   ```sh
   export SSH_PRIVATE_KEY="$PWD/infra/azure/.local/ataimo-azure-ed25519"
   export NODE_CONFIG_ARCHIVE="$PWD/infra/azure/.local/azurelinux-node-config.tgz"
   bash infra/azure/scripts/provision.sh
   ```

   The archive is restored before K3s starts. The playbook mounts existing ext4 storage without formatting it. Never use `mount_data_disk=false` on the production node; that override is solely for an isolated disposable validation VM.
7. Restore the recorded replica counts and wait for deployment/stateful-set rollouts. Verify all domains, TLS, mail authentication, database counts, monitoring, identity provider configuration and image references. Preserve the original SSH host keys if continuity is desired, reload `sshd` and authenticate the restored identity through Azure Run Command.
8. Reboot and repeat readiness/public checks. Run the existing brownfield delivery pipeline against Azure Linux to verify subsequent application updates.

## Rollback

Keep the old OS and data snapshots and private controller archives until the new node is accepted. If OS provisioning or stack validation fails, select the previous Ubuntu image through `source_image`, inspect/apply the replacement plan, reattach the existing disk and restore the saved node configuration. If persistent data itself is damaged, restore the data snapshot to a replacement disk through an explicit reviewed Terraform reconciliation; do not overwrite the only intact copy. Restoring a snapshot is not part of a normal successful cutover.

Snapshot IDs, controller archives, plans, kubeconfigs and host keys are private and must not be committed. Snapshots incur storage charges until removed. Execution evidence is recorded below after live verification; a successful temporary VM test alone is not evidence of a production cutover.

## Execution evidence

On 2026-10-10, the production VM was replaced through the inspected Terraform plan with Azure Linux 3.0.20260923, kernel 6.6.157.1-1.azl3, on the existing Standard_E2as_v5 size. Its static public IP, Azure FQDN, NIC, DNS managed identity and 128 GiB K3s disk were retained. The existing node remains `ataimo-platform` in the existing cluster; Kubernetes reports Azure Linux and containerd 2.2.7-k3s1.

The temporary private validation VM passed K3s readiness, DNS, local-path storage write/read, published HTTP service, Kubernetes API reachability and reboot persistence checks. Its VM, NIC and OS disk were deleted afterward. Production Ansible provisioning passed with no failed tasks. Formatting the existing ext4 disk was skipped, private node configuration was restored and all recorded deployment/stateful-set replicas rolled out successfully.

Production was rebooted and its disk mounted automatically, with K3s and firewall services active and no failed systemd units. HTTPS checks passed for portfolio, identity, Grafana and protected Redpanda Console. Mailbox IMAPS and SMTP STARTTLS authentication passed for the existing mail accounts. A trusted SMTP2GO port-2525 TLS connection was verified from the Postfix pod without sending email. The public platform endpoint returned fresh live Prometheus data with all seven monitored components healthy. Services needed their normal startup warm-up before these final checks passed.

Application profile, job and chat record counts matched the pre-cutover values. All four configured identity-provider aliases remained enabled. The original SSH host keys were restored and standalone kubectl/Helm verified through strict SSH host checking. Terraform's final refresh/plan returned no changes. Local infrastructure tests, Helm validation and Ansible syntax checks passed.

Rollback snapshots `ataimo-before-azurelinux-20261010-os` and `ataimo-before-azurelinux-20261010-data` are retained in the platform resource group. Private archives and controller evidence remain in ignored `.local` storage. Brownfield GitHub Actions delivery evidence will be added after the next pipeline completes.
