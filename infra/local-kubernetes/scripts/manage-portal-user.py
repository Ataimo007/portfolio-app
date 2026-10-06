import argparse
import base64
import getpass
import json
import os
import subprocess
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser(description="Invite or grant portal access in the ataimo realm; credentials never printed")
parser.add_argument("--context", choices=["kind-portfolio", "ataimo-azure"], default="kind-portfolio")
parser.add_argument("username")
parser.add_argument("--role", choices=["owner", "client", "demo-viewer"], required=True)
parser.add_argument("--create", action="store_true")
parser.add_argument("--email", default="")
args = parser.parse_args()
os.environ.setdefault("KUBECONFIG", os.path.expanduser("~/.kube/ataimo-kind"))
context = subprocess.check_output(["kubectl", "config", "current-context"], text=True).strip()
if context != args.context:
    raise SystemExit("Current Kubernetes context does not match --context")
site_url = "https://ataimo.com" if context == "ataimo-azure" else "http://ataimo.com"
secret = json.loads(subprocess.check_output(["kubectl", "get", "secret", "keycloak-credentials", "-n", "identity", "-o", "json"]))
password = base64.b64decode(secret["data"]["admin-password"]).decode()
base = os.environ.get("KEYCLOAK_ADMIN_URL", "https://keycloak.ataimo.com" if context == "ataimo-azure" else "http://keycloak.ataimo.com")
request = urllib.request.Request(base + "/realms/master/protocol/openid-connect/token", data=urllib.parse.urlencode({"client_id": "admin-cli", "grant_type": "password", "username": "admin", "password": password}).encode())
with urllib.request.urlopen(request, timeout=15) as response:
    token = json.load(response)["access_token"]

def call(path, method="GET", data=None):
    request = urllib.request.Request(base + "/admin/realms/ataimo" + path, method=method, headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(request, timeout=15) as response:
        content = response.read()
        return json.loads(content) if content else None

users = call("/users?" + urllib.parse.urlencode({"username": args.username, "exact": "true"}))
if not users:
    if not args.create:
        raise SystemExit("No matching ataimo-realm user. Use --create to invite one.")
    initial = getpass.getpass("Temporary password (not displayed): ")
    if len(initial) < 12:
        raise SystemExit("Use a temporary password of at least 12 characters.")
    call("/users", "POST", {"username": args.username, "email": args.email, "enabled": True, "requiredActions": ["UPDATE_PASSWORD"], "credentials": [{"type": "password", "value": initial, "temporary": True}]})
    users = call("/users?" + urllib.parse.urlencode({"username": args.username, "exact": "true"}))
if len(users) != 1:
    raise SystemExit("Expected exactly one matching user.")
user = users[0]
role = call("/roles/" + args.role)
call("/users/" + user["id"] + "/role-mappings/realm", "POST", [role])
if args.role == "owner":
    if not any(credential["type"] == "otp" for credential in call("/users/" + user["id"] + "/credentials")):
        user["requiredActions"] = list(set(user.get("requiredActions", []) + ["CONFIGURE_TOTP"]))
        call("/users/" + user["id"], "PUT", user)
print(f"Portal role assigned. Sign in again at {site_url}/portal. Owner login requires OTP setup.")
