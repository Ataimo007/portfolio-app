"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  infrastructure,
  infrastructureEdges,
  diagramPath,
} from "@/lib/infrastructure";
const ModelView = dynamic(() => import("./platform-model-view"), {
  ssr: false,
});
export default function PlatformDiagram({
  compact = false,
}: {
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const svg = useRef<SVGSVGElement>(null);
  const [model, setModel] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string>("app");
  const onFailure = useCallback(() => {
    setModel(false);
    setFailed(true);
  }, []);
  const node = infrastructure.find((n) => n.id === selected)!;
  useEffect(() => {
    if (compact || model || !svg.current) return;
    const root = svg.current;
    const motion = matchMedia("(prefers-reduced-motion: no-preference)");
    const paths = [...root.querySelectorAll<SVGPathElement>("[data-flow]")];
    const circles = [
      ...root.querySelectorAll<SVGCircleElement>("[data-signal]"),
    ];
    const lengths = paths.map((path) => path.getTotalLength());
    let visible = false,
      frame = 0;
    const draw = (time: number) => {
      paths.forEach((path, index) => {
        const point = path.getPointAtLength(
          ((time / 6000 + index / paths.length) % 1) * lengths[index],
        );
        circles[index].setAttribute("cx", String(point.x));
        circles[index].setAttribute("cy", String(point.y));
      });
      frame = requestAnimationFrame(draw);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const active = visible && motion.matches && !document.hidden;
      circles.forEach(
        (circle) => (circle.style.visibility = active ? "visible" : "hidden"),
      );
      if (active) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(root);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [compact, model]);
  return (
    <figure
      className={`platform-diagram${compact ? " platform-diagram-compact" : ""}`}
    >
      <div
        className="platform-diagram-scroll"
        tabIndex={compact ? undefined : 0}
        role={compact ? undefined : "region"}
        aria-label={
          compact
            ? undefined
            : "Infrastructure diagram. Scroll horizontally on a small screen to explore all components."
        }
      >
        <div className="platform-diagram-visual">
          {model && <ModelView onFailure={onFailure} />}
          <svg
            ref={svg}
            className={model ? "diagram-hidden" : undefined}
            viewBox="0 0 1600 1025"
            role="img"
            aria-labelledby={`${id}-title ${id}-desc`}
          >
            <title id={`${id}-title`}>Ataimo platform infrastructure</title>
            <desc id={`${id}-desc`}>
              GitHub source feeds Actions, Docker Hub images and Terraform,
              Ansible and Helm delivery. Greenfield provisions infrastructure;
              existing stacks receive app-only updates. Traffic progresses from
              external clients to Envoy Gateway, then a row of portfolio,
              Grafana, Keycloak, Redpanda Console and Mailu services, then
              PostgreSQL, Redpanda broker and Prometheus. These internal
              components run on one Azure VM with K3s. SMTP2GO is outside the
              VM, an external outbound port 25 workaround using TLS 587. SMTP
              and IMAP bypass HTTP ingress. Moving signals illustrate direction
              and are not live packet traces.
            </desc>
            <defs>
              <marker
                id={`${id}-arrow`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10Z" fill="var(--color-accent-primary)" />
              </marker>
              <marker
                id={`${id}-external`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0 0 10 5 0 10Z" fill="var(--color-accent-warm)" />
              </marker>
            </defs>
            <rect
              x="40"
              y="350"
              width="1205"
              height="620"
              rx="16"
              fill="var(--color-bg-subtle)"
              stroke="var(--color-border-grid)"
            />
            <text x="72" y="390" className="architecture-boundary-title">
              ONE AZURE VM
            </text>
            <text x="72" y="416" className="architecture-boundary-description">
              K3s · Helm · Docker containers
            </text>
            <text x="72" y="523" className="architecture-layer-label">
              INGRESS
            </text>
            <text x="72" y="575" className="architecture-layer-label">
              APPLICATION SERVICES
            </text>
            <text x="72" y="809" className="architecture-layer-label">
              DATA · EVENTS · METRICS
            </text>
            {infrastructureEdges.map(([from, to], index) => {
              const a = infrastructure.find((n) => n.id === from)!,
                b = infrastructure.find((n) => n.id === to)!;
              const external =
                a.layer === -1 ||
                to === "relay" ||
                (from === "client" && to === "mail");
              return (
                <g key={`${from}-${to}`}>
                  <path
                    data-flow
                    data-from={from}
                    data-to={to}
                    d={diagramPath(a, b)}
                    fill="none"
                    stroke={
                      external
                        ? "var(--color-accent-warm)"
                        : "var(--color-accent-primary)"
                    }
                    strokeWidth={
                      selected === from || selected === to ? 2 : 1.25
                    }
                    opacity={
                      selected === from || selected === to || from === "client"
                        ? 0.85
                        : 0.35
                    }
                    strokeDasharray={external ? "6 5" : undefined}
                    markerEnd={`url(#${id}-${external ? "external" : "arrow"})`}
                  />
                  <circle
                    data-signal
                    data-signal-index={index}
                    r="3.5"
                    fill={
                      external
                        ? "var(--color-accent-warm)"
                        : "var(--color-accent-primary)"
                    }
                    visibility="hidden"
                  />
                </g>
              );
            })}
            <text
              x="1214"
              y="510"
              className="architecture-protocol"
              transform="rotate(90 1214 510)"
            >
              SMTP / IMAP · direct mail access
            </text>
            {infrastructure.map((n) => {
              const [x, y] = n.diagram;
              return (
                <g
                  key={n.id}
                  transform={`translate(${x} ${y})`}
                  className="architecture-node"
                  data-selected={selected === n.id || undefined}
                  data-layer={n.layer}
                  data-component={n.id}
                >
                  <path
                    d="M-88-43 81-43 94-30 94 51-75 51-88 38Z"
                    fill="var(--color-bg-subtle)"
                    stroke="var(--color-border-grid)"
                  />
                  <rect
                    x="-88"
                    y="-54"
                    width="176"
                    height="96"
                    rx="8"
                    fill={
                      n.id === "relay"
                        ? "var(--color-bg-surface)"
                        : "var(--color-bg-surface)"
                    }
                    stroke={
                      n.id === "relay"
                        ? "var(--color-accent-warm)"
                        : "var(--color-border-glow)"
                    }
                    strokeDasharray={n.id === "relay" ? "5 4" : undefined}
                  />
                  <image
                    href={n.logo}
                    x="-33"
                    y="-43"
                    width="66"
                    height="43"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <text
                    y="23"
                    textAnchor="middle"
                    className="architecture-component-title"
                  >
                    {n.label}
                  </text>
                  {n.id === "relay" && (
                    <>
                      <text
                        y="-85"
                        textAnchor="middle"
                        className="architecture-external-title"
                      >
                        EXTERNAL WORKAROUND
                      </text>
                      <text
                        y="77"
                        textAnchor="middle"
                        className="architecture-external-detail"
                      >
                        TLS 587 · outbound port 25 blocked
                      </text>
                      <text
                        y="102"
                        textAnchor="middle"
                        className="architecture-external-detail"
                      >
                        Not hosted on the Azure VM
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            <text x="72" y="940" className="architecture-boundary-description">
              cert-manager + Let’s Encrypt · Azure DNS · single node, no high
              availability
            </text>
            <text x="72" y="190" className="architecture-boundary-description">
              GitHub → Actions → Docker Hub · fresh: Terraform + Ansible ·
              existing: app-only Helm rollout
            </text>
            <text x="72" y="1005" className="architecture-boundary-description">
              Arrows show request, database, event and metrics-query direction.
              Prometheus scrapes the cluster independently.
            </text>
          </svg>
        </div>
      </div>
      <div className="architecture-view-controls">
        <button
          className="button"
          disabled={failed}
          aria-pressed={model}
          onClick={() => setModel((v) => !v)}
        >
          {failed
            ? "3D unavailable · diagram retained"
            : model
              ? "Show labeled diagram"
              : "Explore in 3D"}
        </button>
        <span>
          {model
            ? "Drag to rotate · same layered model as the scrolling background"
            : "Client → ingress → services → data · signals illustrate flow, not live traffic"}
        </span>
      </div>
      <div
        className="architecture-selector"
        role="group"
        aria-label="Explore infrastructure components"
      >
        {infrastructure.map((n) => (
          <button
            key={n.id}
            aria-pressed={selected === n.id}
            onClick={() => setSelected(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>
      <figcaption aria-live="polite">
        <strong>{node.label}</strong>
        <span>{node.namespace}</span>
        <p>{node.detail}</p>
      </figcaption>
    </figure>
  );
}
