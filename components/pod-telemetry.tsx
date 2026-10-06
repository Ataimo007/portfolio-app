"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { PodUsage } from "@/lib/platform-status";
export const cpuLabel = (value: number | null) =>
  value === null ? "Unavailable" : `${value.toFixed(1)} mCPU`;
export const memoryLabel = (value: number | null) =>
  value === null ? "Unavailable" : `${(value / 2 ** 20).toFixed(1)} MiB`;
export default function PodTelemetry({
  pods,
  detailed,
  loading,
}: {
  pods: PodUsage[] | null | undefined;
  detailed: boolean;
  loading: boolean;
}) {
  const [sort, setSort] = useState<"cpuMillicores" | "memoryBytes" | "name">(
    "cpuMillicores",
  );
  const [namespace, setNamespace] = useState("all");
  const namespaces = useMemo(
    () => [...new Set(pods?.map((pod) => pod.namespace) ?? [])].sort(),
    [pods],
  );
  const rows = useMemo(
    () =>
      (pods ?? [])
        .filter((pod) => namespace === "all" || pod.namespace === namespace)
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : (b[sort] ?? -1) - (a[sort] ?? -1) || a.name.localeCompare(b.name),
        ),
    [pods, sort, namespace],
  );
  const message = loading
    ? "Fetching pod measurements…"
    : pods == null
      ? "Pod measurements unavailable. Refresh to try again."
      : "No pods reported in the latest collection.";
  return (
    <div className="pod-telemetry">
      <div className="pod-telemetry-heading">
        <div>
          <h4>{detailed ? "Every pod, in view." : "The busiest workloads."}</h4>
          <p>
            CPU is a 5-minute average; memory is the container working set.
            1,000 mCPU = one CPU core.
          </p>
        </div>
        {!detailed && (
          <Link className="text-link" href="/platform#telemetry">
            View all pod measurements ↗
          </Link>
        )}
      </div>
      {pods == null || !pods.length ? (
        <p className="pod-empty" role="status">
          {message}
        </p>
      ) : detailed ? (
        <>
          <div className="pod-table-controls">
            <label htmlFor="pod-namespace">Namespace</label>
            <select
              id="pod-namespace"
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
            >
              <option value="all">All namespaces</option>
              {namespaces.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span>{rows.length} pods · latest collection</span>
          </div>
          <div
            className="pod-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Pod measurements. Scroll to view all rows and columns."
          >
            <table className="pod-table">
              <caption>Live pod resource usage from Prometheus</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={sort === "name" ? "ascending" : "none"}
                  >
                    <button onClick={() => setSort("name")}>
                      Pod {sort === "name" ? "↑" : "↕"}
                    </button>
                  </th>
                  <th scope="col">Namespace</th>
                  <th
                    scope="col"
                    aria-sort={sort === "cpuMillicores" ? "descending" : "none"}
                  >
                    <button onClick={() => setSort("cpuMillicores")}>
                      CPU {sort === "cpuMillicores" ? "↓" : "↕"}
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={sort === "memoryBytes" ? "descending" : "none"}
                  >
                    <button onClick={() => setSort("memoryBytes")}>
                      Memory {sort === "memoryBytes" ? "↓" : "↕"}
                    </button>
                  </th>
                  <th scope="col">Phase</th>
                  <th scope="col">Ready</th>
                  <th scope="col">Restarts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((pod) => (
                  <tr key={`${pod.namespace}/${pod.name}`}>
                    <th scope="row">{pod.name}</th>
                    <td>{pod.namespace}</td>
                    <td>{cpuLabel(pod.cpuMillicores)}</td>
                    <td>{memoryLabel(pod.memoryBytes)}</td>
                    <td>{pod.phase}</td>
                    <td>
                      {pod.ready === null
                        ? "Unavailable"
                        : pod.ready
                          ? "Yes"
                          : "No"}
                    </td>
                    <td>{pod.restarts ?? "Unavailable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p role="status">No pods in this namespace.</p>}
        </>
      ) : (
        <div className="pod-rankings">
          {(["cpuMillicores", "memoryBytes"] as const).map((metric) => {
            const ranked = pods
              .filter((pod) => pod.phase === "Running" && pod[metric] !== null)
              .sort(
                (a, b) =>
                  b[metric]! - a[metric]! || a.name.localeCompare(b.name),
              )
              .slice(0, 5);
            return (
              <section
                key={metric}
                aria-label={
                  metric === "cpuMillicores"
                    ? "Top 5 pods by CPU"
                    : "Top 5 pods by memory"
                }
              >
                <h5>
                  {metric === "cpuMillicores"
                    ? "Top 5 · CPU"
                    : "Top 5 · Memory"}
                </h5>
                {ranked.length ? (
                  <ol>
                    {ranked.map((pod) => (
                      <li key={`${pod.namespace}/${pod.name}`}>
                        <div>
                          <span className="pod-name">{pod.name}</span>
                          <span className="pod-namespace">{pod.namespace}</span>
                        </div>
                        <strong>
                          {metric === "cpuMillicores"
                            ? cpuLabel(pod.cpuMillicores)
                            : memoryLabel(pod.memoryBytes)}
                        </strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No fresh running-pod measurements available.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
