#!/usr/bin/env python3
import json,os,subprocess,pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[3]
cloud=root/'infra/azure'
kubectl=[shutil.which('kubectl') or str(cloud/'.local/bin/kubectl'),'--kubeconfig',str(cloud/'.local/kubeconfig')]
def command(args,input=None):
 return subprocess.run(kubectl+args,input=input,text=True,capture_output=True,check=True).stdout
command(['get','namespace','app'])
keyfile=cloud/'.local/workspace-push-keys.json'
if keyfile.exists(): keys=json.loads(keyfile.read_text())
else:
 existing=subprocess.run(kubectl+['get','secret','portal-integrations','-n','app','-o','json'],text=True,capture_output=True)
 if existing.returncode==0:
  import base64
  data=json.loads(existing.stdout)['data']
  keys={'publicKey':base64.b64decode(data['VAPID_PUBLIC_KEY']).decode(),'privateKey':base64.b64decode(data['VAPID_PRIVATE_KEY']).decode()}
 else:
  keys=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("web-push").generateVAPIDKeys()))'],cwd=root,text=True))
 keyfile.write_text(json.dumps(keys));os.chmod(keyfile,0o600)
mail_result=subprocess.run(kubectl+['get','secret','mailu-credentials','-n','mail','-o','json'],text=True,capture_output=True)
if mail_result.returncode and 'NotFound' not in mail_result.stderr: raise SystemExit('Mail credentials could not be inspected.')
mail=json.loads(mail_result.stdout) if mail_result.returncode==0 else None
import base64
password=base64.b64decode(mail['data']['ataimo-password']).decode() if mail else ''
secret={'apiVersion':'v1','kind':'Secret','metadata':{'name':'portal-integrations','namespace':'app'},'type':'Opaque','stringData':{'VAPID_PUBLIC_KEY':keys['publicKey'],'VAPID_PRIVATE_KEY':keys['privateKey'],'MAIL_HOST':'mail.ataimo.com','MAIL_USER':'ataimo@ataimo.com','MAIL_PASSWORD':password}}
if not mail:
 for name in ('MAIL_HOST','MAIL_USER','MAIL_PASSWORD'): secret['stringData'].pop(name)
command(['apply','-f','-'],json.dumps(secret))
print('Workspace integrations configured in app namespace. Private values remain in Kubernetes and ignored local files.')
