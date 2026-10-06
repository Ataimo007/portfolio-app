#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
kubectl wait -n ingress gateway/ataimo --for=condition=Programmed --timeout=3m
python3 - <<'PY'
import json
import subprocess
for namespace, name in [('app','portfolio'),('identity','keycloak'),('monitoring','grafana'),('streaming','redpanda-console')]:
    route=json.loads(subprocess.check_output(['kubectl','get','httproute',name,'-n',namespace,'-o','json']))
    parents=route.get('status',{}).get('parents',[])
    accepted=False
    for parent in parents:
        conditions={item['type']:item for item in parent['conditions']}
        if all(conditions.get(key,{}).get('status')=='True' and conditions[key]['observedGeneration']==route['metadata']['generation'] for key in ['Accepted','ResolvedRefs']):
            accepted=True
    if not accepted:
        raise RuntimeError(f'{name}: route not accepted/resolved')
    print(f'{name}: route accepted, references resolved')
PY
SERVICE="$(kubectl get svc -n ingress -l gateway.envoyproxy.io/owning-gateway-name=ataimo,gateway.envoyproxy.io/owning-gateway-namespace=ingress -o jsonpath='{.items[0].metadata.name}')"
kubectl exec -i -n app deployment/portfolio -- node - "$SERVICE" <<'JS'
(async () => {
  const hostname = `${process.argv[2]}.ingress.svc.cluster.local`;
  const request = (host, path = "/") => new Promise((resolve, reject) => {
    const req = require("node:http").request({ hostname, port: 80, path, headers: { Host: host } }, response => {
      let body = "";
      response.on("data", chunk => { body += chunk; if (body.length > 32768) req.destroy(new Error("Response exceeds bound")); });
      response.on("end", () => resolve({ status: response.statusCode, body }));
      response.on("error", reject);
    });
    req.setTimeout(10000, () => req.destroy(new Error("Gateway request timed out")));
    req.on("error", reject);
    req.end();
  });
  const checks = [
    ["ataimo.com", "/api/health"],
    ["keycloak.ataimo.com", "/realms/ataimo/.well-known/openid-configuration"],
    ["grafana.ataimo.com", "/api/health"],
    ["redpanda.ataimo.com", "/admin/health"],
  ];
  for (const [host, path] of checks) {
    const response = await request(host, path);
    if (response.status !== 200) throw new Error(`${host}: HTTP ${response.status}`);
    const result = JSON.parse(response.body);
    if (host.startsWith("keycloak") && result.issuer !== "http://keycloak.ataimo.com/realms/ataimo") throw new Error("Wrong issuer");
    console.log(`${host}: gateway HTTP verified`);
  }
  for (const host of ["prometheus.ataimo.com", "broker.ataimo.com", "unknown.ataimo.com"]) {
    const response = await request(host);
    if (response.status !== 404) throw new Error(`Unexpected exposed host: ${host}`);
    console.log(`${host}: no route (404)`);
  }
})().catch(error => { console.error(error.message); process.exit(1); });
JS
