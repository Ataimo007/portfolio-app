export const infrastructure = [
  {
    id: "repository",
    label: "GitHub repository",
    namespace: "delivery · outside the VM",
    detail:
      "Ataimo007/portfolio-app · application source, Terraform, Ansible and Helm assets",
    position: [-7, 0, -13],
    diagram: [170, 80],
    layer: -1,
    logo: "/brand/infrastructure/github.svg",
    tone: "secondary",
  },
  {
    id: "actions",
    label: "GitHub Actions",
    namespace: "delivery · outside the VM",
    detail:
      "Quality gates · builds app and worker images · Azure OIDC · automatic app-only updates",
    position: [-3.5, 0, -13],
    diagram: [395, 80],
    layer: -1,
    logo: "/brand/infrastructure/githubactions.svg",
    tone: "secondary",
  },
  {
    id: "registry",
    label: "Docker Hub",
    namespace: "delivery · outside the VM",
    detail:
      "Published app and worker images · Kubernetes pulls immutable SHA-256 digests",
    position: [0, 0, -13],
    diagram: [620, 80],
    layer: -1,
    logo: "/brand/infrastructure/docker.svg",
    tone: "secondary",
  },
  {
    id: "terraform",
    label: "Terraform",
    namespace: "delivery · outside the VM",
    detail:
      "Greenfield only · Azure VM, network and managed identity · remote state in Azure Storage",
    position: [3.5, 0, -13],
    diagram: [845, 80],
    layer: -1,
    logo: "/brand/infrastructure/terraform.svg",
    tone: "secondary",
  },
  {
    id: "ansible",
    label: "Ansible",
    namespace: "delivery · outside the VM",
    detail:
      "Greenfield provisions K3s without Traefik · every delivery orchestrates remote deployment",
    position: [7, 0, -13],
    diagram: [1070, 80],
    layer: -1,
    logo: "/brand/infrastructure/ansible.svg",
    tone: "secondary",
  },
  {
    id: "helm",
    label: "Helm + kubectl",
    namespace: "delivery · outside the VM",
    detail:
      "Greenfield installs dependencies · brownfield upgrades app and worker only · readiness checks",
    position: [11, 0, -7],
    diagram: [1420, 270],
    layer: -1,
    logo: "/brand/infrastructure/helm.svg",
    tone: "secondary",
  },

  {
    id: "client",
    label: "Client",
    namespace: "outside the VM",
    detail: "Browser and mail clients · HTTPS, IMAP and SMTP submission",
    position: [0, 0, -8],
    diagram: [620, 270],
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
    diagram: [620, 425],
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
    diagram: [170, 630],
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
    diagram: [395, 630],
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
    diagram: [620, 630],
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
    diagram: [845, 630],
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
    diagram: [1070, 630],
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
    diagram: [335, 875],
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
    diagram: [665, 875],
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
    diagram: [995, 875],
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
    diagram: [1420, 875],
    layer: 3,
    logo: "/brand/infrastructure/smtp2go.svg",
    tone: "warm",
  },
] as const;
export type InfrastructureNode = (typeof infrastructure)[number];
export const infrastructureEdges = [
  ["repository", "actions"],
  ["actions", "registry"],
  ["actions", "terraform"],
  ["terraform", "ansible"],
  ["ansible", "helm"],
  ["registry", "helm"],
  ["helm", "app"],
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
  if (from.layer === -1) {
    if (y === ty && tx - x < 230) return `M${x + 94} ${y} H${tx - 88}`;
    if (y === ty) return `M${x} ${y + 54} V160 H${tx} V${ty + 54}`;
    if (to.layer === -1) return `M${x} ${y + 54} V170 H${tx} V${ty - 54}`;
    return `M${x} ${y + 54} V${ty - 110} H${tx} V${ty - 54}`;
  }
  if (from.id === "client" && to.id === "mail")
    return `M${x + 90} ${y} H1200 V${ty} H${tx + 94}`;
  const start = y + 54,
    end = ty - 54;
  const lane =
    from.id === "gateway"
      ? 525
      : 745 +
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
