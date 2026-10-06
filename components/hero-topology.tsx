"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const Scene = dynamic(() => import("./topology-scene"), { ssr: false });
export default function HeroTopology({
  staticOnly = false,
}: {
  staticOnly?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (staticOnly) return;
    const media = matchMedia(
      "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
    );
    const update = () => {
      const c = document.createElement("canvas");
      setEnabled(
        media.matches &&
          navigator.hardwareConcurrency > 4 &&
          !!c.getContext("webgl2"),
      );
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [staticOnly]);
  return (
    <figure className="topology">
      <div className="topology-title">
        <span className="eyebrow">PLATFORM ARCHITECTURE / 01</span>
        <span className="online">
          <span className="status-dot" /> REQUEST FLOW
        </span>
      </div>
      <div className="topology-visual" aria-hidden="true">
        <svg className="topology-fallback" viewBox="0 0 600 480">
          <defs>
            <linearGradient id="tile" x2="0" y2="1">
              <stop stopColor="var(--color-diagram-top)" />
              <stop offset="1" stopColor="var(--color-diagram-front)" />
            </linearGradient>
            <linearGradient id="gateway" x2="1" y2="1">
              <stop stopColor="var(--color-diagram-front)" />
              <stop offset="1" stopColor="var(--color-diagram-side)" />
            </linearGradient>
            <radialGradient id="halo">
              <stop
                stopColor="var(--color-accent-secondary)"
                stopOpacity=".14"
              />
              <stop
                offset="1"
                stopColor="var(--color-accent-secondary)"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>
          <ellipse cx="310" cy="300" rx="270" ry="155" fill="url(#halo)" />
          {[
            [150, 190],
            [325, 140],
            [105, 285],
            [450, 315],
            [490, 205],
            [270, 365],
          ].map(([x, y], i) => (
            <g key={i}>
              <path
                d={`M${x} ${y} Q${x} 290 305 285`}
                fill="none"
                stroke={
                  i === 0
                    ? "var(--color-accent-warm)"
                    : "var(--color-accent-secondary)"
                }
                strokeWidth="1.6"
                opacity=".7"
              />
              <g transform={`translate(${x} ${y})`}>
                <path
                  d="M-44 0L0-24 44 0 0 25z"
                  fill="url(#tile)"
                  stroke="var(--color-accent-secondary)"
                  strokeWidth=".7"
                />
                <path
                  d="M-44 0v10L0 36 44 10V0L0 25z"
                  fill="var(--color-diagram-side)"
                />
                {i === 4 ? (
                  <g>
                    <ellipse
                      cy="-45"
                      rx="24"
                      ry="12"
                      fill="var(--color-diagram-top)"
                    />
                    {[0, 1, 2].map((n) => (
                      <g key={n} transform={`translate(0 ${n * 14})`}>
                        <path
                          d="M-24-45v13Q0-17 24-32v-13Q0-30-24-45"
                          fill="var(--color-diagram-front)"
                          stroke="var(--color-accent-secondary)"
                          strokeWidth=".7"
                        />
                      </g>
                    ))}
                  </g>
                ) : i === 0 ? (
                  <g>
                    <path
                      d="M-17-55L12-70 27-60v43L-3-2-17-12z"
                      fill="var(--color-tint-warm)"
                      stroke="var(--color-accent-warm)"
                    />
                    <rect
                      x="-5"
                      y="-43"
                      width="16"
                      height="16"
                      rx="3"
                      fill="var(--color-accent-warm)"
                    />
                    <path
                      d="M-2-43v-6a5 5 0 0110 0v6"
                      fill="none"
                      stroke="var(--color-accent-warm)"
                      strokeWidth="2"
                    />
                  </g>
                ) : (
                  <g>
                    {[0, 1, 2].map((n) => (
                      <g key={n} transform={`translate(0 ${-n * 15})`}>
                        <path
                          d="M-26-19L0-33 26-19 0-5z"
                          fill="var(--color-diagram-top)"
                        />
                        <path
                          d="M-26-19v12L0 8V-5z"
                          fill="var(--color-diagram-side)"
                        />
                        <path
                          d="M0-5L26-19v12L0 8z"
                          fill="var(--color-diagram-front)"
                        />
                        <path
                          d="M-20-13L-5-5"
                          stroke="var(--color-accent-secondary)"
                          strokeWidth="2"
                        />
                      </g>
                    ))}
                  </g>
                )}
                <text
                  y="58"
                  textAnchor="middle"
                  fill={
                    i === 0
                      ? "var(--color-accent-warm)"
                      : "var(--color-text-muted)"
                  }
                  fontSize="8"
                  letterSpacing="1"
                >
                  {
                    [
                      "IDENTITY",
                      "CLOUD",
                      "SERVICES",
                      "KUBERNETES",
                      "DATA",
                      "TELEMETRY",
                    ][i]
                  }
                </text>
              </g>
            </g>
          ))}
          <g transform="translate(305 265)">
            <path
              d="M-70 15L0-25 70 15 0 55z"
              fill="var(--color-diagram-front)"
              stroke="var(--color-accent-secondary)"
            />
            <path
              d="M-70 15v12L0 67 70 27V15L0 55z"
              fill="var(--color-diagram-side)"
            />
            <path
              d="M-46-92L10-120 55-95 0-65z"
              fill="var(--color-diagram-top)"
            />
            <path d="M-46-92V7L0 33V-65z" fill="url(#gateway)" />
            <path d="M0-65L55-95V3L0 33z" fill="var(--color-diagram-side)" />
            <path
              d="M-38-79L-7-61V12L-38-6z"
              fill="var(--color-bg-surface)"
              stroke="var(--color-accent-secondary)"
            />
            <text
              x="-25"
              y="-25"
              fill="var(--color-accent-secondary)"
              fontSize="14"
              transform="rotate(29 -25 -25)"
            >
              API
            </text>
            <path
              d="M12-39L43-56M12-21L43-38M12-3L43-20"
              stroke="var(--color-accent-secondary)"
              strokeWidth="3"
            />
          </g>
        </svg>
        {enabled && !failed && <Scene onFailure={() => setFailed(true)} />}
      </div>
      <figcaption>
        <span className="accent">API GATEWAY</span>
        <span>Connected by design.</span>
      </figcaption>
      <p className="sr-only">
        Requests enter the API Gateway, authenticate through identity and
        security, reach services running in cloud and Kubernetes, access data,
        and emit observability signals.
      </p>
    </figure>
  );
}
