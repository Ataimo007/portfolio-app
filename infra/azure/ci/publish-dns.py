import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
v = {k: d['value'] for k, d in json.loads((root/'.local/outputs.json').read_text()).items()}
config = json.loads((root/'.local/config.json').read_text())
base = f"/subscriptions/{config['dns']['azure']['subscriptionID']}/resourceGroups/{config['dns']['azure']['resourceGroupName']}/providers/Microsoft.Network/dnszones/ataimo.com"
records = json.loads(subprocess.check_output(['az','network','dns','record-set','list','-g',config['dns']['azure']['resourceGroupName'],'-z','ataimo.com','-o','json']))
lookup = {(r['name'],r['type'].rsplit('/',1)[-1]):r for r in records}
changes = [('@','A',{'TTL':300,'ARecords':[{'ipv4Address':v['public_ip']}]})]
for name in ['keycloak','grafana','redpanda'] + (['mail','webmail'] if os.environ.get('MAIL_ENABLED','true') == 'true' else []):
    if name in ['mail','webmail']:
        changes.append((name,'A',{'TTL':300,'ARecords':[{'ipv4Address':v['public_ip']}]}))
    else:
        changes.append((name,'CNAME',{'TTL':300,'CNAMERecord':{'cname':v['vm_fqdn']+'.'}}))
if os.environ.get('MAIL_ENABLED','true') == 'true' and ('@','MX') not in lookup:
    changes.append(('@','MX',{'TTL':300,'MXRecords':[{'exchange':'mail.ataimo.com.','preference':10}]}))
    txt=lookup.get(('@','TXT'))
    records=(txt or {}).get('TXTRecords',[])
    if not any(''.join(r['value']).lower().startswith('v=spf1') for r in records):
        changes.append(('@','TXT',{'TTL':300,'TXTRecords':records+[{'value':['v=spf1 -all']}]}))
    if ('_dmarc','TXT') not in lookup:
        changes.append(('_dmarc','TXT',{'TTL':300,'TXTRecords':[{'value':['v=DMARC1; p=none']}]}))
    dkim_path=root/'.local/mail-dkim-public.json'
    if dkim_path.exists():
        dkim=json.loads(dkim_path.read_text())
        if (dkim['name'],'TXT') not in lookup:
            chunks=[dkim['value'][i:i+255] for i in range(0,len(dkim['value']),255)]
            changes.append((dkim['name'],'TXT',{'TTL':300,'TXTRecords':[{'value':chunks}]}))
for name,kind,properties in changes:
    current=lookup.get((name,kind))
    if kind in ['A','CNAME'] and current and any(current.get(k)!=value for k,value in properties.items() if k!='TTL'):
        raise SystemExit('DNS cutover conflicts with existing '+name+'. Review it separately; refusing automatic overwrite.')
    if any(n==name and t!=kind and t in ['A','AAAA','CNAME'] for n,t in lookup):
        raise SystemExit('Conflicting DNS address record: '+name)
for name,kind,properties in changes:
    current=lookup.get((name,kind))
    conditional='If-Match='+current['etag'] if current else 'If-None-Match=*'
    subprocess.run(['az','rest','--method','put','--url',base+'/'+kind+'/'+name+'?api-version=2018-05-01','--headers',conditional,'--body',json.dumps({'properties':properties}),'--output','none'],check=True)
print('Fresh web/address DNS published. Mail MX/SPF/DKIM and provider verification require the documented mail cutover step.')
