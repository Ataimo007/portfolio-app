import atexit
import re
import select
import base64
import json
import os
import subprocess
import urllib.request

os.environ.setdefault("KUBECONFIG", os.path.expanduser("~/.kube/ataimo-kind"))
secret = json.loads(subprocess.check_output(["kubectl", "get", "secret", "keycloak-credentials", "-n", "identity", "-o", "json"]))
password = base64.b64decode(secret["data"]["admin-password"]).decode()
base = os.environ.get("KEYCLOAK_ADMIN_URL")
if not base:
    forward = subprocess.Popen(["kubectl", "port-forward", "-n", "identity", "service/keycloak", ":8080"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    def stop_forward():
        forward.terminate()
        try:
            forward.wait(timeout=5)
        except subprocess.TimeoutExpired:
            forward.kill()
            forward.wait()
    atexit.register(stop_forward)
    if not select.select([forward.stdout], [], [], 15)[0]:
        raise RuntimeError("Keycloak maintenance forward did not start")
    match = re.search(r"127\.0\.0\.1:(\d+)", forward.stdout.readline())
    if not match:
        raise RuntimeError("Keycloak maintenance forward failed")
    base = "http://127.0.0.1:" + match.group(1)

import urllib.parse
request = urllib.request.Request(base + "/realms/master/protocol/openid-connect/token", data=urllib.parse.urlencode({"client_id": "admin-cli", "grant_type": "password", "username": "admin", "password": password}).encode())
with urllib.request.urlopen(request, timeout=15) as response:
    token = json.load(response)["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
url = base + "/admin/realms/ataimo/clients?clientId=portfolio"
with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=15) as response:
    clients = json.load(response)
if len(clients) != 1:
    raise RuntimeError("Expected one portfolio client")
client = clients[0]
site_url = os.environ.get("SITE_URL", "http://ataimo.com").rstrip("/")
if urllib.parse.urlparse(site_url).scheme not in ["http", "https"]:
    raise RuntimeError("SITE_URL requires HTTP or HTTPS")
portal = json.loads(subprocess.check_output(["kubectl", "get", "secret", "portal-credentials", "-n", "app", "-o", "json"]))
client["publicClient"] = False
client["clientAuthenticatorType"] = "client-secret"
client["secret"] = base64.b64decode(portal["data"]["KEYCLOAK_CLIENT_SECRET"]).decode()
client["directAccessGrantsEnabled"] = False
client.setdefault("attributes", {}).update({"pkce.code.challenge.method": "S256", "post.logout.redirect.uris": site_url + "/portal", "access.token.lifespan": "1800"})
mapper = {"name": "portal-realm-roles", "protocol": "openid-connect", "protocolMapper": "oidc-usermodel-realm-role-mapper", "consentRequired": False, "config": {"multivalued": "true", "claim.name": "realm_access.roles", "jsonType.label": "String", "id.token.claim": "true", "access.token.claim": "true", "userinfo.token.claim": "true"}}
client["protocolMappers"] = [m for m in client.get("protocolMappers", []) if m.get("name") != mapper["name"]] + [mapper]
client["redirectUris"] = [site_url + "/api/auth/callback/keycloak"]
client["webOrigins"] = [site_url]
url = base + f'/admin/realms/ataimo/clients/{client["id"]}'
with urllib.request.urlopen(urllib.request.Request(url, headers=headers, data=json.dumps(client).encode(), method="PUT"), timeout=15) as response:
    if response.status != 204:
        raise RuntimeError("Client update failed")
print("Existing portfolio realm client updated to gateway hostname; other realm data preserved")

realm_url = base + '/admin/realms/ataimo'
def admin_call(path='', method='GET', data=None):
    req = urllib.request.Request(realm_url + path, headers=headers, method=method, data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=15) as response:
        content = response.read()
        return json.loads(content) if content else None

realm = admin_call()
realm.update({
    'displayName': 'Ataimo Edem',
    'loginTheme': 'ataimo',
    'registrationAllowed': True,
    'loginWithEmailAllowed': True,
    'duplicateEmailsAllowed': False,
    'resetPasswordAllowed': False,
    'passwordPolicy': 'length(12) and notUsername(undefined) and notEmail(undefined)',
    'bruteForceProtected': True,
    'permanentLockout': False,
    'failureFactor': 5,
    'waitIncrementSeconds': 60,
    'maxFailureWaitSeconds': 900,
})
admin_call(method='PUT', data=realm)
client_role = admin_call('/roles/client')
default = realm['defaultRole']['id']
composites = admin_call('/roles-by-id/' + default + '/composites')
if not any(role['id'] == client_role['id'] for role in composites):
    admin_call('/roles-by-id/' + default + '/composites', 'POST', [client_role])
print('Branded registration enabled; new accounts receive client access only')

social_raw = subprocess.check_output(['kubectl', 'get', 'secret', 'social-login-credentials', '-n', 'identity', '--ignore-not-found', '-o', 'json'], text=True).strip()
if social_raw:
    values = {key: base64.b64decode(value).decode() for key, value in json.loads(social_raw).get('data', {}).items()}
    existing = {provider['alias']: provider for provider in admin_call('/identity-provider/instances')}
    for alias, provider_id, label, prefix, scopes in [
        ('google', 'google', 'Google', 'GOOGLE', 'openid profile email'),
        ('github', 'github', 'GitHub', 'GITHUB', 'read:user user:email'),
        ('linkedin', 'linkedin-openid-connect', 'LinkedIn', 'LINKEDIN', 'openid profile email'),
        ('microsoft', 'microsoft', 'Microsoft', 'MICROSOFT', 'User.Read'),
    ]:
        client_id, client_secret = values.get(prefix + '_CLIENT_ID'), values.get(prefix + '_CLIENT_SECRET')
        if not client_id and not client_secret:
            continue
        if not client_id or not client_secret:
            raise RuntimeError(label + ' requires both client ID and secret')
        provider = existing.get(alias, {})
        provider.update({'alias': alias, 'providerId': provider_id, 'displayName': label, 'enabled': True, 'trustEmail': False, 'storeToken': False, 'firstBrokerLoginFlowAlias': 'first broker login'})
        provider.setdefault('config', {}).update({'clientId': client_id, 'clientSecret': client_secret, 'defaultScope': scopes, 'syncMode': 'IMPORT'})
        if alias == 'microsoft':
            provider['config']['tenantId'] = values.get('MICROSOFT_TENANT_ID', 'common')
        path = '/identity-provider/instances' + ('/' + alias if alias in existing else '')
        admin_call(path, 'PUT' if alias in existing else 'POST', provider)
        print(label + ' social provider synchronized')
else:
    print('Social OAuth credentials not configured; unavailable providers stay disabled')
