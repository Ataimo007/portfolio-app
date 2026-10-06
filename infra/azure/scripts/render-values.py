import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
local = root.parent / 'local-kubernetes'
config_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.local/config.json'
config = json.loads(config_path.read_text())
if config.get('domain') != 'ataimo.com':
    raise SystemExit('This deployment currently supports the configured ataimo.com realm and routes only.')
if config['dns']['provider'] not in ('cloudflare', 'azuredns'):
    raise SystemExit('Configure the authoritative DNS solver before deployment.')
if '@' not in config['acme_email'] or 'REPLACE' in config['acme_email']:
    raise SystemExit('Configure a real ACME contact email.')
out = root / '.local/values'
out.mkdir(parents=True, exist_ok=True, mode=0o700)
for name in ('app', 'keycloak', 'monitoring'):
    values = json.loads((local / 'values' / f'{name}.yaml').read_text())
    if name == 'app':
        for entry in values['env']:
            if entry['name'] in ('SITE_URL', 'KEYCLOAK_ISSUER'):
                entry['value'] = entry['value'].replace('http://', 'https://', 1)
            elif entry['name'] == 'ALLOW_LOCAL_HTTP':
                entry['value'] = 'false'
    elif name == 'keycloak':
        values['strategy'] = {'type': 'RollingUpdate', 'rollingUpdate': {'maxSurge': 0, 'maxUnavailable': 1}}
        for entry in values['env']:
            if entry['name'] == 'KC_HOSTNAME':
                entry['value'] = 'https://keycloak.ataimo.com'
            elif entry['name'] == 'KC_PROXY_TRUSTED_ADDRESSES':
                entry['value'] = '10.42.0.0/16'
        realm = json.loads(values['config']['ataimo-realm.json'])
        realm['sslRequired'] = 'external'
        for client in realm['clients']:
            client['redirectUris'] = ['https://ataimo.com/api/auth/callback/keycloak']
            client['webOrigins'] = ['https://ataimo.com']
        values['config']['ataimo-realm.json'] = json.dumps(realm)
    else:
        values['grafana']['resources']['requests']['cpu'] = '50m'
        values['prometheusOperator']['resources']['requests']['cpu'] = '25m'
        values['prometheus']['prometheusSpec']['resources']['requests']['cpu'] = '50m'
        values['grafana']['grafana.ini']['server']['root_url'] = 'https://grafana.ataimo.com/'
    (out / f'{name}.json').write_text(json.dumps(values, indent=2))
(out / 'certificates.json').write_text(json.dumps({
    'email': config['acme_email'], 'dns': config['dns'], 'environment': 'staging',
}, indent=2))
