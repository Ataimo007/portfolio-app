"""Create a private Kubernetes Secret manifest; never print credentials."""
from pathlib import Path
import json
import secrets

path = Path('infra/kubernetes/platform-secret.local.json')
if path.exists():
    raise SystemExit('Secret file already exists; kept unchanged.')
keys = ['POSTGRES_PASSWORD', 'PORTAL_DB_PASSWORD', 'KEYCLOAK_DB_PASSWORD',
        'KEYCLOAK_ADMIN_PASSWORD', 'BROKER_PASSWORD', 'KEYCLOAK_CLIENT_SECRET', 'AUTH_SECRET']
values = {key: secrets.token_hex(32) for key in keys}
values['DATABASE_URL'] = f'postgres://portal:{values["PORTAL_DB_PASSWORD"]}@postgres:5432/portfolio'
values['AMQP_URL'] = f'amqp://portal:{values["BROKER_PASSWORD"]}@broker:5672'
values['SMTP_USER'] = 'configure-before-deploy'
values['SMTP_PASSWORD'] = 'configure-before-deploy'
path.write_text(json.dumps({'apiVersion': 'v1', 'kind': 'Secret', 'metadata': {'name': 'platform-secrets', 'namespace': 'portfolio'}, 'type': 'Opaque', 'stringData': values}, indent=2) + '\n')
path.chmod(0o600)
print('Created private Kubernetes Secret manifest. Configure SMTP before deployment.')
