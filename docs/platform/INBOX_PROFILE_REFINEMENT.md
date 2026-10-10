# Inbox, profile and resume refinement

Subsequent infrastructure update: the production node was switched to Azure Linux 3 on 2026-10-10. See the [OS replacement evidence](../../infra/azure/AZURE_LINUX.md). The Ubuntu assessment below records the earlier state during these UI changes.

The approved resume PDF and its public download now omit Gmail from the contact headline. The contact row remains centered with the original embedded fonts, kerning, colors, underlines and clickable links. A raster comparison at 2× resolution verified every pixel outside that row is identical, including all of page two. No other resume content changed; the previous editable DOCX remains a legacy source.

The owner-only user-detail API combines identity information with the application's company, phone and timezone fields. A separate Personal details card shows full name, email, phone, company, timezone, username, status, sign-in access, verification state, joined date and linked sign-in methods. Missing fields are labelled Not provided. Existing owner authorization and user-management controls are retained.

Clients now enter Messages through a conversation list. Clicking Ataimo opens the thread; Back to conversations returns to the list on mobile. A first conversation is created only when the client selects Ataimo. Existing notification links can still open a specific thread directly. Admin chat retains its client directory and channel selector.

Chat history, message fields and mailbox lists allow native scroll chaining into the surrounding page. Admin channel controls and mailbox controls have explicit vertical spacing. Inbox and Sent are accessible tabs with selected state, keyboard navigation and an associated tab panel.

## Azure Linux assessment

The production VM remains Ubuntu 24.04 on Standard_E2as_v5. Azure CLI confirmed the current size and an x64 Gen2 Azure Linux 3 image in West Europe with URN `MicrosoftCBLMariner:azure-linux-3:azure-linux-3-gen2:latest`. Microsoft's [VM overview](https://learn.microsoft.com/en-us/azure/azure-linux/azure-linux-vm-vmss-overview) lists E-series support and identifies Azure Linux 4 as preview-only.

Hardware compatibility is confirmed; application-stack compatibility has not been validated on Azure Linux. The current Terraform image and Ansible apt/Docker package setup target Ubuntu. An OS migration requires RPM package provisioning, K3s/kernel/network/SELinux validation, a tested backup and restore of PostgreSQL, mail and other persistent volumes, and a replacement VM/cutover with rollback. No OS replacement, data-disk reformat or production downtime was performed for these UI changes.

## Verification evidence

Resume raster comparison passed. Lint and TypeScript checks passed before CI. [Delivery run 38041148500](https://github.com/Ataimo007/portfolio-app/actions/runs/38041148500) successfully built and deployed application commit `03bc7b26b913b86f02116ac845aad0be68db8d7c`. All 98 desktop/mobile browser tests passed, alongside production build, email/push tests and infrastructure checks. Browser coverage includes client conversation selection, preserved chat formatting, actual wheel scrolling from chat into the page, user detail fields and Inbox/Sent tab switching.

Desktop and mobile screenshots of user details, chat and mailbox were reviewed. These use controlled fixtures, not live user data. A separate live owner-only API check verified contact, company, timezone, identity metadata and linked sign-in fields against the existing owner profile. Its temporary verification session was removed and the remaining matching session count confirmed zero. No test user accounts were created.

The HTTPS resume download matches the approved local PDF with SHA-256 `183057673eca307cd0c9f2b4e0ee01a7d97bc33ceb47a03da55393d0f7b9e004`. Application and worker rollouts and live HTTPS health checks passed. The production operating system remains Ubuntu; Azure Linux deployment is an assessed future migration, not deployed functionality.
