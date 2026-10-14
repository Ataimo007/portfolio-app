#!/usr/bin/env python3
import base64,json,os,secrets,subprocess
k=['kubectl']
def read(name,namespace):
 r=subprocess.run(k+['get','secret',name,'-n',namespace,'--ignore-not-found','-o','json'],capture_output=True,text=True,check=True)
 return json.loads(r.stdout)['data'] if r.stdout.strip() else {}
def apply(name,namespace,data):
 subprocess.run(k+['apply','-f','-'],input=json.dumps({'apiVersion':'v1','kind':'Secret','metadata':{'name':name,'namespace':namespace},'type':'Opaque','data':data}),text=True,check=True,stdout=subprocess.DEVNULL)
integrations=read('portal-integrations','app');portal=read('portal-credentials','app')
if not all(key in integrations for key in ('MAIL_HOST','MAIL_USER','MAIL_PASSWORD')):raise SystemExit('Mail configuration is required before enabling protected registration.')
if 'ABUSE_HMAC_KEY' not in integrations:
 integrations['ABUSE_HMAC_KEY']=base64.b64encode(secrets.token_hex(32).encode()).decode()
 apply('portal-integrations','app',integrations)
existing=read('identity-mail-guard','identity')
password=base64.b64decode(existing['PGPASSWORD']).decode() if 'PGPASSWORD' in existing else secrets.token_hex(32)
role='identity_mail_guard'
sql=f"""DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='{role}') THEN CREATE ROLE {role} LOGIN; END IF; END $$;
ALTER ROLE {role} WITH PASSWORD '{password}';
GRANT CONNECT ON DATABASE portfolio TO {role};
GRANT USAGE ON SCHEMA public TO {role};
GRANT SELECT,INSERT,UPDATE ON api_rate_limits TO {role};
GRANT SELECT ON identity_mail_suppressions TO {role};
GRANT INSERT ON identity_mail_audit TO {role};
GRANT USAGE ON SEQUENCE identity_mail_audit_id_seq TO {role};
"""
subprocess.run(k+['exec','-i','-n','database','postgres-0','--','psql','-U','ataimo','-d','portfolio','-v','ON_ERROR_STOP=1'],input=sql,text=True,check=True,stdout=subprocess.DEVNULL)
values={key:value for key,value in portal.items() if key in ('PGHOST','PGPORT','PGDATABASE')}
values.update({key:integrations[key] for key in ('MAIL_HOST','MAIL_USER','MAIL_PASSWORD','ABUSE_HMAC_KEY')})
values['PGUSER']=base64.b64encode(role.encode()).decode();values['PGPASSWORD']=base64.b64encode(password.encode()).decode()
for name,default in [('IDENTITY_MAIL_GLOBAL_HOURLY','20'),('IDENTITY_MAIL_RECIPIENT_HOURLY','3'),('IDENTITY_MAIL_COOLDOWN_SECONDS','60')]:
 values[name]=existing.get(name,base64.b64encode(os.environ.get(name,default).encode()).decode())
 integrations[name]=values[name]
apply('portal-integrations','app',integrations)
apply('identity-mail-guard','identity',values)
pull=read('dockerhub-pull','app')
if pull:
 payload={'apiVersion':'v1','kind':'Secret','metadata':{'name':'dockerhub-pull','namespace':'identity'},'type':'kubernetes.io/dockerconfigjson','data':pull}
 subprocess.run(k+['apply','-f','-'],input=json.dumps(payload),text=True,check=True,stdout=subprocess.DEVNULL)
imports=read('identity-mail-suppression-import','identity')
if 'recipients' in imports:
 entries=json.loads(base64.b64decode(imports['recipients']))
 import re
 statements=[]
 for item in entries:
  if not re.fullmatch('[0-9a-f]{64}',item['hash']) or item['reason'] not in ('spam-complaint','permanent-bounce'):
   raise SystemExit('Invalid suppression import; refusing to modify suppression records.')
  statements.append("INSERT INTO identity_mail_suppressions(email_hash,reason) VALUES('%s','%s') ON CONFLICT(email_hash) DO NOTHING;" % (item['hash'],item['reason']))
 if statements:
  subprocess.run(k+['exec','-i','-n','database','postgres-0','--','psql','-U','ataimo','-d','portfolio','-v','ON_ERROR_STOP=1'],input='BEGIN;\n'+'\n'.join(statements)+'\nCOMMIT;',text=True,check=True,stdout=subprocess.DEVNULL)
print('Protected registration credentials configured; dedicated mail-guard database role has only counter, suppression and mail-audit access.')
