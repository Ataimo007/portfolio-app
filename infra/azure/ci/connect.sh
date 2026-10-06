#!/usr/bin/env bash
set -euo pipefail
umask 077
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$CLOUD/scripts/trust-host.py"
if [ "$DEPLOY_ROUTE" = greenfield ]; then
  bash "$CLOUD/scripts/provision.sh"
else
  python3 - "$CLOUD" "$SSH_PRIVATE_KEY" <<'PY'
import json,sys,subprocess
from pathlib import Path
root=Path(sys.argv[1]);v={k:d['value'] for k,d in json.loads((root/'.local/outputs.json').read_text()).items()}
args=['ssh','-i',sys.argv[2],'-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(root/'.local/known_hosts'),v['admin_username']+'@'+v['public_ip'],'sudo cat /etc/rancher/k3s/k3s.yaml']
data=subprocess.check_output(args,text=True)
import yaml
config=yaml.safe_load(data)
config['clusters'][0]['cluster']['server']='https://'+v['public_ip']+':6443'
(root/'.local/kubeconfig').write_text(yaml.safe_dump(config))
node={'ansible_host':v['public_ip'],'ansible_user':v['admin_username'],'vm_fqdn':v['vm_fqdn'],'ansible_ssh_private_key_file':sys.argv[2],'ansible_ssh_common_args':'-o StrictHostKeyChecking=yes -o UserKnownHostsFile='+str(root/'.local/known_hosts')}
(root/'.local/inventory.json').write_text(json.dumps({'all':{'children':{'k3s':{'hosts':{'ataimo':node}}}}}))
PY
fi
export KUBECONFIG="$CLOUD/.local/kubeconfig"
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q .
kubectl create namespace app --dry-run=client -o yaml | kubectl apply -f -
python3 - <<'PY'
import base64,json,os,subprocess
v=base64.b64encode(json.dumps({'auths':{'https://index.docker.io/v1/':{'auth':base64.b64encode((os.environ['DOCKERHUB_USERNAME']+':'+os.environ['DOCKERHUB_TOKEN']).encode()).decode()}}}).encode()).decode()
secret={'apiVersion':'v1','kind':'Secret','metadata':{'name':'dockerhub-pull','namespace':'app'},'type':'kubernetes.io/dockerconfigjson','data':{'.dockerconfigjson':v}}
subprocess.run(['kubectl','apply','-f','-'],input=json.dumps(secret),text=True,check=True,stdout=subprocess.DEVNULL)
PY
python3 "$CLOUD/scripts/bundle.py"
ansible-playbook -i "$CLOUD/.local/inventory.json" "$CLOUD/ansible/deploy-registry.yml"
