import base64
import json
from pathlib import Path
import secrets
import subprocess

chart = str(Path(__file__).resolve().parents[1] / "charts" / "credentials")

def existing(namespace, name):
    result = subprocess.run(
        ["kubectl", "get", "secret", name, "-n", namespace, "-o", "json"],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        return {
            key: base64.b64decode(value).decode()
            for key, value in json.loads(result.stdout)["data"].items()
        }
    if "NotFound" not in result.stderr:
        raise RuntimeError(f"Cannot read credentials in {namespace}")
    return None

postgres = existing("database", "postgres-credentials") or {"password": secrets.token_urlsafe(36)}
postgres.setdefault("keycloak-password", secrets.token_urlsafe(36))
postgres.setdefault("portal-password", secrets.token_urlsafe(36))
postgres.setdefault("grafana-password", secrets.token_urlsafe(36))
identity = existing("identity", "keycloak-credentials") or {
    "database-password": postgres["password"],
    "admin-password": secrets.token_urlsafe(36),
}
identity["database-password"] = postgres["keycloak-password"]
grafana = existing("monitoring", "grafana-credentials") or {
    "username": "admin", "password": secrets.token_urlsafe(36),
}
grafana["database-password"] = postgres["grafana-password"]
portal = existing("app", "portal-credentials") or {}
portal.update({"PGHOST": "postgres.database.svc.cluster.local", "PGDATABASE": "portfolio", "PGUSER": "portal", "PGPASSWORD": postgres["portal-password"]})
portal.setdefault("SESSION_SECRET", secrets.token_urlsafe(48))
portal.setdefault("KEYCLOAK_CLIENT_SECRET", secrets.token_urlsafe(36))
for namespace, name, values in [
    ("database", "postgres-credentials", postgres),
    ("identity", "keycloak-credentials", identity),
    ("monitoring", "grafana-credentials", grafana),
    ("app", "portal-credentials", portal),
]:
    subprocess.run(
        ["helm", "upgrade", "--install", "credentials", chart, "-n", namespace,
         "--take-ownership", "-f", "-"],
        input=json.dumps({"secrets": {name: values}}), text=True, check=True,
    )
