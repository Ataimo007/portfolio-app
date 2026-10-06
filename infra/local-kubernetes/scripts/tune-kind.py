import os
from pathlib import Path
import re
import subprocess
import sys

os.environ.setdefault('KUBECONFIG',str(Path.home()/'.kube/ataimo-kind'))
context=subprocess.check_output(['kubectl','config','current-context'],text=True).strip()
if context!='kind-portfolio':
    raise SystemExit('This adjustment is only for the local kind-portfolio cluster.')
node='portfolio-control-plane'
backup=Path(__file__).resolve().parents[1]/'.local/kind-control-plane-before'
backup.mkdir(parents=True,exist_ok=True,mode=0o700)
restore='--restore' in sys.argv
for name in ['kube-scheduler','kube-controller-manager']:
    target=f'/etc/kubernetes/manifests/{name}.yaml'
    original=subprocess.check_output(['docker','exec',node,'cat',target],text=True)
    saved=backup/(name+'.yaml')
    if restore:
        updated=saved.read_text()
    else:
        if not saved.exists():
            saved.write_text(original)
            saved.chmod(0o600)
        updated=re.sub(r'^    - --leader-elect-(lease-duration|renew-deadline|retry-period)=.*\n','',original,flags=re.MULTILINE)
        anchor='    - --leader-elect=true\n'
        if anchor not in updated:
            raise RuntimeError('Expected kubeadm leader election flag')
        updated=updated.replace(anchor,anchor+'    - --leader-elect-lease-duration=60s\n    - --leader-elect-renew-deadline=40s\n    - --leader-elect-retry-period=5s\n')
    if updated!=original:
        temporary=f'/etc/kubernetes/ataimo-{name}.tmp'
        subprocess.run(['docker','exec','-i',node,'sh','-c','cat > "$1" && mv "$1" "$2"','write',temporary,target],input=updated,text=True,check=True)
    print(name+(': original settings restored' if restore else ': local lease 60s / renewal 40s / retry 5s'))
