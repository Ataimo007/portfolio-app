export const infrastructure = [
  {
    id: "client",
    label: "Client",
    namespace: "outside the VM",
    detail: "Browser and mail clients · HTTPS, IMAP and SMTP submission",
    position: [0, 0, -8],
    diagram: [620, 80],
    layer: 0,
    logo: "/brand/infrastructure/client.svg",
    tone: "primary",
  },
  {
    id: "gateway",
    label: "Envoy Gateway",
    namespace: "ingress",
    detail:
      "Gateway API · HTTPS routing for the portfolio, identity, Grafana, Redpanda Console and webmail",
    position: [0, 0, -4],
    diagram: [620, 235],
    layer: 1,
    logo: "/brand/infrastructure/envoy.svg",
    tone: "primary",
  },
  {
    id: "app",
    label: "Portfolio + worker",
    namespace: "app",
    detail:
      "Next.js · consultation approvals · private chat · transactional outbox",
    position: [-7, 0, 0],
    diagram: [170, 440],
    layer: 2,
    logo: "/brand/ataimo-app-logo.svg",
    tone: "primary",
  },
  {
    id: "grafana",
    label: "Grafana",
    namespace: "monitoring",
    detail:
      "Operational dashboards · queries Prometheus · dedicated PostgreSQL database",
    position: [-3.5, 0, 0],
    diagram: [395, 440],
    layer: 2,
    logo: "/brand/infrastructure/grafana.svg",
    tone: "secondary",
  },
  {
    id: "identity",
    label: "Keycloak",
    namespace: "identity",
    detail: "Native accounts · Google · GitHub · LinkedIn · Microsoft",
    position: [0, 0, 0],
    diagram: [620, 440],
    layer: 2,
    logo: "/brand/infrastructure/keycloak.svg",
    tone: "warm",
  },
  {
    id: "console",
    label: "Redpanda Console",
    namespace: "streaming",
    detail:
      "HTTPS management console · connects to the private Redpanda broker",
    position: [3.5, 0, 0],
    diagram: [845, 440],
    layer: 2,
    logo: "/brand/infrastructure/redpanda.svg",
    tone: "warm",
  },
  {
    id: "mail",
    label: "Mailu + webmail",
    namespace: "mail",
    detail: "Inbound SMTP 25 · IMAP 993 · submission 465 / 587 · Roundcube",
    position: [7, 0, 0],
    diagram: [1070, 440],
    layer: 2,
    logo: "/brand/infrastructure/mailu.svg",
    tone: "primary",
  },
  {
    id: "database",
    label: "PostgreSQL",
    namespace: "database",
    detail:
      "Dedicated databases and roles for portfolio, Keycloak, Grafana, Mailu and Roundcube",
    position: [-4.5, 0, 5],
    diagram: [335, 685],
    layer: 3,
    logo: "/brand/infrastructure/postgres.png",
    tone: "secondary",
  },
  {
    id: "events",
    label: "Redpanda broker",
    namespace: "streaming",
    detail:
      "Private Kafka-compatible message broker · durable events · retries",
    position: [0, 0, 5],
    diagram: [665, 685],
    layer: 3,
    logo: "/brand/infrastructure/redpanda.svg",
    tone: "warm",
  },
  {
    id: "prometheus",
    label: "Prometheus",
    namespace: "monitoring",
    detail:
      "Scrapes cluster metrics independently · supplies Grafana and sanitized public telemetry",
    position: [4.5, 0, 5],
    diagram: [995, 685],
    layer: 3,
    logo: "/brand/infrastructure/prometheus.svg",
    tone: "secondary",
  },
  {
    id: "relay",
    label: "SMTP2GO",
    namespace: "external workaround · outside the VM",
    detail:
      "Outbound mail relay over TLS 587 · external workaround for Azure’s outbound port 25 restriction",
    position: [11, 0, 5],
    diagram: [1420, 685],
    layer: 3,
    logo: "/brand/infrastructure/smtp2go.svg",
    tone: "warm",
  },
] as const;
export type InfrastructureNode = (typeof infrastructure)[number];
export const infrastructureEdges = [
  ["client", "gateway"],
  ["client", "mail"],
  ["gateway", "app"],
  ["gateway", "grafana"],
  ["gateway", "identity"],
  ["gateway", "console"],
  ["gateway", "mail"],
  ["app", "database"],
  ["identity", "database"],
  ["grafana", "database"],
  ["mail", "database"],
  ["app", "events"],
  ["console", "events"],
  ["grafana", "prometheus"],
  ["mail", "relay"],
] as const;
export function diagramPath(from: InfrastructureNode, to: InfrastructureNode) {
  const [x, y] = from.diagram,
    [tx, ty] = to.diagram;
  if (from.id === "client" && to.id === "mail")
    return `M${x + 90} ${y} H1200 V${ty} H${tx + 94}`;
  const start = y + 54,
    end = ty - 54;
  const lane =
    from.id === "gateway"
      ? 335
      : 555 +
        infrastructureEdges.findIndex(
          ([a, b]) => a === from.id && b === to.id,
        ) *
          4;
  return `M${x} ${start} V${Math.min(lane, (start + end) / 2)} H${tx} V${end}`;
}
export const publicRoutes = [
  ["ataimo.com", "Portfolio · HTTPS"],
  ["keycloak.ataimo.com", "Identity · HTTPS"],
  ["grafana.ataimo.com", "Dashboards · HTTPS"],
  ["redpanda.ataimo.com", "Console · HTTPS"],
  ["webmail.ataimo.com", "Webmail · HTTPS through Envoy"],
  ["mail.ataimo.com", "Mail · SMTP / IMAP directly"],
] as const;
