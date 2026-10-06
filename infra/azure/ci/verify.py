import json
import subprocess
from pathlib import Path
v=json.loads((Path(__file__).resolve().parents[1]/'.local/outputs.json').read_text())
ip=v['public_ip']['value']
for path in ['/', '/install', '/api/health']:
    subprocess.run(['curl','--fail','--silent','--show-error','--retry','5','--retry-delay','5','--connect-timeout','10','--max-time','30','--resolve',f'ataimo.com:443:{ip}',f'https://ataimo.com{path}','-o','/dev/null'],check=True)
print('Live TLS homepage, public install page and application health passed.')
