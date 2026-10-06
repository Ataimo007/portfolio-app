"use client";
import { useEffect, useState } from "react";
import PodTelemetry from "./pod-telemetry";
import { RefreshCw } from "lucide-react";
import { snapshotSchema, type PlatformSnapshot } from "@/lib/platform-status";

export default function PlatformTelemetry({
  detailed = false,
}: {
  detailed?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch("/api/platform/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const data = snapshotSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setSnapshot(data);
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        busy = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    };
    void load();
    const timer = setInterval(() => {
      setNow(Date.now());
      void load();
    }, 30000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const stale = !!snapshot && now - Date.parse(snapshot.generatedAt) > 120000;
  const data = !stale && !error ? snapshot?.telemetry : undefined;
  const percent = (value: number | null | undefined) =>
    value == null ? "Unavailable" : `${value.toFixed(1)}%`;
  const available =
    !!data &&
    Object.entries(data).some(
      ([key, value]) =>
        key !== "source" && key !== "pods" && typeof value === "number",
    );
  const metrics = [
    [
      "CPU utilization",
      percent(data?.cpuPercent),
      "Node usage · 5-minute average",
    ],
    [
      "Memory utilization",
      percent(data?.memoryPercent),
      data?.memoryUsedBytes != null && data.memoryTotalBytes != null
        ? `${(data.memoryUsedBytes / 2 ** 30).toFixed(1)} / ${(data.memoryTotalBytes / 2 ** 30).toFixed(1)} GiB · node memory`
        : "Used / total node memory",
    ],
    [
      "Running pods",
      data?.podsRunning == null ? "Unavailable" : String(data.podsRunning),
      "Across the Kubernetes cluster",
    ],
    [
      "Node uptime",
      data?.uptimeSeconds == null
        ? "Unavailable"
        : `${Math.floor(data.uptimeSeconds / 86400)}d ${Math.floor(data.uptimeSeconds / 3600) % 24}h`,
      "Time since the last node boot",
    ],
  ];
  return (
    <section
      className="platform-telemetry"
      id="telemetry"
      aria-labelledby="telemetry-title"
      aria-busy={loading}
    >
      <div className="platform-telemetry-heading">
        <div>
          <h3 id="telemetry-title">A window into the running system.</h3>
          <p>Public infrastructure measurements, collected from Prometheus.</p>
        </div>
        <button
          className="button"
          onClick={() => {
            setLoading(true);
            setRefresh((v) => v + 1);
          }}
          disabled={loading}
          aria-label="Refresh infrastructure telemetry"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <p className="telemetry-source" role="status">
        <span
          className="telemetry-indicator"
          data-live={available || undefined}
        />
        {loading
          ? "Fetching measurements…"
          : error
            ? "Connection unavailable · retry to reconnect"
            : stale
              ? "Stale measurements · awaiting a fresh collection"
              : available
                ? "Live data · Prometheus"
                : "Resource measurements unavailable"}
      </p>
      {detailed && (
        <h4 className="node-telemetry-title">
          {snapshot?.environment === "azure-k3s"
            ? "Azure VM"
            : snapshot?.environment === "local-kind"
              ? "Kind cluster"
              : "Cluster"}{" "}
          · overall node resources
        </h4>
      )}
      <dl className="telemetry-metrics">
        {metrics.map(([label, value, description]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
            <p>{description}</p>
          </div>
        ))}
      </dl>
      <p className="telemetry-note">
        {snapshot && (
          <>
            Collected{" "}
            <time dateTime={snapshot.generatedAt}>
              {new Date(snapshot.generatedAt).toLocaleString()}
            </time>{" "}
            ·{" "}
            {snapshot.environment === "azure-k3s"
              ? "Azure / K3s"
              : "Local / Kind"}
            .{" "}
          </>
        )}
        Refreshes every 30 seconds; readings expire after two minutes.
        Infrastructure resource measurements only. Single node, no high
        availability.
      </p>
      <PodTelemetry pods={data?.pods} detailed={detailed} loading={loading} />
    </section>
  );
}
