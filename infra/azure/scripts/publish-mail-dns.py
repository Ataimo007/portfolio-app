import argparse
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description='Preview or apply the owner-approved receive-first mail DNS cutover')
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
config = json.loads((root / '.local/config.json').read_text())
outputs = json.loads((root / '.local/outputs.json').read_text())
zone = config['dns']['zone']
group = config['dns']['azure']['resourceGroupName']
subscription = config['dns']['azure']['subscriptionID']
ip = outputs['public_ip']['value']
base = f'/subscriptions/{subscription}/resourceGroups/{group}/providers/Microsoft.Network/dnszones/{zone}'
records = json.loads(subprocess.check_output(['az', 'network', 'dns', 'record-set', 'list', '-g', group, '-z', zone, '-o', 'json']))
lookup = {(record['name'], record['type'].rsplit('/', 1)[-1]): record for record in records}
old_mail = lookup.get(('mail', 'CNAME'))
if old_mail and old_mail['CNAMERecord']['cname'].rstrip('.') != 'woza.me':
    raise SystemExit('Unexpected mail CNAME; refusing to overwrite.')
mx = lookup.get(('@', 'MX'))
if mx and mx['MXRecords'] not in ([{'exchange': 'woza.me.', 'preference': 0}], [{'exchange': 'mail.ataimo.com.', 'preference': 10}]):
    raise SystemExit('Unexpected MX records; refusing to overwrite.')
for name in ('mail', 'webmail'):
    record = lookup.get((name, 'A'))
    if record and record['ARecords'] != [{'ipv4Address': ip}]:
        raise SystemExit('Unexpected A record for ' + name)
    if name == 'webmail' and lookup.get((name, 'CNAME')):
        raise SystemExit('Unexpected webmail CNAME; inspect before cutover.')
txt = lookup.get(('@', 'TXT'))
spf = [''.join(entry['value']).strip('"') for entry in (txt or {}).get('TXTRecords', [])
       if ''.join(entry['value']).strip('"').lower().startswith('v=spf1')]
if any(value not in ('v=spf1 mx a ip4:10.0.0.1 ~all', 'v=spf1 -all') for value in spf):
    raise SystemExit('SPF has changed, possibly for an active relay; refusing to reset it to receive-only.')
preserved = [entry for entry in (txt or {}).get('TXTRecords', [])
             if not ''.join(entry['value']).strip('"').lower().startswith('v=spf1')]
changes = [
    ('mail', 'A', {'TTL': 300, 'ARecords': [{'ipv4Address': ip}]}),
    ('webmail', 'A', {'TTL': 300, 'ARecords': [{'ipv4Address': ip}]}),
    ('@', 'TXT', {'TTL': 300, 'TXTRecords': preserved + [{'value': ['v=spf1 -all']}]}),
    ('@', 'MX', {'TTL': 300, 'MXRecords': [{'exchange': 'mail.ataimo.com.', 'preference': 10}]}),
]
if ('_dmarc', 'TXT') not in lookup:
    changes.append(('_dmarc', 'TXT', {'TTL': 300, 'TXTRecords': [{'value': ['v=DMARC1; p=none']}]}))
dkim_path = root / '.local/mail-dkim-public.json'
if dkim_path.exists():
    dkim = json.loads(dkim_path.read_text())
    if dkim['name'] != 'dkim._domainkey' or not dkim['value'].startswith('v=DKIM1; k=rsa; p='):
        raise SystemExit('Unexpected Mailu DKIM record.')
    current = lookup.get((dkim['name'], 'TXT'))
    if current and [''.join(record['value']) for record in current['TXTRecords']] != [dkim['value']]:
        raise SystemExit('Existing DKIM selector differs; refusing to replace its key.')
    chunks = [dkim['value'][i:i + 255] for i in range(0, len(dkim['value']), 255)]
    changes.append((dkim['name'], 'TXT', {'TTL': 300, 'TXTRecords': [{'value': chunks}]}))
print('mail/webmail A -> ' + ip + '; MX -> mail.ataimo.com; receive-only SPF -all; DMARC monitoring policy. Non-mail records preserved.')
if not args.execute:
    raise SystemExit('Preview only; use --execute after mailbox, TLS and public inbound port checks.')
os.umask(0o077)
backup = root / '.local/mail-dns-backup.json'
if not backup.exists():
    backup.write_text(json.dumps(records, indent=2) + '\n')
    backup.chmod(0o600)
if old_mail:
    subprocess.run(['az', 'rest', '--method', 'delete', '--url', old_mail['id'] + '?api-version=2018-05-01',
                    '--headers', 'If-Match=' + old_mail['etag'], '--output', 'none'], check=True)
for name, kind, properties in changes:
    current = lookup.get((name, kind))
    condition = 'If-Match=' + current['etag'] if current else 'If-None-Match=*'
    subprocess.run(['az', 'rest', '--method', 'put', '--url', base + '/' + kind + '/' + name + '?api-version=2018-05-01',
                    '--headers', condition, '--body', json.dumps({'properties': properties}), '--output', 'none'], check=True)
print('Approved mail DNS records saved. Registration email receipt remains an external delivery check.')
