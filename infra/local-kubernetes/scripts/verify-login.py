import base64
import json
import os
import subprocess
import urllib.request

os.environ.setdefault("KUBECONFIG", os.path.expanduser("~/.kube/ataimo-kind"))
secret = json.loads(subprocess.check_output(["kubectl", "get", "secret", "grafana-credentials", "-n", "monitoring", "-o", "json"]))
password = base64.b64decode(secret["data"]["password"]).decode()
request = urllib.request.Request("http://grafana.ataimo.com/api/user", headers={"Authorization": "Basic " + base64.b64encode(f"admin:{password}".encode()).decode()})
with urllib.request.urlopen(request, timeout=15) as response:
    user = json.load(response)
if user.get("login") != "admin" or not user.get("isGrafanaAdmin"):
    raise RuntimeError("Grafana administrator authentication failed")
print("Grafana admin credentials verified through Envoy; password not displayed")
for path in [
    "/api/search?type=dash-db",
    "/apis/dashboard.grafana.app/v0alpha1/namespaces/default/dashboards",
    "/apis/quotas.grafana.app/v0alpha1/namespaces/default/usage?group=dashboard.grafana.app&resource=dashboards",
    "/apis/provisioning.grafana.app/v0alpha1/namespaces/default/settings",
]:
    request = urllib.request.Request("http://grafana.ataimo.com" + path, headers={"Authorization": "Basic " + base64.b64encode(f"admin:{password}".encode()).decode()})
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.load(response)
    if path.startswith("/api/search") and not result:
        raise RuntimeError("Grafana dashboard search returned no provisioned dashboards")
    print(f"Grafana authenticated API verified: {path}")
