import argparse
import json
from pathlib import Path
import subprocess

parser=argparse.ArgumentParser(description='Preview or execute the approved four-domain Azure DNS cutover')
parser.add_argument('--execute',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'.local/config.json').read_text())
outputs=json.loads((root/'.local/outputs.json').read_text())
zone=config['dns']['zone'];group=config['dns']['azure']['resourceGroupName']
ip=outputs['public_ip']['value'];target=outputs['vm_fqdn']['value']
records=json.loads(subprocess.check_output(['az','network','dns','record-set','list','-g',group,'-z',zone,'-o','json']))
original=json.loads((root/'.local/dns-existing-web-records.json').read_text())
expected=next(record['addresses'] for record in original if record['name']=='@' and record['type'].endswith('/A'))
existing=next(record for record in records if record['name']=='@' and record['type'].endswith('/A'))
if existing['ARecords'] not in (expected,[{'ipv4Address':ip}]):
    raise SystemExit('Apex record changed since inspection; refusing to overwrite it.')
changes=[(existing['id'],existing.get('etag'),{'TTL':300,'ARecords':[{'ipv4Address':ip}]})]
zone_id=config['dns']['azure']['subscriptionID']
base=f'/subscriptions/{zone_id}/resourceGroups/{group}/providers/Microsoft.Network/dnszones/{zone}'
for name in ('keycloak','grafana','redpanda'):
    matches=[record for record in records if record['name']==name]
    if any(not record['type'].endswith('/CNAME') for record in matches):
        raise SystemExit('Existing non-CNAME record conflicts with '+name)
    current=matches[0] if matches else None
    if current and current['CNAMERecord']['cname'].rstrip('.') != target.rstrip('.'):
        raise SystemExit('Unexpected existing CNAME for '+name)
    changes.append((base+'/CNAME/'+name,current.get('etag') if current else None,{'TTL':300,'CNAMERecord':{'cname':target+'.'}}))
print(f'{zone} A -> {ip}; keycloak/grafana/redpanda CNAME -> {target}; TTL 300; mail and www untouched.')
if not args.execute:
    print('Preview only. Explicit DNS cutover approval is required before --execute.')
    raise SystemExit(0)
backup=root/'.local/web-dns-backup.json'
if not backup.exists():
    backup.write_text(json.dumps(records,indent=2));backup.chmod(0o600)
for resource_id,etag,properties in changes:
    conditional='If-Match='+etag if etag else 'If-None-Match=*'
    subprocess.run(['az','rest','--method','put','--url',resource_id+'?api-version=2018-05-01','--headers',conditional,'--body',json.dumps({'properties':properties}),'--output','none'],check=True)
print('Four web DNS records saved. Resolver caches may retain previous answers until their old TTL expires.')
