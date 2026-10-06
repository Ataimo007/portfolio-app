import argparse
import base64
import getpass
import json
import os
import re
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description='Configure private social OAuth credentials without shell arguments or plaintext files')
parser.add_argument('--context', choices=['kind-portfolio', 'ataimo-azure'], default='kind-portfolio')
parser.add_argument('provider', choices=['google', 'github', 'linkedin', 'microsoft'])
args = parser.parse_args()
os.environ.setdefault('KUBECONFIG', str(Path.home() / '.kube/ataimo-kind'))
context = subprocess.check_output(['kubectl', 'config', 'current-context'], text=True).strip()
if context != args.context:
    raise SystemExit('Current Kubernetes context does not match --context')
if context == 'ataimo-azure':
    os.environ['SITE_URL'] = 'https://ataimo.com'
client_id = input('OAuth client ID: ').strip()
client_secret = getpass.getpass('OAuth client secret (hidden): ').strip()
if not client_id or not client_secret:
    raise SystemExit('Both OAuth client ID and secret are required')
raw = subprocess.check_output(['kubectl', 'get', 'secret', 'social-login-credentials', '-n', 'identity', '--ignore-not-found', '-o', 'json'], text=True).strip()
values = {key: base64.b64decode(value).decode() for key, value in json.loads(raw).get('data', {}).items()} if raw else {}
prefix = args.provider.upper()
values[prefix + '_CLIENT_ID'] = client_id
values[prefix + '_CLIENT_SECRET'] = client_secret
if args.provider == 'microsoft':
    tenant = input('Microsoft tenant UUID or common/organizations/consumers [common]: ').strip() or 'common'
    if tenant not in ['common', 'organizations', 'consumers'] and not re.fullmatch(r'[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}', tenant):
        raise SystemExit('Use a tenant UUID or one of the documented Microsoft account audiences')
    values['MICROSOFT_TENANT_ID'] = tenant
infra = Path(__file__).resolve().parents[1]
subprocess.run(['helm', 'upgrade', '--install', 'social-login-credentials', str(infra / 'charts/credentials'), '-n', 'identity', '-f', '-', '--wait'], input=json.dumps({'secrets': {'social-login-credentials': values}}), text=True, check=True, stdout=subprocess.DEVNULL)
subprocess.run(['python3', str(infra / 'scripts/sync-keycloak.py')], check=True)
print('Social credentials saved privately and provider synchronized. Verify login using your provider account.')
