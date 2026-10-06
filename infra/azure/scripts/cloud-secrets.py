import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

chart = str(Path(__file__).resolve().parents[2] / 'local-kubernetes/charts/credentials')

def install(namespace, release, values):
    subprocess.run(['helm', 'upgrade', '--install', release, chart, '-n', namespace, '-f', '-'],
                   input=json.dumps({'secrets': values}), text=True, check=True, stdout=subprocess.DEVNULL)

mode = sys.argv[1]
if mode == 'cloudflare':
    token = os.environ.get('CLOUDFLARE_API_TOKEN') or getpass.getpass('Cloudflare zone-scoped DNS API token: ')
    if not token.strip():
        raise SystemExit('DNS API token is required.')
    install('cert-manager', 'dns-credentials', {'dns-challenge-credentials': {'api-token': token}})
elif mode == 'console':
    result = subprocess.run(['kubectl', 'get', 'secret', 'console-basic-auth', '-n', 'streaming', '-o', 'json'], capture_output=True, text=True)
    if result.returncode == 0:
        raise SystemExit(0)
    if 'NotFound' not in result.stderr:
        raise SystemExit('Cannot read Console credentials; refusing to replace them.')
    password = secrets.token_urlsafe(36)
    digest = base64.b64encode(hashlib.sha1(password.encode()).digest()).decode()
    install('streaming', 'console-credentials', {'console-basic-auth': {
        '.htpasswd': f'admin:{{SHA}}{digest}\n', 'username': 'admin', 'password': password,
    }})
else:
    raise SystemExit('Use cloudflare or console.')
