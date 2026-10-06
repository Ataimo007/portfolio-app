"""Generate local-only credentials without printing them or overwriting an existing file."""
from pathlib import Path
import secrets

path = Path('.env.compose')
if path.exists():
    raise SystemExit('.env.compose already exists; kept unchanged.')
keys = ['POSTGRES_PASSWORD', 'PORTAL_DB_PASSWORD', 'KEYCLOAK_DB_PASSWORD',
        'KEYCLOAK_ADMIN_PASSWORD', 'BROKER_PASSWORD', 'KEYCLOAK_CLIENT_SECRET', 'AUTH_SECRET']
path.write_text('SITE_URL=http://localhost:3002\nKEYCLOAK_ISSUER=http://localhost:8080/realms/portfolio\nKEYCLOAK_ADMIN=admin\n' + ''.join(f'{key}={secrets.token_hex(32)}\n' for key in keys))
path.chmod(0o600)
print('Created .env.compose with unique local credentials. Keep it private.')
