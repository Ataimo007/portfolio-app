"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { type PlatformSnapshot, snapshotSchema } from "@/lib/platform-status";
const labels: Record<string, string> = {
  portfolio: "Portfolio application",
  postgres: "PostgreSQL",
  keycloak: "Keycloak identity",
  redpanda: "Redpanda events",
  grafana: "Grafana dashboards",
  prometheus: "Prometheus monitoring",
  worker: "Event and telemetry worker",
};
export default function PlatformStatus() {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [now, setNow] = useState(0),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false,
      busy = false;
    const controller = new AbortController();
    async function load() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch("/api/platform/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw Error("Live status is temporarily unavailable.");
        const value = snapshotSchema.parse(await response.json());
        if (!disposed) {
          setSnapshot(value);
          setError("");
        }
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        busy = false;
        if (!disposed) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    }
    load();
    const timer = setInterval(load, 30000);
    const visible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const stale = !!snapshot && now - Date.parse(snapshot.generatedAt) > 120000;
  return (
    <div className="page portal-page">
      <div className="portal-heading">
        <div>
          <h1>
            Behind the <em>portfolio.</em>
          </h1>
          <p>
            Measured workload readiness from{" "}
            {snapshot?.environment === "azure-k3s"
              ? "the Azure K3s cluster"
              : snapshot
                ? "the local Kind cluster"
                : "the configured cluster"}
            . This is a single-node deployment.
          </p>
        </div>
        <button className="button" onClick={() => setRefresh((x) => x + 1)}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {loading && <p role="status">Loading measured status…</p>}
      {error && (
        <p role="alert" className="portal-error">
          {error} {snapshot ? "Last successful snapshot remains below." : ""}
        </p>
      )}
      {snapshot && (
        <>
          <div className="portal-status-summary">
            <span
              className="portal-state"
              data-state={stale || error ? "unknown" : snapshot.overall}
            >
              {stale
                ? "Stale snapshot"
                : error
                  ? "Connection unavailable"
                  : snapshot.overall}
            </span>
            <p>
              Last collected{" "}
              <time dateTime={snapshot.generatedAt}>
                {new Date(snapshot.generatedAt).toLocaleString()}
              </time>
              . Updates every 30 seconds; stale after two minutes.
            </p>
          </div>
          <dl className="portal-status-list">
            {snapshot.components.map((c) => (
              <div key={c.id}>
                <dt>{labels[c.id]}</dt>
                <dd>
                  <span
                    className="portal-state"
                    data-state={stale || error ? "unknown" : c.state}
                  >
                    {stale || error ? "unknown" : c.state}
                  </span>
                  {c.ready !== undefined && (
                    <span>
                      {c.ready} / {c.desired} ready
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <section className="portal-status-definition">
        <h2>What this tells you</h2>
        <p>
          Readiness comes from Prometheus’s Kubernetes workload metrics. Healthy
          means all desired replicas are ready; degraded means some are ready;
          unavailable means none are ready. Missing, stale, or scaled-to-zero
          measurements are unknown.
        </p>
        <p>
          Readiness is not a guarantee that every application feature works.
          This view exposes no customer data, logs, internal addresses, or query
          interface. There are no simulated health readings. A single local node
          provides no high availability.
        </p>
      </section>
    </div>
  );
}
