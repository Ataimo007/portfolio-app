import base64
import json
import subprocess

account = json.loads(subprocess.check_output(['az', 'account', 'show', '--output', 'json'], text=True))
claims = base64.b64encode(json.dumps({'access_token': {'amr': {'essential': True, 'values': ['mfa']}}}).encode()).decode()
subprocess.run([
    'az', 'login', '--use-device-code', '--tenant', account['tenantId'],
    '--scope', 'https://management.azure.com/.default', '--claims-challenge', claims,
    '--output', 'none',
], check=True)
subprocess.run(['az', 'account', 'set', '--subscription', account['id']], check=True)
print('MFA sign-in completed; deployment can be retried.')
