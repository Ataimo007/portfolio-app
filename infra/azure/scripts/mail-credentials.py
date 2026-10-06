import base64
import json
import os
from pathlib import Path
import secrets
import subprocess

root = Path(__file__).resolve().parents[1]
chart = root.parent / 'local-kubernetes/charts/credentials'
os.umask(0o077)
nodes = json.loads(subprocess.check_output(['kubectl', 'get', 'nodes', '-l', 'ataimo.com/environment=azure', '-o', 'json']))
if not nodes['items']:
    raise SystemExit('An Azure-labelled cluster is required.')

def existing(name):
    result = subprocess.run(['kubectl', 'get', 'secret', name, '-n', 'mail', '-o', 'json'], capture_output=True, text=True)
    if result.returncode == 0:
        return {key: base64.b64decode(value).decode() for key, value in json.loads(result.stdout)['data'].items()}
    if 'NotFound' not in result.stderr:
        raise SystemExit('Cannot inspect existing mail credentials; refusing to regenerate.')
    return None

values = {
    'mailu-credentials': existing('mailu-credentials') or {
        'secret-key': secrets.token_urlsafe(48),
        'admin-password': secrets.token_urlsafe(32),
        'ataimo-password': secrets.token_urlsafe(32),
    },
    'mailu-database': existing('mailu-database') or {
        'database': 'mailu', 'username': 'mailu', 'password': secrets.token_hex(32),
    },
    'roundcube-database': existing('roundcube-database') or {
        'database': 'roundcube', 'username': 'roundcube', 'password': secrets.token_hex(32),
    },
}
subprocess.run(['helm', 'upgrade', '--install', 'mail-credentials', str(chart), '-n', 'mail', '-f', '-'],
               input=json.dumps({'secrets': values}), text=True, check=True, stdout=subprocess.DEVNULL)

sql = []
for name in ('mailu', 'roundcube'):
    password = values[name + '-database']['password'].replace("'", "''")
    sql.extend([
        f"SELECT 'CREATE ROLE {name} LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{name}') \\gexec",
        f"ALTER ROLE {name} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '{password}';",
        f"SELECT 'CREATE DATABASE {name} OWNER {name}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{name}') \\gexec",
        f'ALTER DATABASE {name} OWNER TO {name};',
        f'REVOKE ALL ON DATABASE {name} FROM PUBLIC;',
        f'\\connect {name}',
        f'ALTER SCHEMA public OWNER TO {name};',
        'REVOKE CREATE ON SCHEMA public FROM PUBLIC;',
        '\\connect postgres',
    ])
result = subprocess.run(['kubectl', 'exec', '-i', '-n', 'database', 'postgres-0', '--',
                         'psql', '--username=ataimo', '--dbname=postgres', '--set=ON_ERROR_STOP=1'],
                        input='\n'.join(sql), text=True, capture_output=True)
if result.returncode:
    raise SystemExit('Dedicated mail database provisioning failed; secret-bearing output was suppressed.')
path = root / '.local/mailbox-credentials.json'
path.write_text(json.dumps({
    'webmail': 'https://webmail.ataimo.com/webmail/',
    'administration': 'https://webmail.ataimo.com/admin/',
    'server': 'mail.ataimo.com',
    'mailboxes': {
        name + '@ataimo.com': values['mailu-credentials'][name + '-password'] for name in ('admin', 'ataimo')
    },
}, indent=2) + '\n')
path.chmod(0o600)
print('Mail Secrets and dedicated PostgreSQL databases ready. Mailbox credentials saved privately in infra/azure/.local/mailbox-credentials.json.')
