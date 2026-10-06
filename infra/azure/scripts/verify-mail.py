import argparse
from email.message import EmailMessage
import imaplib
import json
from pathlib import Path
import smtplib
import ssl
import time
import uuid

parser = argparse.ArgumentParser(description='Verify encrypted mail authentication and optional local-only delivery')
parser.add_argument('--local-delivery', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
credentials = json.loads((root / '.local/mailbox-credentials.json').read_text())
ip = json.loads((root / '.local/outputs.json').read_text())['public_ip']['value']
host = credentials['server']
context = ssl.create_default_context()

class MailIMAP(imaplib.IMAP4_SSL):
    def _create_socket(self, timeout):
        from socket import create_connection
        sock = create_connection((ip, self.port), timeout)
        return context.wrap_socket(sock, server_hostname=host)

accounts = {}
try:
    for account, password in credentials['mailboxes'].items():
        client = MailIMAP(host, 993, ssl_context=context, timeout=15)
        client.login(account, password)
        client.select('INBOX')
        accounts[account] = client
        print(account + ': trusted IMAPS authentication passed')
    smtp = smtplib.SMTP(timeout=15)
    smtp.connect(ip, 587)
    smtp._host = host
    smtp.ehlo()
    smtp.starttls(context=context)
    smtp.ehlo()
    smtp.login('admin@ataimo.com', credentials['mailboxes']['admin@ataimo.com'])
    print('SMTP submission: trusted STARTTLS and authentication passed')
    if args.local_delivery:
        token = str(uuid.uuid4())
        message = EmailMessage()
        message['From'] = 'admin@ataimo.com'
        message['To'] = 'admin@ataimo.com, ataimo@ataimo.com, hello@ataimo.com, contact@ataimo.com, postmaster@ataimo.com'
        message['Subject'] = 'Local mail infrastructure verification ' + token
        message['Message-ID'] = '<' + token + '@ataimo.com>'
        message.set_content('Controlled local delivery verification. This message will be removed after checking both inboxes. No external recipients.')
        smtp.send_message(message)
        found = set()
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            for account, client in accounts.items():
                client.noop()
                status, result = client.uid('search', None, 'HEADER', 'Message-ID', token)
                if status == 'OK' and result[0]:
                    found.add(account)
            if len(found) == len(accounts):
                break
            time.sleep(2)
        for account, client in accounts.items():
            status, result = client.uid('search', None, 'HEADER', 'Message-ID', token)
            if status == 'OK' and result[0]:
                for uid in result[0].split():
                    client.uid('store', uid, '+FLAGS.SILENT', '(\\Deleted)')
                    status, _ = client.uid('expunge', uid)
                    if status != 'OK':
                        raise SystemExit('UID-scoped cleanup failed; verification message remains marked deleted.')
        if len(found) != len(accounts):
            raise SystemExit('Local SMTP acceptance succeeded but both inbox deliveries were not verified within 60 seconds.')
        print('Controlled local SMTP delivery into both IMAP inboxes passed; verification messages removed.')
    smtp.quit()
finally:
    for client in accounts.values():
        try:
            client.logout()
        except imaplib.IMAP4.error:
            pass
