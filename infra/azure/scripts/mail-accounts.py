import base64
import json
from pathlib import Path
import subprocess

nodes = json.loads(subprocess.check_output(['kubectl', 'get', 'nodes', '-l', 'ataimo.com/environment=azure', '-o', 'json']))
if not nodes['items']:
    raise SystemExit('An Azure-labelled cluster is required.')
secret = json.loads(subprocess.check_output(['kubectl', 'get', 'secret', 'mailu-credentials', '-n', 'mail', '-o', 'json']))
password = base64.b64decode(secret['data']['ataimo-password']).decode()
code = '''
import json, sys
from mailu import create_app, models
payload = json.load(sys.stdin)
with create_app().app_context():
    domain = models.Domain.query.get('ataimo.com')
    if domain is None:
        raise SystemExit('Initial administrator domain is missing')
    user = models.User.query.get('ataimo@ataimo.com')
    if user is None:
        user = models.User(localpart='ataimo', domain=domain, global_admin=False, quota_bytes=2147483648,
                           displayed_name='Ataimo Edem', enable_imap=True, enable_pop=False)
        user.set_password(payload['password'])
        models.db.session.add(user)
    administrator = models.User.query.get('admin@ataimo.com')
    administrator.quota_bytes = 2147483648
    administrator.enable_pop = False
    domain.max_users = 10
    domain.max_aliases = 20
    domain.max_quota_bytes = 10737418240
    for name, target in [('hello', 'ataimo'), ('contact', 'ataimo'), ('postmaster', 'admin')]:
        alias = models.Alias.query.get(name + '@ataimo.com')
        destination = [target + '@ataimo.com']
        if alias is None:
            models.db.session.add(models.Alias(localpart=name, domain=domain, destination=destination, wildcard=False))
        elif alias.destination != destination:
            raise SystemExit('Existing alias destination differs; refusing to overwrite')
    if not domain.dkim_key:
        domain.generate_dkim_key()
    models.db.session.commit()
    print(json.dumps({'mailboxes': ['admin@ataimo.com', 'ataimo@ataimo.com'],
                      'aliases': ['hello@ataimo.com', 'contact@ataimo.com', 'postmaster@ataimo.com'],
                      'dkim': domain.dns_dkim}))
'''
result = subprocess.run(['kubectl', 'exec', '-i', '-n', 'mail', 'deployment/mailu-admin', '--', 'python3', '-c', code],
                        input=json.dumps({'password': password}), text=True, capture_output=True)
if result.returncode:
    raise SystemExit('Mailbox provisioning failed; inspect the administrator container without displaying credentials. ' + result.stderr[-1500:])
print(result.stdout)
record = json.loads(result.stdout)['dkim']
name = record.split('.ataimo.com.')[0]
value = record.split(' IN TXT "', 1)[1].rstrip('"')
path = Path(__file__).resolve().parents[1] / '.local/mail-dkim-public.json'
path.write_text(json.dumps({'name': name, 'value': value}, indent=2) + '\n')
