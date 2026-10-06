import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description='Remove only stale Olitt nameservers from the Azure zone apex, preserving assigned Azure nameservers')
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
config = json.loads((root / '.local/config.json').read_text())
zone = config['dns']['zone']; group = config['dns']['azure']['resourceGroupName']
record = json.loads(subprocess.check_output(['az','network','dns','record-set','ns','show','-g',group,'-z',zone,'-n','@','-o','json']))
assigned = json.loads(subprocess.check_output(['az','network','dns','zone','show','-g',group,'-n',zone,'-o','json']))['nameServers']
normalize = lambda name: name.lower().rstrip('.')
expected = {normalize(name) for name in assigned}
existing = record['NSRecords']
current = {normalize(item['nsdname']) for item in existing}
stale = {'ns1.olitt.com','ns1.olitt.net'}
if not expected.issubset(current) or not (current - expected).issubset(stale):
    raise SystemExit('Unexpected nameserver set; refusing to modify the zone.')
if current == expected:
    print('Azure zone already contains only its assigned authoritative nameservers.')
    raise SystemExit(0)
print('Correction retains all four assigned Azure nameservers and removes only the two Olitt entries.')
if not args.execute:
    print('Preview only; no DNS record changed.')
    raise SystemExit(0)
backup = root / '.local/apex-ns-backup.json'
if not backup.exists():
    backup.write_text(json.dumps(record,indent=2)); backup.chmod(0o600)
body = {'properties': {'TTL': record['TTL'], 'NSRecords': [item for item in existing if normalize(item['nsdname']) in expected]}}
subprocess.run(['az','rest','--method','put','--url',record['id']+'?api-version=2018-05-01','--headers','If-Match='+record['etag'],'--body',json.dumps(body),'--output','none'],check=True)
print('Apex NS correction saved; resolver caches may retain the previous answer until TTL expiry.')
