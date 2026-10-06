# Mail client setup

Verified 6 October 2026: incoming IMAPS on 993, authenticated SMTP STARTTLS on 587, authenticated implicit TLS on 465. One owner-authorized test from admin@ataimo.com to edemataimo@gmail.com went through Mailu and was accepted by SMTP2GO (verified TLS 1.3, upstream 250 OK). Recipient Inbox/Spam placement, received SPF/DKIM/DMARC headers and an inbound reply remain pending owner confirmation.

## Account settings

| Setting | Value |
| --- | --- |
| Account type | IMAP |
| Email / username | admin@ataimo.com, or ataimo@ataimo.com for the separate personal inbox |
| Password | The respective Mailu mailbox password, not the SMTP2GO or portfolio SSO password |
| Incoming server | mail.ataimo.com |
| Incoming port / security | 993 / SSL/TLS |
| Outgoing server | mail.ataimo.com |
| Outgoing port / security | 465 / SSL/TLS; alternatively 587 / STARTTLS |
| Outgoing authentication | Required; Password; full mailbox email address and mailbox password |
| IMAP path prefix | Blank |

Bootstrap passwords are saved privately in infra/azure/.local/mailbox-credentials.json. If you change a password in Mailu, use the new password; the bootstrap file does not update automatically. Webmail is https://webmail.ataimo.com/webmail/ and account management is https://webmail.ataimo.com/admin/.

hello@ataimo.com and contact@ataimo.com are receiving aliases for ataimo@ataimo.com. postmaster@ataimo.com receives into admin@ataimo.com. Add the two actual mailbox accounts to clients; aliases have no separate passwords/inboxes. Outbound SMTP2GO relay happens behind the mail server, so clients do not need provider credentials.

## macOS Mail

1. Open Mail and choose Mail → Add Account. Enter your mailbox email address. Choose Other Mail Account if the account-provider dialog is shown (on newer versions, choose from a list if needed).
2. Enter your name, full mailbox email address and respective mailbox password. Continue with manual settings if automatic discovery cannot identify the server.
3. Choose IMAP. Enter mail.ataimo.com for both incoming and outgoing servers. Use the full email address as the username for both servers.
4. After adding the account, open Mail → Settings → Accounts → select the new account → Server Settings.
5. Disable Automatically manage connection settings if necessary to edit ports. Set incoming port 993, Use TLS/SSL on, authentication Password. Set outgoing port 465, Use TLS/SSL on, authentication Password, with the full mailbox username/password explicitly filled in. Save.
6. Repeat for the second mailbox if desired. Compose using the desired account in the From field. Mail → Window → Connection Doctor can help inspect incoming/outgoing connection failures.

Do not add the domain through iCloud Custom Email Domain or Google Workspace; those flows move mail hosting to those providers. This configuration connects Mail directly to the existing Azure-hosted Mailu server.

## Gmail app on iPhone/iPad or Android

1. Open the Gmail app and tap your profile picture → Add another account.
2. Choose Other (IMAP) on iPhone/iPad. On Android, choose Other and select Personal (IMAP) / manual setup when prompted.
3. Enter the full mailbox email address and mailbox password.
4. Incoming: mail.ataimo.com, port 993, SSL/TLS, full mailbox username.
5. Outgoing: mail.ataimo.com, port 465, SSL/TLS, authentication required, same mailbox username/password. If the app offers STARTTLS instead, use port 587.
6. Complete setup; choose the mailbox from the profile menu or use All inboxes.

## Gmail in a desktop browser

Gmail web does not provide a general IMAP client for arbitrary hosted mailboxes. Google's current timetable restricts new third-party POP/Gmailify/Send-as configurations during Q3–Q4 2026 and removes those features in January 2027. Gmail mobile continues to support non-Google accounts. Use macOS Mail, the Gmail mobile app, or Ataimo webmail for this self-hosted inbox. No POP service or forwarding to Gmail was enabled by this task.

## Confirm the delivery test

Find the email titled Ataimo mail server — outbound delivery test in edemataimo@gmail.com, checking Spam if needed. In Gmail's message menu, choose Show original and inspect SPF, DKIM and DMARC. Reply to the test to check inbound delivery into admin@ataimo.com. Relay acceptance alone does not establish Inbox placement or passing authentication headers.

## Official references

- Apple account setup: https://support.apple.com/guide/mail/add-email-accounts-mail35803/mac
- Apple server settings: https://support.apple.com/guide/mail/change-server-settings-cpmlprefacctadv/mac
- Gmail mobile accounts: https://support.google.com/mail/answer/6078445
- Gmail third-party changes: https://support.google.com/mail/answer/17101213
