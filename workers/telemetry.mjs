export const podExpressions = [
  "max by(namespace,pod,phase) (kube_pod_status_phase and (time() - timestamp(kube_pod_status_phase) < 120)) == 1",
  '1000 * sum by(namespace,pod) (max by(namespace,pod,container) (rate(container_cpu_usage_seconds_total{container!="",container!="POD",pod!=""}[5m]) and (time() - timestamp(container_cpu_usage_seconds_total{container!="",container!="POD",pod!=""}) < 120)))',
  'sum by(namespace,pod) (max by(namespace,pod,container) (container_memory_working_set_bytes{container!="",container!="POD",pod!=""} and (time() - timestamp(container_memory_working_set_bytes{container!="",container!="POD",pod!=""}) < 120)))',
  'min by(namespace,pod) (kube_pod_status_ready{condition="true"} and (time() - timestamp(kube_pod_status_ready{condition="true"}) < 120))',
  "sum by(namespace,pod) (max by(namespace,pod,container) (kube_pod_container_status_restarts_total and (time() - timestamp(kube_pod_container_status_restarts_total) < 120)))",
];
const validName = /^[a-z0-9][a-z0-9.-]{0,252}$/;
const phases = new Set([
  "Pending",
  "Running",
  "Succeeded",
  "Failed",
  "Unknown",
]);
function samples(result, now) {
  const map = new Map();
  if (result.status !== "fulfilled") return map;
  for (const sample of result.value) {
    const { namespace, pod } = sample.metric;
    const value = Number(sample.value?.[1]);
    if (
      typeof namespace !== "string" ||
      typeof pod !== "string" ||
      !validName.test(namespace) ||
      !validName.test(pod) ||
      !Number.isFinite(value) ||
      value < 0 ||
      !Number.isFinite(sample.value?.[0]) ||
      now / 1000 - sample.value[0] > 120
    )
      continue;
    map.set(`${namespace}/${pod}`, {
      value,
      namespace,
      name: pod,
      phase: sample.metric.phase,
    });
  }
  return map;
}
export async function collectPods(query, now = Date.now()) {
  const results = await Promise.allSettled(podExpressions.map(query));
  if (results[0].status !== "fulfilled") return null;
  const [inventory, cpu, memory, ready, restarts] = results.map((result) =>
    samples(result, now),
  );
  return [...inventory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 500)
    .map(([key, pod]) => ({
      name: pod.name,
      namespace: pod.namespace,
      phase: phases.has(pod.phase) ? pod.phase : "Unknown",
      cpuMillicores: cpu.get(key)?.value ?? null,
      memoryBytes: memory.get(key)?.value ?? null,
      ready: ready.has(key) ? ready.get(key).value === 1 : null,
      restarts:
        restarts.has(key) && Number.isInteger(restarts.get(key).value)
          ? restarts.get(key).value
          : null,
    }));
}
