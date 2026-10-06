import argparse
import getpass
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description='Verify and securely install SMTP2GO SMTP credentials')
parser.add_argument('--credentials-file', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
nodes = json.loads(subprocess.check_output(['kubectl', 'get', 'nodes', '-l', 'ataimo.com/environment=azure', '-o', 'json']))
if not nodes['items']:
    raise SystemExit('An Azure-labelled cluster is required.')
if args.credentials_file:
    if args.credentials_file.stat().st_mode & 0o077:
        raise SystemExit('Credential file must have owner-only permissions.')
    credentials = json.loads(args.credentials_file.read_text())
else:
    credentials = {'username': input('SMTP2GO SMTP username: ').strip(),
                   'password': getpass.getpass('SMTP2GO SMTP password: ')}
if not credentials.get('username') or not credentials.get('password'):
    raise SystemExit('SMTP username and password are required.')
code = '''
import json, smtplib, ssl, sys
v = json.load(sys.stdin)
try:
    with smtplib.SMTP('mail.smtp2go.com', 587, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(v['username'], v['password'])
        print('SMTP2GO trusted STARTTLS and SMTP authentication passed; no message sent.')
except smtplib.SMTPAuthenticationError as error:
    print('SMTP2GO authentication rejected with code ' + str(error.smtp_code))
    sys.exit(1)
'''
result = subprocess.run(['kubectl', 'exec', '-i', '-n', 'mail', 'deployment/mailu-admin', '--', 'python3', '-c', code],
                        input=json.dumps(credentials), text=True, capture_output=True)
if result.returncode:
    raise SystemExit('Relay connection/authentication failed; existing mail configuration preserved. ' + result.stdout.strip())
print(result.stdout.strip())
values = {'secrets': {'mailu-relay': {'relay-username': credentials['username'], 'relay-password': credentials['password']}}}
subprocess.run(['helm', 'upgrade', '--install', 'mail-relay-credentials',
                str(root.parent / 'local-kubernetes/charts/credentials'), '-n', 'mail', '-f', '-'],
               input=json.dumps(values), text=True, check=True, stdout=subprocess.DEVNULL)
print('Relay credentials installed in Kubernetes Secret mail/mailu-relay. Deploy mail to enable outbound relay.')
